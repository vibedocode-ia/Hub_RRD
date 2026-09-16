import test from 'node:test'
import assert from 'node:assert/strict'
import { summarizeFinancialEntries } from '../financial-summary'

const entries = [
  { tipo: 'RECEITA', status: 'EFETIVADO', valor: '1000.00', data: '2026-09-10T12:00:00.000Z' },
  { tipo: 'RECEITA', status: 'PENDENTE', valor: '250.00', data: '2026-09-15T12:00:00.000Z' },
  { tipo: 'DESPESA', status: 'EFETIVADO', valor: '400.00', data: '2026-09-11T12:00:00.000Z' },
  { tipo: 'DESPESA', status: 'PENDENTE', valor: '100.00', data: '2026-09-20T12:00:00.000Z' },
  { tipo: 'RECEITA', status: 'ATRASADO', valor: '50.00', data: '2026-09-01T12:00:00.000Z' },
  { tipo: 'RECEITA', status: 'CANCELADO', valor: '9999.00', data: '2026-09-12T12:00:00.000Z' },
]

test('financial summary separates received cash from pending forecast', () => {
  assert.deepEqual(summarizeFinancialEntries(entries, { month: 9, year: 2026, now: new Date('2026-09-16T12:00:00.000Z') }), {
    receivedRevenue: 1000,
    effectiveExpenses: 400,
    cashBalance: 600,
    receivable: 300,
    payable: 100,
    overdueReceivable: 300,
    forecast: 800,
  })
})

test('financial summary ignores cancelled entries and entries outside the selected period', () => {
  assert.deepEqual(summarizeFinancialEntries([...entries, { tipo: 'RECEITA', status: 'EFETIVADO', valor: '500.00', data: '2026-10-01T12:00:00.000Z' }], { month: 9, year: 2026, now: new Date('2026-09-01T12:00:00.000Z') }).receivedRevenue, 1000)
})
