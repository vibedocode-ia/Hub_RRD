import test from 'node:test'
import assert from 'node:assert/strict'
import { pendingDraftFields } from '../sofia-actions'
import * as drafts from '../sofia-document-draft'

test('normalized payload round-trips JSON and latest aliases win across turns without losing custom fields', () => {
  assert.equal(typeof drafts.normalizeDocumentDraft, 'function')
  const first = drafts.normalizeDocumentDraft({}, { documentFields: { clientName: ' Cliente teste ', clientDoc: '529.982.247-25', totalAmount: '1.250,50', issueDate: '15/10/2026', serviceScope: 'Limpeza da caixa', customField: 'Preservado' } })
  assert.equal(first.customerName, 'Cliente teste')
  assert.equal(first.customerDocument, '52998224725')
  assert.equal(first.amount, '1250,50')
  assert.equal(first.documentDate, '2026-10-15')
  assert.equal(first.problemReported, 'Limpeza da caixa')
  assert.deepEqual(pendingDraftFields(first as any), [])
  const next = drafts.normalizeDocumentDraft(JSON.parse(JSON.stringify(first)), { amount: '500.25', customerName: 'Nome corrigido' })
  assert.equal(next.documentFields.totalAmount, '500,25')
  assert.equal(next.documentFields.clientName, 'Nome corrigido')
  assert.equal(next.documentFields.customField, 'Preservado')
  assert.equal(next.documentDate, '2026-10-15')
  const third = drafts.normalizeDocumentDraft(next, { documentFields: { totalAmount: '600', clientName: 'Outro nome' } })
  assert.equal(third.amount, '600,00')
  assert.equal(third.customerName, 'Outro nome')
  assert.equal(drafts.normalizeDocumentDraft({}, {}).documentDate, '')
})

const complete = { customerName: 'Cliente teste', customerDocument: '529.982.247-25', amount: '350,50', documentDate: '2026-10-15', problemReported: 'Limpeza da caixa' }

test('missing optional values require explicit field consent persisted separately, never fake CRM values', () => {
  assert.equal(typeof drafts.documentDraftContract, 'function')
  const initial = drafts.normalizeDocumentDraft({}, complete)
  const contract = drafts.documentDraftContract(initial)
  assert.deepEqual(contract.missingRequiredFields, [])
  assert.equal(contract.nextAction, 'confirm_optional_omissions')
  const consent = Object.fromEntries(contract.missingOptionalFields.map(item => [item.field, 'Não informado']))
  const agreed = drafts.normalizeDocumentDraft(initial, { optionalFieldConsent: consent })
  const roundTrip = JSON.parse(JSON.stringify(agreed))
  assert.deepEqual(roundTrip.optionalFieldConsent, consent)
  assert.equal(drafts.documentDraftContract(roundTrip).nextAction, 'review_draft')
  assert.equal(roundTrip.customerPhone, undefined)
  assert.equal(roundTrip.address.street, undefined)
  assert.equal(roundTrip.paymentMethod, '')
  const supplied = drafts.normalizeDocumentDraft(roundTrip, { address: { street: 'Rua real' }, customerPhone: '+5521999999999' }) as drafts.SofiaDocumentDraftPayload
  assert.equal(supplied.address?.street, 'Rua real')
  assert.equal(supplied.optionalFieldConsent['address.street'], undefined)
  assert.equal(supplied.optionalFieldConsent['customer.phone'], undefined)
  assert.equal(drafts.documentDraftContract(supplied).confirmedValues['address.street'], 'Rua real')
  const revoked = drafts.normalizeDocumentDraft(roundTrip, { optionalFieldConsent: { 'address.street': null } })
  assert.equal(drafts.documentDraftContract(revoked).nextAction, 'confirm_optional_omissions')
  const literalOnly = drafts.normalizeDocumentDraft(initial, { address: { street: 'Não informado' } }) as drafts.SofiaDocumentDraftPayload
  assert.equal(literalOnly.optionalFieldConsent['address.street'], undefined)
  assert.equal(drafts.documentDraftContract(literalOnly).nextAction, 'confirm_optional_omissions')
})

test('minimum document fields require value and explicit calendar date, not CRM address', () => {
  assert.deepEqual(pendingDraftFields({} as any).map(item => item.field), ['customer.name', 'customer.document', 'amount', 'documentDate', 'service.problemReported'])
  assert.deepEqual(pendingDraftFields(complete as any), [])
  for (const patch of [{ amount: '0' }, { amount: '-1' }, { amount: 'Infinity' }, { documentDate: '2026-02-30' }, { documentDate: '' }, { customerDocument: '11111111111' }, { problemReported: 'Não informado' }]) {
    assert.ok(pendingDraftFields({ ...complete, ...patch } as any).length)
  }
})
