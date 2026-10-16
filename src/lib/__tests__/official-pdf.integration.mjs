import { build } from 'esbuild'
import { createRequire } from 'node:module'
import { mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { resolve } from 'node:path'
import assert from 'node:assert/strict'
import { randomUUID, createHash } from 'node:crypto'
assert.equal(process.env.RRD_ISSUER_DISPOSABLE_DB, '1')
assert.match(process.env.DATABASE_URL || '', /^postgres(?:ql)?:\/\/[^@]+@(?:localhost|127\.0\.0\.1):55432\/rrd_issuer_test$/)
const out = resolve(process.env.PDF_PROOF_BUNDLE_DIR || '.pdf-proof')
mkdirSync(out, { recursive: true })
writeFileSync(out + '/session.ts', 'let actor = null; export const setActor = value => { actor = value }; export const getSessionUser = async () => actor')
writeFileSync(out + '/entry.ts', `export { POST, GET } from '${resolve('src/app/api/documents/[id]/pdf/route.ts')}'; export { setActor } from './session'; export * from '${resolve('src/db/index.ts')}'`)
await build({ entryPoints: [out + '/entry.ts'], outfile: out + '/entry.cjs', bundle: true, platform: 'node', format: 'cjs', packages: 'external', define: { 'import.meta.url': JSON.stringify(new URL('../stored-document-template.ts', import.meta.url).href) }, plugins: [{ name: 'session-only', setup(b) { b.onResolve({ filter: /^@\/lib\/auth$/ }, () => ({ path: out + '/session.ts' })) } }] })
const require = createRequire(import.meta.url)
const { POST, GET, setActor, db, conn, users, userPermissions, leads, officialDocuments, documentTemplates, attachments, auditEvents } = require(out + '/entry.cjs')
const { renderStoredDocumentTemplate } = await import('../stored-document-template.ts')
const { eq, and } = await import('drizzle-orm')
const hash = value => createHash('sha256').update(value).digest('hex')
const actor = randomUUID(), lead = randomUUID(), doc = randomUUID(), template = randomUUID()
const ids = [doc]
const call = (method = 'POST', id = doc, body) => (method === 'POST' ? POST : GET)(new Request('http://localhost/api/documents/' + id + '/pdf', { method, ...(body ? { body: JSON.stringify(body) } : {}) }), { params: Promise.resolve({ id }) })
try {
  await db.insert(users).values({ id: actor, name: 'PDF Proof', phone: '5500000099977', passwordHash: 'test-only', role: 'ADMIN' })
  await db.insert(userPermissions).values(['documents.issue', 'documents.read'].map(permissionKey => ({ userId: actor, permissionKey })))
  await db.insert(leads).values({ id: lead, name: 'PDF Proof', phone: '5500000099978', normalizedPhone: '5500000099978' })
  // Actual registered canonical PDF base, kept byte-for-byte. Rasterizer and overlays are not replaced.
  const { readFileSync } = await import('node:fs')
  const source = readFileSync('public/documents/templates/rr-orcamento-tecnico-v2-reference.pdf')
  const sourceHash = hash(source)
  const fieldSchema = [{ key: 'customerName', placements: [{ page: 0, x: 0.15, y: 0.20, width: 0.65, height: 0.04, fontSize: 10 }] }]
  await db.insert(documentTemplates).values({ id: template, slug: 'pdf-' + doc, name: 'PDF Proof', docType: 'ORCAMENTO', version: 'V1', fieldSchema, sourcePdfBase64: source.toString('base64'), sourceFilename: 'base.pdf', sourceSha256: sourceHash })
  const rendered = await renderStoredDocumentTemplate({ sourcePdfBase64: source.toString('base64'), fieldSchema, values: { customerName: 'PDF local - João & Cia' } })
  assert.equal(rendered.ok, true, JSON.stringify(rendered.error))
  const html = rendered.html
  const values = id => ({ id, leadId: lead, docType: 'ORCAMENTO', docNumber: 'PDF-' + id, totalValue: '350.50', htmlSnapshot: html, documentPayloadSnapshot: { templateId: template, templateSourceSha256: sourceHash }, status: 'EMITIDO', issuedAt: new Date(), createdById: actor })
  await db.insert(officialDocuments).values(values(doc))
  setActor(null); assert.equal((await call()).status, 403)
  setActor({ id: actor })
  await db.delete(userPermissions).where(and(eq(userPermissions.userId, actor), eq(userPermissions.permissionKey, 'documents.issue')))
  assert.equal((await call()).status, 403)
  await db.insert(userPermissions).values({ userId: actor, permissionKey: 'documents.issue' })
  await db.delete(userPermissions).where(and(eq(userPermissions.userId, actor), eq(userPermissions.permissionKey, 'documents.read')))
  assert.equal((await call('GET')).status, 403)
  await db.insert(userPermissions).values({ userId: actor, permissionKey: 'documents.read' })
  await db.update(users).set({ isActive: false }).where(eq(users.id, actor)); assert.equal((await call()).status, 403); await db.update(users).set({ isActive: true }).where(eq(users.id, actor))
  assert.equal((await call('POST', doc, { html: '<p>injected</p>' })).status, 422)
  const missing = await call('GET')
  assert.equal(missing.status, 404)
  assert.equal((await missing.json()).code, 'PDF_NOT_GENERATED', 'only missing PDF, not missing document, permits UI generation')
  const missingDocument = await call('GET', randomUUID())
  assert.equal(missingDocument.status, 404)
  assert.equal((await missingDocument.json()).code, undefined)
  const response = await call(); assert.equal(response.status, 201, await response.clone().text())
  const result = await response.json()
  assert.equal(result.htmlSha256, hash(html)); assert.equal(result.templateSourceSha256, sourceHash)
  await db.delete(userPermissions).where(and(eq(userPermissions.userId, actor), eq(userPermissions.permissionKey, 'documents.issue')))
  const download = await call('GET'); assert.equal(download.status, 200, 'documents.read alone downloads existing PDF')
  assert.equal((await call()).status, 403, 'read-only cannot generate')
  await db.insert(userPermissions).values({ userId: actor, permissionKey: 'documents.issue' })
  const bytes = Buffer.from(await download.arrayBuffer()); assert.equal(hash(bytes), result.sha256)
  const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs')
  const parsed = await getDocument({ data: new Uint8Array(bytes), useSystemFonts: true }).promise
  assert.ok(parsed.numPages >= 1 && parsed.numPages <= 30)
  const firstPage = await parsed.getPage(1)
  const text = (await firstPage.getTextContent()).items.map(item => item.str || '').join(' ')
  assert.match(text, /PDF local - João & Cia/)
  if (process.env.PDF_PROOF_OUTPUT) {
    const { writeFileSync } = await import('node:fs')
    writeFileSync(process.env.PDF_PROOF_OUTPUT, bytes)
    writeFileSync(process.env.PDF_PROOF_OUTPUT + '.json', JSON.stringify({ uid: process.getuid(), sandboxEnabled: true, pages: parsed.numPages, bytes: bytes.length, sha256: hash(bytes), downloadSha256: hash(bytes), htmlSha256: hash(html), templateSourceSha256: sourceHash, overlayTextVerified: true }, null, 2) + '\n')
  }
  console.log('PASS actual sandbox PDF parse/pages=' + parsed.numPages + '; generation/download SHA equal; frozen snapshot/source SHA match')
  await parsed.destroy()
  for (const retry of await Promise.all([call(), call()])) { assert.equal(retry.status, 200); assert.equal((await retry.json()).attachmentId, result.attachmentId) }
  const attached = await db.select().from(attachments).where(eq(attachments.documentId, doc)); assert.equal(attached.length, 1)
  await db.update(attachments).set({ metadata: { ...attached[0].metadata, base64: Buffer.from('%PDF-altered').toString('base64') } }).where(eq(attachments.id, attached[0].id))
  assert.equal((await call('GET')).status, 409); assert.equal((await call()).status, 409)
  await db.update(attachments).set({ metadata: attached[0].metadata }).where(eq(attachments.id, attached[0].id))
  const [preserved] = await db.select().from(officialDocuments).where(eq(officialDocuments.id, doc))
  assert.equal(preserved.htmlSnapshot, html); assert.equal(preserved.status, 'EMITIDO'); assert.equal(preserved.sentAt, null)
  const legacy = randomUUID(); ids.push(legacy); await db.insert(officialDocuments).values(values(legacy))
  await db.insert(attachments).values({ documentId: legacy, fileType: 'OFFICIAL_DOCUMENT_PDF', storagePath: '/legacy', mimeType: 'application/pdf', metadata: { sha256: hash(bytes), base64: bytes.toString('base64') } })
  assert.equal((await call('POST', legacy)).status, 409)
  const archived = randomUUID(); ids.push(archived); await db.insert(officialDocuments).values({ ...values(archived), status: 'ARQUIVADO' }); assert.equal((await call('POST', archived)).status, 404); assert.equal((await call('GET', archived)).status, 404)
  const unsafe = randomUUID(); ids.push(unsafe); await db.insert(officialDocuments).values({ ...values(unsafe), htmlSnapshot: '<img src="http://127.0.0.1:55432/">' }); assert.equal((await call('POST', unsafe)).status, 422)
  const failure = randomUUID(); ids.push(failure); await db.insert(officialDocuments).values(values(failure))
  const executable = process.env.CHROMIUM_EXECUTABLE_PATH
  process.env.CHROMIUM_EXECUTABLE_PATH = '/nonexistent/rrd-chromium'
  assert.equal((await call('POST', failure)).status, 503)
  assert.equal((await db.select().from(attachments).where(eq(attachments.documentId, failure))).length, 0)
  assert.equal((await db.select().from(officialDocuments).where(eq(officialDocuments.id, failure)))[0].pdfStoragePath, null)
  process.env.CHROMIUM_EXECUTABLE_PATH = executable || '/usr/bin/chromium'
  assert.equal((await call('POST', failure)).status, 201)
  console.log('PASS runtime launch failure atomically leaves no attachment/path; subsequent retry succeeds')
  console.log('PASS permissions, rejected client content, unique parallel retries, attachment tamper detection, archived, legacy conflict, unsafe snapshot; no sentAt/status changes')
} finally {
  for (const id of ids) { await db.delete(auditEvents).where(eq(auditEvents.targetId, id)); await db.delete(attachments).where(eq(attachments.documentId, id)); await db.delete(officialDocuments).where(eq(officialDocuments.id, id)) }
  await db.delete(documentTemplates).where(eq(documentTemplates.id, template)); await db.delete(leads).where(eq(leads.id, lead)); await db.delete(userPermissions).where(eq(userPermissions.userId, actor)); await db.delete(users).where(eq(users.id, actor)); await conn.end(); rmSync(out, { recursive: true, force: true })
}
