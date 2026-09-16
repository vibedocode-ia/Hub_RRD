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
  assert.equal(parseSofiaDomainAction({ action: 'create_financial_entry', data: { type: 'RECEITA', amount: '5000', description: 'Entrada teste', category: 'Teste', status: 'EFETIVADO', date: '2026-02-31' }, ...trusted }).ok, false)
  assert.equal(parseSofiaDomainAction({ action: 'update_financial_entry', data: { entryId: '66666666-6666-4666-8666-666666666666', date: '2026-02-31' }, ...trusted }).ok, false)
})

test('owner-level operational catalog accepts only typed finance, team, vehicle, equipment, request and document actions', () => {
  assert.equal(parseSofiaDomainAction({ action: 'list_financial_entries', data: { period: 'MES_ATUAL' }, ...trusted }).ok, true)
  assert.equal(parseSofiaDomainAction({ action: 'get_financial_summary', data: { period: 'HOJE' }, ...trusted }).ok, true)
  assert.equal(parseSofiaDomainAction({ action: 'update_financial_entry', data: { entryId: '66666666-6666-4666-8666-666666666666', status: 'CANCELADO' }, ...trusted }).ok, true)
  assert.equal(parseSofiaDomainAction({ action: 'create_team', data: { name: 'Equipe Teste', leaderName: 'Responsável' }, ...trusted }).ok, true)
  assert.equal(parseSofiaDomainAction({ action: 'update_team', data: { teamId: '77777777-7777-4777-8777-777777777777', isActive: false }, ...trusted }).ok, true)
  assert.equal(parseSofiaDomainAction({ action: 'create_vehicle', data: { name: 'Veículo Teste', type: 'UTILITARIO' }, ...trusted }).ok, true)
  assert.equal(parseSofiaDomainAction({ action: 'update_vehicle', data: { vehicleId: '88888888-8888-4888-8888-888888888888', name: 'Veículo Atualizado' }, ...trusted }).ok, true)
  assert.equal(parseSofiaDomainAction({ action: 'list_equipment', data: {}, ...trusted }).ok, true)
  assert.equal(parseSofiaDomainAction({ action: 'create_equipment', data: { name: 'Equipamento Teste', code: 'EQ-001' }, ...trusted }).ok, true)
  assert.equal(parseSofiaDomainAction({ action: 'update_service_request', data: { requestId: '99999999-9999-4999-8999-999999999999', status: 'AGENDADO' }, ...trusted }).ok, true)
  assert.equal(parseSofiaDomainAction({ action: 'list_documents', data: { docType: 'ORCAMENTO' }, ...trusted }).ok, true)
  assert.equal(parseSofiaDomainAction({ action: 'archive_document', data: { documentId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' }, ...trusted }).ok, true)
  assert.equal(parseSofiaDomainAction({ action: 'create_equipment', data: { name: '' }, ...trusted }).ok, false)
  assert.equal(parseSofiaDomainAction({ action: 'update_team', data: { teamId: 'not-a-uuid', isActive: false }, ...trusted }).ok, false)
})

test('hub operator can use the closed operational catalog but cannot forge a role', () => {
  const operator = { ...trusted, centralRole: 'hub_operator' }
  assert.equal(parseSofiaDomainAction({ action: 'list_financial_entries', data: {}, ...operator }).ok, true)
  assert.equal(parseSofiaDomainAction({ action: 'list_equipment', data: {}, ...{ ...trusted, centralRole: 'hub_owner;DROP' } }).ok, false)
})
