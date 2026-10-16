import test from 'node:test'
import assert from 'node:assert/strict'
import { OPTIONAL_FIELD_CONSENT } from '../sofia-document-draft'

// Replace only the persistence boundary. Exercise the real issuer, selector,
// canonical payload builder and template value resolver without a PostgreSQL URL.
const dbPath = require.resolve('../../db')
const originalDb = require(dbPath)
const draftId = '11111111-1111-4111-8111-111111111111'
const leadId = '22222222-2222-4222-8222-222222222222'
const operatorId = '33333333-3333-4333-8333-333333333333'
const consent = Object.fromEntries(['customer.phone', 'address.street', 'address.number', 'address.neighborhood', 'address.city', 'address.complement', 'address.referencePoint', 'service.paymentMethod', 'service.priority'].map(key => [key, OPTIONAL_FIELD_CONSENT]))
const payload = { customerName: 'Pessoa Sintética', customerDocument: '529.982.247-25', amount: '350,50', documentDate: '2026-10-15', problemReported: 'Serviço de teste', optionalFieldConsent: consent, leadId, docType: 'ORCAMENTO' }
let rows: unknown[][] = []
const fakeDb = {
  select() {
    const result = rows.shift()
    assert.ok(result, 'unexpected database query')
    const query: any = { from: () => query, where: () => query, orderBy: () => query, limit: async () => result, then: (resolve: (value: unknown) => unknown) => Promise.resolve(result).then(resolve) }
    return query
  },
  transaction() { assert.fail('invalid template must never reach persistence') },
}
require.cache[dbPath]!.exports = { ...originalDb, db: fakeDb }
const { issueDraftDocument } = require('../sofia-issue-draft') as typeof import('../sofia-issue-draft')

const input = { draftId, senderPhone: '+5500000000101', centralHubId: draftId, centralClientId: draftId, centralContactId: draftId, centralRole: 'hub_operator', correlationId: 'synthetic-template-validation' }
function arrange(keys: string[], documentFields: Record<string, string> = {}) {
  rows = [
    [{ id: operatorId }],
    [{ key: 'sofia.drafts.review' }, { key: 'documents.issue' }],
    [{ id: draftId, draftPayload: { ...payload, documentFields }, status: 'PENDING_REVIEW' }],
    [{ id: leadId, name: payload.customerName, normalizedDocument: '52998224725', convertedClientId: null }],
    [],
    [{ id: draftId, version: 'VTEST', fieldSchema: keys.map(key => ({ key, label: key, type: 'text', required: true })), sourcePdfBase64: '', sourceSha256: 'invalid-test-source' }],
  ]
}

test('canonical required values and aliases reach template rendering without duplicate documentFields', async () => {
  arrange(['issueDate', 'contractor', 'clientName', 'totalAmount', 'totalValue', 'serviceScope'])
  // Deliberately invalid PDF integrity is a downstream sentinel: the renderer
  // must be reached, rather than rejecting already-confirmed canonical fields.
  assert.deepEqual(await issueDraftDocument(input), { ok: false, status: 422, error: 'A integridade do PDF modelo não foi confirmada.' })
  assert.equal(rows.length, 0)
})

test('genuinely missing template values still block before rendering or persistence', async () => {
  arrange(['issueDate', 'contractor', 'technicalNotes'])
  const result = await issueDraftDocument(input)
  assert.equal(result.ok, false)
  if (result.ok) return
  assert.equal(result.status, 422)
  assert.deepEqual(result.pendingFields, [{ key: 'technicalNotes', label: 'technicalNotes' }])
  assert.equal(rows.length, 0)
})

test('explicit blank values cannot bypass required canonical fields', async () => {
  arrange(['contractor'], { contractor: '   ' })
  const result = await issueDraftDocument(input)
  assert.equal(result.ok, false)
  if (result.ok) return
  assert.equal(result.status, 422)
  assert.match(result.error, /Campos do modelo conflitam com os dados revisados/ )
  assert.equal(rows.length, 0)
})
