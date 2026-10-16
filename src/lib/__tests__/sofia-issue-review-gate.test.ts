import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { prepareIssueDraft } from '../sofia-issue-draft'
import { documentDraftContract, OPTIONAL_FIELD_CONSENT } from '../sofia-document-draft'

const complete = { customerName: 'Ana Exemplo', customerDocument: '529.982.247-25', amount: '350,50', documentDate: '2026-10-15', problemReported: 'Limpeza da caixa' }
const consent = Object.fromEntries(['customer.phone', 'address.street', 'address.number', 'address.neighborhood', 'address.city', 'address.complement', 'address.referencePoint', 'service.paymentMethod', 'service.priority'].map(key => [key, OPTIONAL_FIELD_CONSENT]))

test('template-specific required fields are requested before omission-consent can authorize issue', () => {
  const source = readFileSync('src/lib/sofia-issue-draft.ts', 'utf8')
  assert.match(source, /templateRequired = schemaFields\.filter\(field => field\.required/)
  assert.match(source, /O modelo selecionado exige dados adicionais antes da emissão/)
  assert.match(source, /pendingFields: templateRequired\.map/)
})
test('issue preparation rejects unconsented optional omissions and invalid canonical minimums', () => {
  assert.equal(prepareIssueDraft(complete, {}).ok, false)
  assert.equal(prepareIssueDraft({ ...complete, optionalFieldConsent: consent }, {}).ok, true)
  assert.equal(prepareIssueDraft({ ...complete, optionalFieldConsent: consent, amount: '0' }, {}).ok, false)
  assert.equal(prepareIssueDraft({ ...complete, optionalFieldConsent: consent, documentDate: '2026-02-30' }, {}).ok, false)
})

test('issue-time financial/payment overrides cannot replace reviewed values', () => {
  const payload = { ...complete, optionalFieldConsent: consent }
  assert.equal(prepareIssueDraft(payload, { amount: '500' }).ok, false)
  assert.equal(prepareIssueDraft(payload, { paymentMethod: 'PIX' }).ok, false)
})

test('create/update review status follows complete contract, and normalized aliases are not overwritten', () => {
  const route = readFileSync('src/app/api/sofia/actions/route.ts', 'utf8')
  const block = route.slice(route.indexOf("if (input.action === 'update_service_draft')"), route.indexOf('const domain = parseSofiaDomainAction'))
  assert.doesNotMatch(block, /pendingFields\.length \? SOFIA_DRAFT_STATUS\.COLLECTING : SOFIA_DRAFT_STATUS\.PENDING_REVIEW/)
  assert.doesNotMatch(block, /next\.documentFields = \{.*\.\.\.input\.documentFields/)
  assert.equal(documentDraftContract(complete).nextAction, 'confirm_optional_omissions')
  assert.equal(documentDraftContract({ ...complete, optionalFieldConsent: consent }).nextAction, 'review_draft')
})

test('issue replay is bound to the actor/draft/document rather than unconditional success', () => {
  const route = readFileSync('src/app/api/sofia/actions/route.ts', 'utf8')
  const block = route.slice(route.indexOf("if (input.action === 'issue_service_draft')"), route.indexOf('const existing = await db.select', route.indexOf("if (input.action === 'issue_service_draft')")))
  assert.doesNotMatch(block, /if \(replay\) return reply\(\{ success: true, alreadyProcessed: true/)
  assert.match(block, /documentId/)
  assert.match(block, /centralContactId/)
})
