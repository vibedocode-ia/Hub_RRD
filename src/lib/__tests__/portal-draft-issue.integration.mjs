import { build } from 'esbuild'
import { createRequire } from 'node:module'
import { mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { resolve } from 'node:path'
import assert from 'node:assert/strict'
import { randomUUID, createHash } from 'node:crypto'

assert.equal(process.env.RRD_ISSUER_DISPOSABLE_DB, '1')
assert.match(process.env.DATABASE_URL || '', /^postgres(?:ql)?:\/\/[^@]+@(?:localhost|127\.0\.0\.1):55432\/rrd_issuer_test$/)
process.env.NODE_ENV = 'production'
const out = resolve('.portal-issue-test')
mkdirSync(out, { recursive: true })
// Only server session is doubled. Access guards, route, issuer, templates and PostgreSQL are real.
writeFileSync(out + '/session.ts', 'let actor = null; export const setActor = value => { actor = value }; export const getSessionUser = async () => actor')
writeFileSync(out + '/entry.ts', `export { POST } from '../src/app/api/sofia/drafts/[id]/confirm/route'; export { setActor } from './session'; export * from '../src/db'; export { draftReviewVersion } from '../src/lib/sofia-draft-review-version'; export { selectSofiaDocumentTemplate } from '../src/lib/sofia-document-template'; export { reviewPortalDraft } from '../src/lib/sofia-issue-draft'; export { default as SofiaDraftsPage } from '../src/app/portal/sofia-drafts/page'; export { default as DocumentPreviewPage } from '../src/app/portal/documentos/preview/[id]/page'`)
await build({ entryPoints: [out + '/entry.ts'], outfile: out + '/entry.cjs', bundle: true, platform: 'node', format: 'cjs', define: { 'import.meta.url': JSON.stringify(new URL('../stored-document-template.ts', import.meta.url).href) }, packages: 'external', plugins: [{ name: 'session-only', setup(b) { b.onResolve({ filter: /^@\/lib\/auth$/ }, () => ({ path: out + '/session.ts' })) } }] })
const require = createRequire(import.meta.url)
const { POST, setActor, draftReviewVersion, selectSofiaDocumentTemplate, reviewPortalDraft, SofiaDraftsPage, DocumentPreviewPage, db, conn, users, userPermissions, leads, documentTemplates, sofiaDrafts, sofiaEvents, officialDocuments, leadProposals, auditEvents } = require(out + '/entry.cjs')
const { eq, sql } = await import('drizzle-orm')
const extraDraftIds = [], extraTemplateIds = []
const actorId = randomUUID(), otherActorId = randomUUID(), leadId = randomUUID(), draftId = randomUUID(), templateId = randomUUID(), hubId = randomUUID()
process.env.RRD_HUB_ID = hubId
const consent = Object.fromEntries(['customer.phone','address.street','address.number','address.neighborhood','address.city','address.complement','address.referencePoint','service.paymentMethod','service.priority'].map(k => [k, 'Não informado']))
const payload = { customerName: 'Portal Teste', customerDocument: '529.982.247-25', amount: '350,50', documentDate: '2026-10-15', problemReported: 'Limpeza confirmada', optionalFieldConsent: consent, leadId, templateId, docType: 'ORCAMENTO' }
const version = async value => draftReviewVersion(value, await selectSofiaDocumentTemplate(value.docType || 'ORCAMENTO', value.templateId))
let reviewVersion
// Valid one-page PDF fixture; renderer uses the actual registered-template implementation.
let pdf = '%PDF-1.4\n'; const offsets = [0]
for (const [i, obj] of ['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << >> /Contents 4 0 R >>','<< /Length 0 >>\nstream\nendstream'].entries()) { offsets.push(pdf.length); pdf += `${i+1} 0 obj\n${obj}\nendobj\n` }
const start = pdf.length; pdf += `xref\n0 5\n0000000000 65535 f \n${offsets.slice(1).map(n => `${String(n).padStart(10,'0')} 00000 n \n`).join('')}trailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n${start}\n%%EOF\n`
const post = (body = { confirmation: 'CONFIRMO', reviewVersion }, id = draftId) => POST(new Request('http://localhost/api/sofia/drafts/' + id + '/confirm', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }), { params: Promise.resolve({ id }) })
try {
  await db.insert(users).values({ id: actorId, name: 'Portal Teste', phone: '5500000099911', passwordHash: 'test-only', role: 'ADMIN' })
  await db.insert(userPermissions).values(['sofia.drafts.review','documents.issue','documents.read'].map(permissionKey => ({ userId: actorId, permissionKey })))
  await db.insert(users).values({ id: otherActorId, name: 'Portal Outro Revisor Teste', phone: '5500000099914', passwordHash: 'test-only', role: 'ADMIN' })
  await db.insert(userPermissions).values(['sofia.drafts.review','documents.issue'].map(permissionKey => ({ userId: otherActorId, permissionKey })))
  await db.insert(leads).values({ id: leadId, name: payload.customerName, phone: '5500000099912', normalizedPhone: '5500000099912', normalizedDocument: '52998224725' })
  await db.insert(documentTemplates).values({ id: templateId, slug: 'portal-' + draftId, name: 'Portal Teste', docType: 'ORCAMENTO', version: 'V1', fieldSchema: [], sourcePdfBase64: Buffer.from(pdf).toString('base64'), sourceFilename: 'test.pdf', sourceSha256: createHash('sha256').update(pdf).digest('hex') })
  await db.insert(sofiaDrafts).values({ id: draftId, correlationId: 'portal-test-' + draftId, centralContactId: randomUUID(), centralClientId: randomUUID(), centralHubId: hubId, centralRole: 'hub_operator', senderPhone: '+5500000099913', intent: 'CRIAR_ORCAMENTO', status: 'PENDING_REVIEW', draftPayload: payload })
  reviewVersion = await version(payload)
  const crmCounts = async () => (await conn.unsafe('SELECT (SELECT count(*) FROM leads)::int AS leads, (SELECT count(*) FROM clients)::int AS clients, (SELECT count(*) FROM client_addresses)::int AS client_addresses, (SELECT count(*) FROM lead_addresses)::int AS lead_addresses, (SELECT count(*) FROM service_requests)::int AS service_requests, (SELECT count(*) FROM lead_service_requests)::int AS lead_service_requests'))[0]
  const crmBefore = await crmCounts()
  setActor({ id: actorId })
  const countDocs = async () => (await db.select().from(officialDocuments).where(eq(officialDocuments.leadId, leadId))).length
  setActor(null)
  assert.equal((await post()).status, 403)
  setActor({ id: actorId })
  for (const permissionKey of ['documents.issue', 'sofia.drafts.review']) {
    const { and } = await import('drizzle-orm')
    await db.delete(userPermissions).where(and(eq(userPermissions.userId, actorId), eq(userPermissions.permissionKey, permissionKey)))
    assert.equal((await post()).status, 403)
    await db.insert(userPermissions).values({ userId: actorId, permissionKey })
  }
  await db.update(users).set({ isActive: false }).where(eq(users.id, actorId))
  assert.equal((await post()).status, 403)
  await db.update(users).set({ isActive: true }).where(eq(users.id, actorId))
  for (const body of [{ reviewVersion }, { confirmation: 'CONFIRMO' }, { confirmation: 'CONFIRMO', reviewVersion, actorUserId: actorId }, { confirmation: 'CONFIRMO', reviewVersion, senderPhone: '+5500000099913' }, { confirmation: 'CONFIRMO', reviewVersion, centralHubId: hubId }, { confirmation: 'CONFIRMO', reviewVersion, amount: '1' }]) assert.equal((await post(body)).status, 422)
  delete process.env.RRD_HUB_ID
  assert.equal((await post()).status, 503)
  process.env.RRD_HUB_ID = randomUUID()
  assert.equal((await post()).status, 409)
  process.env.RRD_HUB_ID = hubId
  await db.update(sofiaDrafts).set({ draftPayload: { ...payload, amount: '99' } }).where(eq(sofiaDrafts.id, draftId))
  assert.equal((await post()).status, 409, 'stale review cannot emit changed values')
  for (const patch of [{ customerName: '' }, { customerDocument: '11111111111' }, { amount: '0' }, { documentDate: '' }, { problemReported: '' }, { optionalFieldConsent: {} }]) {
    const invalid = { ...payload, ...patch }
    await db.update(sofiaDrafts).set({ draftPayload: invalid }).where(eq(sofiaDrafts.id, draftId))
    assert.equal((await post({ confirmation: 'CONFIRMO', reviewVersion: await version(invalid) })).status, 422)
  }
  const conflicting = { ...payload, documentFields: { totalAmount: '999,00' } }
  await db.update(documentTemplates).set({ fieldSchema: [{ key: 'totalAmount', label: 'Valor', type: 'text', required: true }] }).where(eq(documentTemplates.id, templateId))
  await db.update(sofiaDrafts).set({ draftPayload: conflicting }).where(eq(sofiaDrafts.id, draftId))
  const conflictResponse = await post({ confirmation: 'CONFIRMO', reviewVersion: await version(conflicting) })
  assert.equal(conflictResponse.status, 422)
  assert.match((await conflictResponse.json()).error, /conflitam com os dados revisados/, 'reject the conflict itself, not an unrelated rendering error')
  await db.update(documentTemplates).set({ fieldSchema: [] }).where(eq(documentTemplates.id, templateId))
  assert.equal(await countDocs(), 0)
  await db.update(sofiaDrafts).set({ draftPayload: payload }).where(eq(sofiaDrafts.id, draftId))
  console.log('PASS portal negatives: session, both permissions, inactive actor, confirmation, injected identity/envelope, Hub, stale review, five minimums and optional consent; zero documents')
  const assertNoIssue = async () => {
    assert.equal(await countDocs(), 0)
    assert.equal((await db.select().from(leadProposals).where(eq(leadProposals.leadId, leadId))).length, 0)
    assert.equal((await db.select().from(sofiaEvents).where(sql`${sofiaEvents.rawPayload}->>'draftId' = ${draftId}`)).length, 0)
    assert.equal((await db.select().from(auditEvents).where(eq(auditEvents.actorUserId, actorId))).length, 0)
    assert.equal((await db.select().from(sofiaDrafts).where(eq(sofiaDrafts.id, draftId)))[0].status, 'PENDING_REVIEW')
  }
  const [originalTemplate] = await db.select().from(documentTemplates).where(eq(documentTemplates.id, templateId))
  const resetTemplate = () => db.update(documentTemplates).set({ fieldSchema: originalTemplate.fieldSchema, sourcePdfBase64: originalTemplate.sourcePdfBase64, sourceSha256: originalTemplate.sourceSha256, version: originalTemplate.version }).where(eq(documentTemplates.id, templateId))
  // Each reviewed template component must invalidate a stale confirmation independently.
  for (const patch of [
    { fieldSchema: [{ key: 'note', label: 'Nota', type: 'text', required: false, defaultValue: 'PIX', placements: [{ page: 0, x: 0.1, y: 0.1, width: 0.4, height: 0.05 }] }] },
    { version: 'V2' }, { sourceSha256: '0'.repeat(64) },
    { sourcePdfBase64: Buffer.from(pdf + '\n').toString('base64') },
  ]) {
    await db.update(documentTemplates).set(patch).where(eq(documentTemplates.id, templateId))
    assert.equal((await post()).status, 409, 'template change after review must reject before rendering/insertion')
    await assertNoIssue()
    await resetTemplate()
  }
  const defaults = [{ key: 'note', label: 'Nota', type: 'text', required: false, defaultValue: 'PIX', placements: [{ page: 0, x: 0.1, y: 0.1, width: 0.4, height: 0.05 }] }]
  await db.update(documentTemplates).set({ fieldSchema: defaults }).where(eq(documentTemplates.id, templateId))
  const review = await reviewPortalDraft(draftId, payload)
  assert.equal(review.templateId, templateId)
  assert.equal(review.effectiveValues.note, 'PIX', 'review shows renderer-effective defaults, not just raw JSON')
  const childText = node => Array.isArray(node) ? node.map(childText).join(' ') : node && typeof node === 'object' ? childText(node.props?.children) : typeof node === 'string' || typeof node === 'number' ? String(node) : ''
  const pageText = childText(await SofiaDraftsPage())
  assert.match(pageText, /Valores efetivos do modelo/)
  assert.ok(pageText.includes(templateId))
  assert.match(pageText, /Nota PIX/)
  await db.update(documentTemplates).set({ fieldSchema: [{ ...defaults[0], defaultValue: 'Dinheiro' }] }).where(eq(documentTemplates.id, templateId))
  assert.equal((await post({ confirmation: 'CONFIRMO', reviewVersion: review.reviewVersion })).status, 409)
  await assertNoIssue()
  await resetTemplate()
  console.log('PASS review binds template schema/default, version, declared hash and actual source; effective default visible')

  // Hold only the draft row: the real issuer completes its unlocked reads/render and
  // then blocks at FOR UPDATE. pg_blocking_pids proves the schedule (no guessed delay).
  const race = async (mutate, currentPayload = payload) => {
    await db.update(sofiaDrafts).set({ draftPayload: currentPayload }).where(eq(sofiaDrafts.id, draftId))
    const reviewed = await version(currentPayload)
    const blocker = await conn.reserve()
    let pending, active = false
    try {
      await blocker.unsafe('BEGIN')
      active = true
      const [{ pid }] = await blocker.unsafe('SELECT pg_backend_pid() AS pid')
      await blocker.unsafe('SELECT id FROM sofia_drafts WHERE id = $1 FOR UPDATE', [draftId])
      pending = post({ confirmation: 'CONFIRMO', reviewVersion: reviewed })
      let waiting = false
      const deadline = Date.now() + 10000
      while (Date.now() < deadline) {
        const [{ found }] = await conn.unsafe('SELECT EXISTS (SELECT 1 FROM pg_stat_activity WHERE $1::int = ANY(pg_blocking_pids(pid))) AS found', [pid])
        if (found) { waiting = true; break }
        await new Promise(resolve => setTimeout(resolve, 20))
      }
      assert.equal(waiting, true, 'issuer must reach the locked draft after preflight/render')
      await mutate()
      await blocker.unsafe('COMMIT')
      active = false
      assert.equal((await pending).status, 409, 'changed identity/template must be revalidated inside transaction')
      await assertNoIssue()
    } finally {
      if (active) await blocker.unsafe('ROLLBACK')
      blocker.release()
      if (pending) await pending
    }
  }
  for (const patch of [{ name: 'Nome alterado' }, { normalizedDocument: '11144477735' }, { normalizedPhone: '5500000000001' }]) {
    const withPhone = { ...payload, customerPhone: '5500000099912' }
    await race(() => db.update(leads).set(patch).where(eq(leads.id, leadId)), withPhone)
    await db.update(leads).set({ name: payload.customerName, normalizedDocument: '52998224725', normalizedPhone: '5500000099912' }).where(eq(leads.id, leadId))
  }
  await race(() => db.update(documentTemplates).set({ fieldSchema: defaults }).where(eq(documentTemplates.id, templateId)))
  await resetTemplate()
  const implicit = { ...payload }; delete implicit.templateId
  const newerTemplateId = randomUUID(); extraTemplateIds.push(newerTemplateId)
  await race(() => db.insert(documentTemplates).values({ ...originalTemplate, id: newerTemplateId, slug: 'portal-new-' + draftId, updatedAt: new Date('2099-01-01') }), implicit)
  await db.delete(documentTemplates).where(eq(documentTemplates.id, newerTemplateId))
  await db.update(sofiaDrafts).set({ draftPayload: payload }).where(eq(sofiaDrafts.id, draftId))
  reviewVersion = await version(payload)
  console.log('PASS real PostgreSQL races: name/document/phone, template edit and implicit selection insert => 409; zero document/proposal/event/audit, pending draft')
  // Fault after the document/proposal inserts proves atomic rollback, not a mocked transaction.
  await conn.unsafe(`CREATE OR REPLACE FUNCTION rrd_portal_issue_test_abort() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.actor_user_id = '${actorId}'::uuid THEN RAISE EXCEPTION 'disposable test abort'; END IF; RETURN NEW; END $$`)
  await conn.unsafe('CREATE TRIGGER rrd_portal_issue_test_abort BEFORE INSERT ON audit_events FOR EACH ROW EXECUTE FUNCTION rrd_portal_issue_test_abort()')
  assert.equal((await post()).status, 503)
  assert.equal(await countDocs(), 0)
  assert.equal((await db.select().from(leadProposals).where(eq(leadProposals.leadId, leadId))).length, 0)
  assert.equal((await db.select().from(sofiaEvents).where(sql`${sofiaEvents.rawPayload}->>'draftId' = ${draftId}`)).length, 0)
  assert.equal((await db.select().from(sofiaDrafts).where(eq(sofiaDrafts.id, draftId)))[0].status, 'PENDING_REVIEW')
  await conn.unsafe('DROP TRIGGER rrd_portal_issue_test_abort ON audit_events')
  await conn.unsafe('DROP FUNCTION rrd_portal_issue_test_abort()')
  console.log('PASS transaction rollback: forced audit failure leaves zero document/proposal/event; draft pending; retry remains possible')
  const response = await post()
  assert.equal(response.status, 201, 'authenticated portal issuance must persist, not merely review')
  const result = await response.json()
  const [document] = await db.select().from(officialDocuments).where(eq(officialDocuments.id, result.documentId))
  assert.equal(document.status, 'EMITIDO')
  assert.equal(document.sentAt, null)
  const [issuedProposal] = await db.select().from(leadProposals).where(eq(leadProposals.officialDocumentId, document.id))
  assert.equal(issuedProposal.status, 'DRAFT', 'portal issuance does not imply sending')
  assert.equal(issuedProposal.sentAt, null)
  assert.equal(document.createdById, actorId)
  assert.equal(document.leadId, leadId)
  assert.equal(document.serviceRequestId, null)
  const { and } = await import('drizzle-orm')
  await db.delete(userPermissions).where(and(eq(userPermissions.userId, actorId), eq(userPermissions.permissionKey, 'documents.read')))
  await assert.rejects(DocumentPreviewPage({ params: Promise.resolve({ id: 'not-a-uuid' }) }), error => error.digest === 'NEXT_HTTP_ERROR_FALLBACK;404', 'denial occurs before document query, even with invalid UUID')
  await db.insert(userPermissions).values({ userId: actorId, permissionKey: 'documents.read' })
  await db.delete(userPermissions).where(and(eq(userPermissions.userId, actorId), eq(userPermissions.permissionKey, 'documents.issue')))
  const preview = await DocumentPreviewPage({ params: Promise.resolve({ id: document.id }) })
  const propsOf = node => Array.isArray(node) ? node.flatMap(propsOf) : node && typeof node === 'object' ? [node.props, ...propsOf(node.props?.children)] : []
  const downloadProps = propsOf(preview).find(props => props?.documentId === document.id)
  assert.equal(downloadProps.canIssue, false, 'read-only preview must not authorize generation')
  await db.insert(userPermissions).values({ userId: actorId, permissionKey: 'documents.issue' })
  console.log('PASS preview: documents.read enforced before query; read-only viewer gets canIssue=false')
  assert.equal(result.previewUrl, '/portal/documentos/preview/' + document.id)
  const [converted] = await db.select().from(sofiaDrafts).where(eq(sofiaDrafts.id, draftId))
  assert.equal(converted.status, 'CONVERTED')
  assert.equal(converted.reviewedById, actorId)
  assert.deepEqual(converted.draftPayload, payload, 'issue must not rewrite reviewed data')
  const retry = await post()
  assert.equal(retry.status, 200, 'retry must return the committed result')
  assert.equal((await retry.json()).documentId, document.id)
  setActor({ id: otherActorId })
  const otherRetry = await post()
  assert.equal(otherRetry.status, 409, 'another reviewer cannot replay the original actor issuance')
  assert.equal((await otherRetry.json()).documentId, undefined)
  setActor({ id: actorId })
  assert.equal(await countDocs(), 1)
  assert.deepEqual(await crmCounts(), crmBefore, 'no CRM or service request insertion during issuance/retry')
  assert.equal((await db.select().from(leadProposals).where(eq(leadProposals.officialDocumentId, document.id))).length, 1)
  assert.equal((await db.select().from(sofiaEvents).where(sql`${sofiaEvents.rawPayload}->>'draftId' = ${draftId}`)).length, 1)
  console.log('PASS CRM invariants: unchanged leads, clients, both address tables and both request tables; one proposal and issuance event')
  console.log('PASS portal route: committed document, session actor, existing recipient and real preview')
  console.log('PASS portal retry: same persisted document; exact reviewed payload preserved')
  const aliasSchema = [
    { key: 'totalAmount', label: 'Valor', type: 'currency', required: true },
    { key: 'issueDate', label: 'Data', type: 'date', required: true },
    { key: 'clientDoc', label: 'CPF/CNPJ', type: 'text', required: true },
  ].map((field, index) => ({ ...field, placements: [{ page: 0, x: 0.1, y: 0.1 + index * 0.1, width: 0.4, height: 0.05 }] }))
  await db.update(documentTemplates).set({ fieldSchema: aliasSchema }).where(eq(documentTemplates.id, templateId))
  for (const value of ['350.50', 350.5, '350,50']) {
    const id = randomUUID(); extraDraftIds.push(id)
    const aliasPayload = { ...payload, documentFields: { totalAmount: value, issueDate: '15/10/2026', clientDoc: '52998224725' } }
    await db.insert(sofiaDrafts).values({ id, correlationId: 'portal-alias-' + id, centralContactId: randomUUID(), centralClientId: randomUUID(), centralHubId: hubId, centralRole: 'hub_operator', senderPhone: '+550****9913', intent: 'CRIAR_ORCAMENTO', status: 'PENDING_REVIEW', draftPayload: aliasPayload })
    const response = await post({ confirmation: 'CONFIRMO', reviewVersion: await version(aliasPayload) }, id)
    const body = await response.json()
    assert.equal(response.status, 201, JSON.stringify(body))
    const [stored] = await db.select().from(sofiaDrafts).where(eq(sofiaDrafts.id, id))
    assert.deepEqual(stored.draftPayload, aliasPayload, 'equivalent aliases may issue but never rewrite original reviewed JSON')
    const [document] = await db.select().from(officialDocuments).where(eq(officialDocuments.id, body.documentId))
    assert.equal(document.totalValue, '350.50')
  }
  console.log('PASS alias route: decimal dot/numeric/BR money, ISO/BR date and formatted/digits identity accepted; original JSON preserved')
  assert.deepEqual(await crmCounts(), crmBefore)
} finally {
  await conn.unsafe('SET client_min_messages TO warning')
  await conn.unsafe('DROP TRIGGER IF EXISTS rrd_portal_issue_test_abort ON audit_events')
  await conn.unsafe('DROP FUNCTION IF EXISTS rrd_portal_issue_test_abort()')
  await db.delete(auditEvents).where(eq(auditEvents.actorUserId, actorId))
  await db.delete(leadProposals).where(eq(leadProposals.leadId, leadId))
  await db.delete(officialDocuments).where(eq(officialDocuments.leadId, leadId))
  await db.delete(sofiaEvents).where(sql`${sofiaEvents.rawPayload}->>'draftId' = ${draftId}`)
  for (const id of extraDraftIds) {
    await db.delete(sofiaEvents).where(sql`${sofiaEvents.rawPayload}->>'draftId' = ${id}`)
    await db.delete(sofiaDrafts).where(eq(sofiaDrafts.id, id))
  }
  await db.delete(sofiaDrafts).where(eq(sofiaDrafts.id, draftId))
  for (const id of extraTemplateIds) await db.delete(documentTemplates).where(eq(documentTemplates.id, id))
  await db.delete(documentTemplates).where(eq(documentTemplates.id, templateId))
  await db.delete(leads).where(eq(leads.id, leadId))
  await db.delete(userPermissions).where(eq(userPermissions.userId, actorId))
  await db.delete(users).where(eq(users.id, actorId))
  await db.delete(userPermissions).where(eq(userPermissions.userId, otherActorId))
  await db.delete(users).where(eq(users.id, otherActorId))
  await conn.end()
  rmSync(out, { recursive: true, force: true })
}
