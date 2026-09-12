import test from 'node:test'
import assert from 'node:assert/strict'
import { SofiaActionRequest, pendingDraftFields, parseSofiaClientAction, validCpf } from '../src/lib/sofia-actions'

const identity = {
  centralContactId: '11111111-1111-4111-8111-111111111111',
  centralClientId: '22222222-2222-4222-8222-222222222222',
  centralHubId: '33333333-3333-4333-8333-333333333333',
  centralRole: 'hub_owner',
  senderPhone: '+5521999999999',
}

test('Sofia action contract rejects a caller-selected URL and unknown action', () => {
  assert.equal(SofiaActionRequest.safeParse({ ...identity, action: 'list_services', url: 'https://evil.invalid' }).success, false)
  assert.equal(SofiaActionRequest.safeParse({ ...identity, action: 'delete_everything' }).success, false)
})

test('Sofia action contract accepts only a scoped service-list request', () => {
  assert.equal(SofiaActionRequest.safeParse({ ...identity, action: 'list_services' }).success, true)
})

test('draft contract returns only the missing fields needed before review', () => {
  const parsed = SofiaActionRequest.parse({ ...identity, action: 'create_service_draft', conversationSummary: 'Preciso de orçamento.' })
  if (parsed.action !== 'create_service_draft') throw new Error('ação inesperada')
  assert.deepEqual(pendingDraftFields(parsed), [
    { field: 'customer.name', label: 'Nome do cliente', requiredFor: 'service_request' },
    { field: 'address.street', label: 'Logradouro', requiredFor: 'service_request' },
    { field: 'address.number', label: 'Número', requiredFor: 'service_request' },
    { field: 'address.neighborhood', label: 'Bairro', requiredFor: 'service_request' },
    { field: 'service.problemReported', label: 'Problema relatado', requiredFor: 'service_request' },
  ])
})


test('client CRM rejects invalid CPF before database execution', () => {
  assert.equal(validCpf('111.222.333-04'), false)
  const result = parseSofiaClientAction({ ...identity, action: 'create_client', data: { name: 'Teste', phone: '21999999999', document: '111.222.333-04' } })
  assert.equal(result.ok, false)
})
test('client CRM accepts only scoped owner input and requires a client id for archive', () => {
  assert.equal(parseSofiaClientAction({ ...identity, action: 'create_client', data: { name: 'Teste', phone: '21999999999', document: '52998224725' } }).ok, true)
  assert.equal(parseSofiaClientAction({ ...identity, centralRole: 'god_admin', action: 'list_clients' }).ok, false)
  assert.equal(parseSofiaClientAction({ ...identity, action: 'archive_client', data: {} }).ok, false)
})
