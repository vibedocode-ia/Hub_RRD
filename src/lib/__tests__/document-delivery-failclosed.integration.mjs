import { build } from 'esbuild'
import { createRequire } from 'node:module'
import { mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { resolve } from 'node:path'
import assert from 'node:assert/strict'
import { randomUUID, createHash } from 'node:crypto'
assert.equal(process.env.RRD_ISSUER_DISPOSABLE_DB, '1')
assert.match(process.env.DATABASE_URL || '', /^postgres(?:ql)?:\/\/[^@]+@(?:localhost|127\.0\.0\.1):55432\/rrd_issuer_test$/)
const out = resolve('.delivery-failclosed-test')
mkdirSync(out, { recursive: true })
writeFileSync(out + '/session.ts', 'let actor = null; export const setActor = value => { actor = value }; export const getSessionUser = async () => actor')
writeFileSync(out + '/entry.ts', `export { POST } from '../src/app/api/documents/[id]/delivery/route'; export { setActor } from './session'; export * from '../src/db'`)
await build({ entryPoints: [out + '/entry.ts'], outfile: out + '/entry.cjs', bundle: true, platform: 'node', format: 'cjs', packages: 'external', plugins: [{ name: 'session-only', setup(b) { b.onResolve({ filter: /^@\/lib\/auth$/ }, () => ({ path: out + '/session.ts' })) } }] })
const { POST, setActor, db, conn, users, userPermissions, officialDocuments, attachments, auditEvents, leads } = createRequire(import.meta.url)(out + '/entry.cjs')
const { eq } = await import('drizzle-orm')
const actor = randomUUID(), id = randomUUID(), lead = randomUUID()
const call = () => POST(new Request('http://localhost/api/documents/' + id + '/delivery', { method: 'POST' }), { params: Promise.resolve({ id }) })
try {
  await db.insert(users).values({ id: actor, name: 'Delivery Test', phone: '5500000099966', passwordHash: 'test-only', role: 'ADMIN' })
  await db.insert(leads).values({ id: lead, name: 'Delivery Test', phone: '5500000099967', normalizedPhone: '5500000099967' })
  await db.insert(officialDocuments).values({ id, leadId: lead, docType: 'ORCAMENTO', docNumber: 'FAILCLOSED-' + id, totalValue: '100', status: 'EMITIDO', issuedAt: new Date(), pdfStoragePath: '/test-pdf', documentPayloadSnapshot: {}, createdById: actor })
  const bytes = Buffer.from('%PDF-valid-hash-not-delivery')
  await db.insert(attachments).values({ documentId: id, fileType: 'OFFICIAL_DOCUMENT_PDF', mimeType: 'application/pdf', storagePath: '/test-pdf', metadata: { base64: bytes.toString('base64'), sha256: createHash('sha256').update(bytes).digest('hex') } })
  setActor(null); assert.equal((await call()).status, 403)
  setActor({ id: actor }); assert.equal((await call()).status, 403, 'ADMIN without documents.send must remain forbidden')
  await db.insert(userPermissions).values({ userId: actor, permissionKey: 'documents.send' })
  const before = await db.select().from(officialDocuments).where(eq(officialDocuments.id, id))
  const attachmentsBefore = await db.select().from(attachments).where(eq(attachments.documentId, id))
  const response = await call()
  // Read back even on a regression so a fake success cannot go unobserved.
  const after = await db.select().from(officialDocuments).where(eq(officialDocuments.id, id))
  const audits = await db.select().from(auditEvents).where(eq(auditEvents.targetId, id))
  assert.equal(response.status, 503, 'PDF hash is not transport evidence')
  const body = await response.json()
  assert.equal(body.code, 'DOCUMENT_TRANSPORT_NOT_CONFIGURED')
  assert.match(body.error, /transporte.*não configurado/i)
  assert.equal(body.success, undefined)
  assert.deepEqual(after, before, 'delivery must not mutate document/status/sentAt/updatedAt')
  assert.deepEqual(await db.select().from(attachments).where(eq(attachments.documentId, id)), attachmentsBefore)
  assert.equal(audits.length, 0, 'no fake delivery ACK or audit')
  console.log('PASS delivery: documents.send enforced; valid hashed PDF still 503; exact DB document/attachment unchanged; zero audit/ACK')
} finally {
  await db.delete(auditEvents).where(eq(auditEvents.targetId, id)); await db.delete(attachments).where(eq(attachments.documentId, id)); await db.delete(officialDocuments).where(eq(officialDocuments.id, id)); await db.delete(leads).where(eq(leads.id, lead)); await db.delete(userPermissions).where(eq(userPermissions.userId, actor)); await db.delete(users).where(eq(users.id, actor)); await conn.end(); rmSync(out, { recursive: true, force: true })
}
