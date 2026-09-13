import test from 'node:test'
import assert from 'node:assert/strict'
import { parseSofiaClientAction } from '../sofia-actions'

const envelope = {
  centralContactId: '11111111-1111-4111-8111-111111111111',
  centralClientId: '22222222-2222-4222-8222-222222222222',
  centralHubId: '33333333-3333-4333-8333-333333333333',
  centralRole: 'hub_owner',
  senderPhone: '+5521999999999',
}

test('authorized CRM profile lookup accepts exactly one client identity', () => {
  const byName = parseSofiaClientAction({ ...envelope, action: 'get_client_profile', data: { name: 'Condomínio Mauá' } })
  assert.equal(byName.ok, true)
  const byId = parseSofiaClientAction({ ...envelope, action: 'get_client_profile', data: { clientId: '44444444-4444-4444-8444-444444444444' } })
  assert.equal(byId.ok, true)
})

test('authorized CRM update accepts a validated street with a client UUID', () => {
  const updated = parseSofiaClientAction({ ...envelope, action: 'update_client', data: { clientId: '44444444-4444-4444-8444-444444444444', street: 'Rua das Flores' } })
  assert.equal(updated.ok, true)
  assert.equal(parseSofiaClientAction({ ...envelope, action: 'update_client', data: { clientId: '44444444-4444-4444-8444-444444444444', street: '' } }).ok, false)
})

test('authorized CRM profile lookup rejects no identity or conflicting identities', () => {
  assert.equal(parseSofiaClientAction({ ...envelope, action: 'get_client_profile', data: {} }).ok, false)
  assert.equal(parseSofiaClientAction({ ...envelope, action: 'get_client_profile', data: { name: 'Cliente', clientId: '44444444-4444-4444-8444-444444444444' } }).ok, false)
})
