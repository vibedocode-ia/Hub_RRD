import test from 'node:test'
import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { createRequire } from 'node:module'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { createHash } from 'node:crypto'
import { resolve } from 'node:path'

// Executes the production route and issuer. Only storage and rasterization are
// test adapters: no network, database, credentials or migrations are used.
test('writer real conserva valor/pix e required em turnos separados antes de emitir', async () => {
 const dir = await mkdtemp(resolve(tmpdir(), 'rrd-cross-turn-'))
 const out = resolve(dir, 'route.cjs')
 try {
  await build({ absWorkingDir: resolve(process.env.CROSS_TURN_TEST_SOURCE || '.'), entryPoints: ['src/app/api/sofia/actions/route.ts'], outfile: out, banner: { js: `module.paths.unshift(${JSON.stringify(resolve('node_modules'))});` }, bundle: true, platform: 'node', format: 'cjs', packages: 'external', plugins: [{ name: 'isolated-storage', setup(builder) {
   builder.onLoad({ filter: /\/src\/db\/index\.ts$/ }, () => ({ contents: "export const db = globalThis.__draftStorage; export * from './schema';", loader: 'ts' }))
   builder.onLoad({ filter: /\/src\/lib\/documents\/registered-template\.ts$/ }, () => ({ contents: "export async function renderRegisteredTemplate(template, data, fields) { globalThis.__renderedFields = fields; return { ok: true, html: '<html>fixture</html>', fieldSchemaSnapshot: template.fieldSchema, fieldValuesSnapshot: fields }; }", loader: 'ts' }))
  } }] })
  const id = '11111111-1111-4111-8111-111111111111'
  let draftCounter = 0
  const tables = new Map()
  const consent = Object.fromEntries(['customer.phone', 'address.street', 'address.number', 'address.neighborhood', 'address.city', 'address.complement', 'address.referencePoint', 'service.priority'].map(field => [field, 'Não informado']))
  const template = { id, docType: 'ORCAMENTO_TECNICO', version: 'fixture', sourcePdfBase64: Buffer.from('fixture-pdf-bytes').toString('base64'), sourceSha256: createHash('sha256').update('fixture-pdf-bytes').digest('hex'), isActive: true, archivedAt: null, updatedAt: new Date('2026-10-16T00:00:00Z'), fieldSchema: [{ key: 'warranty', label: 'Garantia', type: 'text', required: true, defaultValue: '' }, { key: 'inspectionArea', label: 'Prazo', type: 'text', required: true, defaultValue: '' }] }
  const require = createRequire(import.meta.url)
  const { getTableName, getTableColumns } = require('drizzle-orm')
  const { PgDialect } = require('drizzle-orm/pg-core')
  const dialect = new PgDialect()
  tables.set('sofia_drafts', [])
  tables.set('users', [{ id, phone: '5521999999999', isActive: true, name: 'Fixture' }])
  tables.set('user_permissions', ['sofia.use', 'sofia.drafts.review', 'documents.issue'].map(permissionKey => ({ userId: id, permissionKey })))
  tables.set('document_templates', [template])
  tables.set('clients', [{ id, name: 'Fixture', document: '52998224725', normalizedPhone: '5521999999999', isActive: true }])
  // Evaluate the actual Drizzle predicates, including ownership, status and
  // idempotency. Unsupported SQL fails loudly instead of silently matching rows.
  const matches = (predicate, context) => {
   if (!predicate) return true
   const { sql, params } = dialect.sqlToQuery(predicate)
   const tokens = sql.match(/"[^"]*"\."[^"]*"|\$\d+|[(),=]|\b(?:and|or|in|is|null)\b/g) || []
   assert.equal(tokens.join(''), sql.replace(/\s+/g, ''), `Unsupported fixture SQL: ${sql}`)
   let at = 0
   const take = token => { assert.equal(tokens[at++], token, sql) }
   const atom = () => {
    if (tokens[at] === '(') { at++; const value = expression(); take(')'); return value }
    const column = /^"([^"]+)"\."([^"]+)"$/.exec(tokens[at++])
    assert.ok(column, sql)
    const value = context[column[1]]?.[column[2]]
    if (tokens[at] === 'is') { at++; take('null'); return value == null }
    const operand = () => {
     const token = tokens[at++]
     if (token?.startsWith('$')) return params[Number(token.slice(1)) - 1]
     const other = /^"([^"]+)"\."([^"]+)"$/.exec(token || '')
     assert.ok(other, sql)
     return context[other[1]]?.[other[2]]
    }
    if (tokens[at] === 'in') {
     at++; take('('); const values = [operand()]
     while (tokens[at] === ',') { at++; values.push(operand()) }
     take(')'); return values.includes(value)
    }
    take('='); return value === operand()
   }
   const conjunction = () => { let value = atom(); while (tokens[at] === 'and') { at++; const next = atom(); value = value && next } return value }
   const expression = () => { let value = conjunction(); while (tokens[at] === 'or') { at++; const next = conjunction(); value = value || next } return value }
   const result = expression()
   assert.equal(at, tokens.length, sql)
   return result
  }
  const contextFor = (table, row) => ({ [getTableName(table)]: Object.fromEntries(Object.entries(getTableColumns(table)).map(([key, column]) => [column.name, row[key]])) })
  const storage = {
   select(projection) {
    let table, predicate, maximum = Infinity
    const joins = []
    const query = {
     from(t) { table = t; return query },
     innerJoin(t, on) { joins.push([t, on]); return query },
     where(value) { predicate = value; return query },
     orderBy() { return query }, limit(value) { maximum = value; return query }, for() { return query },
     then(ok, fail) { return Promise.resolve().then(() => {
      let rows = (tables.get(getTableName(table)) || []).map(row => ({ row, context: contextFor(table, row) }))
      for (const [joinedTable, on] of joins) rows = rows.flatMap(item => (tables.get(getTableName(joinedTable)) || []).map(row => ({ ...item, context: { ...item.context, ...contextFor(joinedTable, row) } })).filter(item => matches(on, item.context)))
      return rows.filter(item => matches(predicate, item.context)).slice(0, maximum).map(({ row, context }) => projection ? Object.fromEntries(Object.entries(projection).map(([key, column]) => [key, context[getTableName(column.table)]?.[column.name]])) : structuredClone(row))
     }).then(ok, fail) },
    }
    return query
   },
   update(table) {
    let values, predicate
    const query = { set(v) { values = v; return query }, where(v) { predicate = v; return query }, returning() { return query }, then(ok, fail) { return Promise.resolve().then(() => {
     const updated = []
     tables.set(getTableName(table), (tables.get(getTableName(table)) || []).map(row => {
      if (!matches(predicate, contextFor(table, row))) return row
      const next = { ...row, ...structuredClone(values) }; updated.push(structuredClone(next)); return next
     }))
     return updated
    }).then(ok, fail) } }
    return query
   },
   insert(table) {
    let values
    const query = { values(v) { values = v; return query }, returning() { return query }, then(ok, fail) { return Promise.resolve().then(() => {
     const name = getTableName(table)
     const row = { id: `22222222-2222-4222-8222-${String(++draftCounter).padStart(12, '0')}`, ...structuredClone(values) }
     tables.set(name, [...(tables.get(name) || []), row]); return [structuredClone(row)]
    }).then(ok, fail) } }
    return query
   },
   async transaction(fn) {
    const before = structuredClone(tables)
    try { return await fn(storage) } catch (error) { tables.clear(); for (const [name, rows] of before) tables.set(name, rows); throw error }
   },
   async execute(statement) { assert.equal(dialect.sqlToQuery(statement).sql, 'LOCK TABLE document_templates IN SHARE MODE'); return [] },
  }
  const currentDraft = () => tables.get('sofia_drafts')[0]
  globalThis.__draftStorage = storage
  const { POST } = require(out)
  const oldSecret = process.env.SOFIA_HUB_SECRET, oldHub = process.env.RRD_HUB_ID
  process.env.SOFIA_HUB_SECRET = 'fixture-only'; process.env.RRD_HUB_ID = id
  const envelope = { centralContactId: id, centralClientId: id, centralHubId: id, centralRole: 'hub_operator', senderPhone: '+5521999999999', conversationSummary: 'fixture' }
  const draftInput = { action: 'create_service_draft', ...envelope, clientId: id, customerName: 'Fixture', customerDocument: '52998224725', documentDate: '2026-10-16', problemReported: 'Fixture', amount: '350', paymentMethod: 'pix', optionalFieldConsent: consent, docType: 'ORCAMENTO_TECNICO', templateId: id, documentFields: {} }
  let seq = 0
  const call = async input => {
   const response = await POST(new Request('https://fixture.test/api/sofia/actions', { method: 'POST', headers: { authorization: 'Bearer fixture-only', 'content-type': 'application/json', 'idempotency-key': `fixture-call-${++seq}` }, body: JSON.stringify({ ...envelope, ...input }) }))
   const result = { status: response.status, body: await response.json() }
   return result
  }
  try {
   let result = await call(draftInput)
   assert.equal(result.status, 201, JSON.stringify(result))
   assert.equal(result.body.alreadyProcessed, undefined)
   assert.equal(currentDraft().status, 'PENDING_REVIEW')
   const draftId = result.body.draftId
   result = await call({ action: 'update_service_draft', draftId, amount: '350', paymentMethod: 'pix', documentFields: { warranty: '45 dias' } })
   assert.equal(result.status, 200)
   assert.equal(currentDraft().draftPayload.amount, '350,00'); assert.equal(currentDraft().draftPayload.paymentMethod, 'pix')
   const beforeIncomplete = JSON.stringify([...tables])
   result = await call({ action: 'issue_service_draft', draftId })
   assert.equal(result.status, 422, JSON.stringify(result))
   assert.equal(JSON.stringify([...tables]), beforeIncomplete)
   assert.equal(result.body.operationCompleted, false)
   assert.deepEqual(result.body.pendingFields, [{ key: 'inspectionArea', label: 'Prazo' }])
   assert.equal(result.body.error, 'O modelo selecionado exige dados adicionais antes da emissão.')
   assert.equal(currentDraft().draftPayload.amount, '350,00')
   assert.equal(currentDraft().draftPayload.paymentMethod, 'pix')
   assert.deepEqual(currentDraft().draftPayload.documentFields, { warranty: '45 dias' })
   assert.equal(currentDraft().draftPayload.docType, 'ORCAMENTO_TECNICO')
   assert.equal(currentDraft().draftPayload.templateId, id)
   const beforeUnknown = JSON.stringify([...tables])
   result = await call({ action: 'issue_service_draft', draftId, documentFields: { rogue: 'fixture' } })
   assert.equal(result.status, 422)
   assert.equal(JSON.stringify([...tables]), beforeUnknown)
   result = await call({ action: 'update_service_draft', draftId, documentFields: { rogue: 'fixture' } })
   assert.equal(result.status, 422)
   assert.equal(JSON.stringify([...tables]), beforeUnknown)
   assert.deepEqual(currentDraft().draftPayload.documentFields, { warranty: '45 dias' })
   // A legacy accumulated field outside pinned A must also fail before any write.
   const goodDraft = structuredClone(currentDraft())
   tables.set('sofia_drafts', [{ ...goodDraft, draftPayload: { ...goodDraft.draftPayload, documentFields: { ...goodDraft.draftPayload.documentFields, rogue: 'stored' } } }])
   const beforeAccumulated = JSON.stringify([...tables])
   result = await call({ action: 'update_service_draft', draftId, documentFields: { inspectionArea: '2 dias' } })
   assert.equal(result.status, 422)
   assert.equal(JSON.stringify([...tables]), beforeAccumulated)
   tables.set('sofia_drafts', [goodDraft])
   result = await call({ action: 'update_service_draft', draftId, documentFields: { inspectionArea: '2 dias' } })
   assert.equal(result.status, 200)
   assert.deepEqual(currentDraft().draftPayload.documentFields, { warranty: '45 dias', inspectionArea: '2 dias' })
   result = await call({ action: 'issue_service_draft', draftId })
   assert.equal(result.status, 201, JSON.stringify(result))
   assert.equal(tables.get('official_documents').length, 1)
   assert.equal(tables.get('proposals').length, 1)
   const document = tables.get('official_documents')[0]
   assert.equal(document.docType, 'ORCAMENTO_TECNICO')
   assert.equal(document.documentPayloadSnapshot.templateId, id)
   assert.equal(document.totalValue, '350.00'); assert.equal(document.paymentMethod, 'pix')
   assert.deepEqual(globalThis.__renderedFields, { warranty: '45 dias', inspectionArea: '2 dias' })
   assert.equal(currentDraft().status, 'CONVERTED')
  } finally {
   if (oldSecret === undefined) delete process.env.SOFIA_HUB_SECRET; else process.env.SOFIA_HUB_SECRET = oldSecret
   if (oldHub === undefined) delete process.env.RRD_HUB_ID; else process.env.RRD_HUB_ID = oldHub
  }
 } finally { delete globalThis.__draftStorage; delete globalThis.__renderedFields; await rm(dir, { recursive: true, force: true }) }
})
