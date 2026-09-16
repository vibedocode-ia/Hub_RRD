import test from 'node:test'
import assert from 'node:assert/strict'
import { FinancialEntrySchema } from '../validation/financeiro'

test('financial entry accepts only finite positive amounts and closed statuses', () => {
  const valid = FinancialEntrySchema.safeParse({ tipo: 'RECEITA', descricao: 'Recebimento de serviço', valor: '125.50', data: '2026-09-16', status: 'EFETIVADO' })
  assert.equal(valid.success, true)

  for (const valor of ['0', '-10', 'NaN', 'Infinity']) {
    assert.equal(FinancialEntrySchema.safeParse({ tipo: 'RECEITA', descricao: 'Teste válido', valor, data: '2026-09-16', status: 'EFETIVADO' }).success, false)
  }
  for (const data of ['2026-02-29', '2026-02-31', '2026-13-01']) {
    assert.equal(FinancialEntrySchema.safeParse({ tipo: 'RECEITA', descricao: 'Teste válido', valor: '10', data, status: 'EFETIVADO' }).success, false)
  }
  assert.equal(FinancialEntrySchema.safeParse({ tipo: 'DROP TABLE', descricao: 'Teste válido', valor: '10', data: '2026-09-16', status: 'EFETIVADO' }).success, false)
  assert.equal(FinancialEntrySchema.safeParse({ tipo: 'RECEITA', descricao: 'Teste válido', valor: '10', data: 'invalid-date', status: 'EFETIVADO' }).success, false)
})
