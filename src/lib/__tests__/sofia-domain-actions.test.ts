import test from 'node:test'
import assert from 'node:assert/strict'
import { parseSofiaDomainAction } from '../sofia-actions'

const trusted = {
  centralContactId: '11111111-1111-4111-8111-111111111111',
  centralClientId: '22222222-2222-4222-8222-222222222222',
  centralHubId: '33333333-3333-4333-8333-333333333333',
  centralRole: 'hub_owner',
  senderPhone: '+5521999104605',
}

test('parses only closed inventory, financial and fleet domain actions', () => {
  assert.equal(parseSofiaDomainAction({ action: 'list_stock', data: { query: 'EPI' }, ...trusted }).ok, true)
  assert.equal(parseSofiaDomainAction({ action: 'adjust_stock', data: { itemId: '44444444-4444-4444-8444-444444444444', quantity: '2', direction: 'ENTRADA' }, ...trusted }).ok, true)
  assert.equal(parseSofiaDomainAction({ action: 'create_financial_entry', data: { type: 'RECEITA', amount: '5000', description: 'Entrada teste', category: 'Teste', status: 'EFETIVADO' }, ...trusted }).ok, true)
  assert.equal(parseSofiaDomainAction({ action: 'archive_vehicle', data: { vehicleId: '55555555-5555-4555-8555-555555555555' }, ...trusted }).ok, true)
  assert.equal(parseSofiaDomainAction({ action: 'archive_vehicle', data: { vehicleName: '[TESTE SOFIA] Caminhão Vacol' }, ...trusted }).ok, true)
  assert.equal(parseSofiaDomainAction({ action: 'archive_vehicle', data: { vehicleId: '55555555-5555-4555-8555-555555555555', vehicleName: 'duplicado' }, ...trusted }).ok, false)
  assert.equal(parseSofiaDomainAction({ action: 'create_financial_entry', data: { type: 'DROP TABLE', amount: '5000' }, ...trusted }).ok, false)
})
