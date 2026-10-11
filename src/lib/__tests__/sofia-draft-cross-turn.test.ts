import test from 'node:test'
import assert from 'node:assert/strict'
import { SofiaCreateDraftRequest, SofiaUpdateDraftRequest } from '../sofia-actions'
const id = '11111111-1111-4111-8111-111111111111'
const envelope = { centralContactId: id, centralClientId: id, centralHubId: id, centralRole: 'hub_operator', senderPhone: '+5521999999999', conversationSummary: 'fixture' }
test('create/update aceitam valor e pagamento sem emissão; rejeitam tipos e campos arbitrários', () => {
 for (const [schema, action] of [[SofiaCreateDraftRequest, 'create_service_draft'], [SofiaUpdateDraftRequest, 'update_service_draft']] as const) {
  const input = { ...envelope, action, ...(action === 'update_service_draft' ? { draftId: id } : {}), amount: '350', paymentMethod: 'pix' }
  const parsed = schema.safeParse(input)
  assert.equal(parsed.success, true)
  if (parsed.success) { assert.equal(parsed.data.amount, '350'); assert.equal(parsed.data.paymentMethod, 'pix') }
  for (const patch of [{ amount: 350 }, { paymentMethod: 1 }, { evil: 'x' }]) assert.equal(schema.safeParse({ ...input, ...patch }).success, false)
 }
})
