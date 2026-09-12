import test from 'node:test'
import assert from 'node:assert/strict'
import { parseSofiaDomainAction } from '../sofia-actions'

const trusted = {
  centralContactId: '11111111-1111-4111-8111-111111111111',
  centralClientId: '22222222-2222-4222-8222-222222222222',
  centralHubId: '33333333-3333-4333-8333-333333333333',
  centralRole: 'hub_owner',
  senderPhone: '+5521990000000',
}

test('accepts a bounded stock query for EPI', () => {
  const result = parseSofiaDomainAction({ ...trusted, action: 'list_stock', data: { query: 'EPI' } })
  assert.equal(result.ok, true)
})

test('accepts a positive financial income with bounded data', () => {
  const result = parseSofiaDomainAction({ ...trusted, action: 'create_financial_entry', data: { type: 'RECEITA', amount: '5000.00', description: '[TESTE SOFIA] Entrada de validação', category: 'SERVICOS', status: 'EFETIVADO' } })
  assert.equal(result.ok, true)
})

test('rejects an invalid financial amount', () => {
  const result = parseSofiaDomainAction({ ...trusted, action: 'create_financial_entry', data: { type: 'RECEITA', amount: '-1', description: 'inválido' } })
  assert.equal(result.ok, false)
})

test('requires a vehicle id to archive a vehicle', () => {
  const result = parseSofiaDomainAction({ ...trusted, action: 'archive_vehicle', data: {} })
  assert.equal(result.ok, false)
})
