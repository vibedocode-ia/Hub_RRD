import test from 'node:test'
import assert from 'node:assert/strict'
import { parseSofiaClientAction, SofiaActionRequest, parseSofiaDomainAction } from '../src/lib/sofia-actions'
import { authorizeRrdCentralEnvelope } from '../src/lib/sofia-godadmin-policy'

const hubId = '11111111-1111-4111-8111-111111111111'
const grantId = '22222222-2222-4222-8222-222222222222'
const actor = '+15551234567'
const central = { centralHubId: hubId, centralGrantId: grantId, centralRole: 'god_admin', senderPhone: actor }

for (const [action, data] of [
  ['list_clients', {}],
  ['get_client_profile', { clientId: '33333333-3333-4333-8333-333333333333' }],
  ['update_client', { clientId: '33333333-3333-4333-8333-333333333333', email: 'fixture@example.invalid' }],
] as const) test(`RRD ${action} accepts only an authenticated explicit GodAdmin contract without a local membership`, () => {
  const envelope = { ...central, action, data }
  assert.equal(authorizeRrdCentralEnvelope(envelope, { expectedHubId: hubId, trustedGodAdmin: true }), true)
  assert.equal(parseSofiaClientAction(envelope).ok, true)
})

test('RRD rejects forged GodAdmin on ordinary service token, other Hub, or untrusted sender', () => {
  for (const policy of [
    { expectedHubId: hubId, trustedGodAdmin: false },
    { expectedHubId: '44444444-4444-4444-8444-444444444444', trustedGodAdmin: true },
  ]) assert.equal(authorizeRrdCentralEnvelope({ ...central, action: 'list_clients' }, policy), false)
  assert.equal(authorizeRrdCentralEnvelope({ ...central, centralRole: 'hub_owner', action: 'list_clients' }, { expectedHubId: hubId, trustedGodAdmin: true }), false)
  assert.equal(authorizeRrdCentralEnvelope({ ...central, senderPhone: 'bad', action: 'list_clients' }, { expectedHubId: hubId, trustedGodAdmin: true }), false)
  assert.equal(authorizeRrdCentralEnvelope({ ...central, action: 'archive_client' }, { expectedHubId: hubId, trustedGodAdmin: true }), false)
})

test('RRD owner and operator parsers are unchanged; GodAdmin cannot expand unrelated operations', () => {
  const old = { centralHubId: hubId, centralContactId: grantId, centralClientId: grantId, senderPhone: actor, centralRole: 'hub_owner', action: 'list_clients' }
  assert.equal(parseSofiaClientAction(old).ok, true)
  assert.equal(parseSofiaDomainAction({ ...central, action: 'archive_vehicle', data: {} }).ok, false)
  assert.equal(SofiaActionRequest.safeParse({ ...central, action: 'create_service_draft', conversationSummary: 'fixture' }).success, false)
})
