import test from 'node:test'
import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { createRequire } from 'node:module'
import { mkdir, rm } from 'node:fs/promises'
import { resolve } from 'node:path'

// Executes the production route and issuer. Only storage and rasterization are
// test adapters: no network, database, credentials or migrations are used.
test('writer real conserva valor/pix e required em turnos separados antes de emitir', async () => {
 const dir = resolve('.cross-turn-test-artifacts')
 await mkdir(dir, { recursive: true })
 const out = resolve(dir, 'route.cjs')
 try {
  await build({ absWorkingDir: resolve(process.env.CROSS_TURN_TEST_SOURCE || '.'), entryPoints: ['src/app/api/sofia/actions/route.ts'], outfile: out, bundle: true, platform: 'node', format: 'cjs', packages: 'external', plugins: [{ name: 'isolated-storage', setup(builder) {
   builder.onLoad({ filter: /\/src\/db\/index\.ts$/ }, () => ({ contents: "export const db = globalThis.__draftStorage; export * from './schema';", loader: 'ts' }))
   builder.onLoad({ filter: /\/src\/lib\/documents\/registered-template\.ts$/ }, () => ({ contents: "export async function renderRegisteredTemplate(template, data, fields) { globalThis.__renderedFields = fields; return { ok: true, html: '<html>fixture</html>', fieldSchemaSnapshot: template.fieldSchema, fieldValuesSnapshot: fields }; }", loader: 'ts' }))
  } }] })
  const id = '11111111-1111-4111-8111-111111111111'
  const tables = new Map()
  let draft = { id, status: 'PENDING_REVIEW', intent: 'CRIAR_ORCAMENTO', senderPhone: '+5521999999999', draftPayload: { docType: 'ORCAMENTO_TECNICO', templateId: id, customerName: 'Fixture', customerDocument: '52998224725', address: { street: 'Fixture', number: '1', neighborhood: 'Fixture' }, problemReported: 'Fixture' } }
  const template = { id, docType: 'ORCAMENTO_TECNICO', version: 'fixture', fieldSchema: [{ key: 'warranty', label: 'Garantia', type: 'text', required: true, defaultValue: '' }, { key: 'inspectionArea', label: 'Prazo', type: 'text', required: true, defaultValue: '' }] }
  const require = createRequire(import.meta.url)
  const { getTableName } = require('drizzle-orm')
  const tableName = table => getTableName(table)
  const storage = {
   select() { let table; const query = { from(t) { table = tableName(t); return query }, innerJoin() { return query }, where() { return query }, orderBy() { return query }, limit() { return query }, then(ok, fail) {
    const rows = table === 'sofia_drafts' ? [draft] : table === 'users' ? [{ id, phone: '5521999999999', isActive: true, name: 'Fixture' }] : table === 'user_permissions' ? ['sofia.actions.execute', 'sofia.drafts.review', 'documents.issue'].map(key => ({ key })) : table === 'document_templates' ? [template] : []
    return Promise.resolve(rows).then(ok, fail)
   } }; return query },
   update(table) { let values; const query = { set(v) { values = v; return query }, where() { return query }, returning() { return query }, then(ok, fail) { if (tableName(table) === 'sofia_drafts') { draft = { ...draft, ...values }; return Promise.resolve([draft]).then(ok, fail) } return Promise.resolve([]).then(ok, fail) } }; return query },
   insert(table) { let values; const query = { values(v) { values = v; return query }, returning() { return query }, then(ok, fail) { const row = { id, ...values }; tables.set(tableName(table), [...(tables.get(tableName(table)) || []), row]); return Promise.resolve([row]).then(ok, fail) } }; return query },
   async transaction(fn) { return fn(storage) },
  }
  globalThis.__draftStorage = storage
  const { POST } = require(out)
  const oldSecret = process.env.SOFIA_HUB_SECRET, oldHub = process.env.RRD_HUB_ID
  process.env.SOFIA_HUB_SECRET = 'fixture-only'; process.env.RRD_HUB_ID = id
  const envelope = { centralContactId: id, centralClientId: id, centralHubId: id, centralRole: 'hub_operator', senderPhone: draft.senderPhone, conversationSummary: 'fixture' }
  let seq = 0
  const call = async input => {
   const response = await POST(new Request('https://fixture.test/api/sofia/actions', { method: 'POST', headers: { authorization: 'Bearer fixture-only', 'content-type': 'application/json', 'idempotency-key': `fixture-call-${++seq}` }, body: JSON.stringify({ ...envelope, ...input }) }))
   return { status: response.status, body: await response.json() }
  }
  try {
   let result = await call({ action: 'update_service_draft', draftId: id, amount: '350', paymentMethod: 'pix', documentFields: { warranty: '45 dias' } })
   assert.equal(result.status, 200)
   assert.equal(draft.draftPayload.amount, '350'); assert.equal(draft.draftPayload.paymentMethod, 'pix')
   result = await call({ action: 'issue_service_draft', draftId: id })
   assert.equal(result.status, 200); assert.equal(result.body.operationCompleted, false)
   assert.deepEqual(result.body.pendingFields.map(field => field.key), ['inspectionArea'])
   assert.deepEqual(draft.draftPayload.documentFields, { warranty: '45 dias' })
   assert.equal(draft.draftPayload.docType, 'ORCAMENTO_TECNICO')
   assert.equal(draft.draftPayload.templateId, id)
   const beforeUnknown = JSON.stringify({ draft, tables: [...tables] })
   result = await call({ action: 'issue_service_draft', draftId: id, documentFields: { rogue: 'fixture' } })
   assert.equal(result.status, 422)
   assert.equal(JSON.stringify({ draft, tables: [...tables] }), beforeUnknown)
   result = await call({ action: 'update_service_draft', draftId: id, documentFields: { rogue: 'fixture' } })
   assert.equal(result.status, 422)
   assert.equal(JSON.stringify({ draft, tables: [...tables] }), beforeUnknown)
   assert.deepEqual(draft.draftPayload.documentFields, { warranty: '45 dias' })
   // A legacy accumulated field outside pinned A must also fail before any write.
   const goodDraft = draft
   draft = { ...draft, draftPayload: { ...draft.draftPayload, documentFields: { ...draft.draftPayload.documentFields, rogue: 'stored' } } }
   const beforeAccumulated = JSON.stringify({ draft, tables: [...tables] })
   result = await call({ action: 'update_service_draft', draftId: id, documentFields: { inspectionArea: '2 dias' } })
   assert.equal(result.status, 422)
   assert.equal(JSON.stringify({ draft, tables: [...tables] }), beforeAccumulated)
   draft = goodDraft
   result = await call({ action: 'update_service_draft', draftId: id, documentFields: { inspectionArea: '2 dias' } })
   assert.equal(result.status, 200)
   assert.deepEqual(draft.draftPayload.documentFields, { warranty: '45 dias', inspectionArea: '2 dias' })
   result = await call({ action: 'issue_service_draft', draftId: id })
   assert.equal(result.status, 201)
   const document = tables.get('official_documents')[0]
   assert.equal(document.docType, 'ORCAMENTO_TECNICO')
   assert.equal(document.documentPayloadSnapshot.templateId, id)
   assert.equal(document.totalValue, '350.00'); assert.equal(document.paymentMethod, 'pix')
   assert.deepEqual(globalThis.__renderedFields, { warranty: '45 dias', inspectionArea: '2 dias' })
   assert.equal(draft.status, 'CONVERTED')
  } finally {
   if (oldSecret === undefined) delete process.env.SOFIA_HUB_SECRET; else process.env.SOFIA_HUB_SECRET = oldSecret
   if (oldHub === undefined) delete process.env.RRD_HUB_ID; else process.env.RRD_HUB_ID = oldHub
  }
 } finally { delete globalThis.__draftStorage; delete globalThis.__renderedFields; await rm(dir, { recursive: true, force: true }) }
})
