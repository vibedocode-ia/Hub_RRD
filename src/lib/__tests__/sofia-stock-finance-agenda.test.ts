import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { summarizeFinancialEntries } from '../financial-summary'

test('route wires complete financial read and agenda separately from generic service requests', () => {
  const route = readFileSync('src/app/api/sofia/actions/route.ts', 'utf8')
  const financial = route.slice(route.indexOf("if (action === 'list_financial_entries'"), route.indexOf("if (action === 'list_teams')"))
  assert.match(financial, /financialReadResult\(rows, data/)
  assert.doesNotMatch(financial, /\.limit\(/)
  assert.match(route, /if \(action === 'list_agenda'\)/)
  assert.match(route, /agendaReadResult\(/)
  const requests = route.slice(route.indexOf("if (action === 'list_service_requests')"), route.indexOf("if (action === 'list_documents')"))
  assert.match(requests, /isNull\(serviceRequests.archivedAt\)/)
})

test('shared summary sums decimal cents without floating drift', () => {
  const result = summarizeFinancialEntries([
    { tipo: 'RECEITA', status: 'EFETIVADO', valor: '0.10', data: '2026-09-01' },
    { tipo: 'RECEITA', status: 'EFETIVADO', valor: '0.20', data: '2026-09-01' },
  ], { month: 9, year: 2026 })
  assert.equal(result.receivedRevenue, 0.3)
})

test('shared financial summary never invents due dates and includes explicitly overdue payables', () => {
  const result = summarizeFinancialEntries([
    { tipo: 'RECEITA', status: 'PENDENTE', valor: '10', data: '2026-09-01' },
    { tipo: 'DESPESA', status: 'ATRASADO', valor: '12.34', data: '2026-09-01' },
  ], { month: 9, year: 2026, now: new Date('2026-09-30') })
  assert.equal(result.overdueReceivable, 0)
  assert.equal(result.payable, 12.34)
})
import { parseSofiaDomainAction, safeStockSummary } from '../sofia-actions'
import * as queries from '../sofia-operational-queries'

test('financial results filter entire data set and total cents deterministically beyond old caps', () => {
  const rows = Array.from({ length: 601 }, (_, i) => ({ id: String(i), tipo: 'RECEITA', status: 'PENDENTE', valor: '0.10', data: new Date('2026-09-01T12:00:00Z') }))
  const excluded = [{ id: 'outside', tipo: 'RECEITA', status: 'PENDENTE', valor: '999', data: new Date('2026-08-01T12:00:00Z') }, { id: 'expense', tipo: 'DESPESA', status: 'ATRASADO', valor: '12.34', data: new Date('2026-09-01T12:00:00Z') }]
  const result = queries.financialReadResult([...rows, ...excluded], { period: 'MES_ATUAL', type: 'RECEITA', status: 'PENDENTE' }, new Date('2026-09-16T12:00:00Z'))
  assert.equal(result.summary.receivable, 60.1)
  assert.equal(result.summary.overdueReceivable, 0)
  assert.equal(result.coverage.totalMatching, 601)
  assert.equal(result.coverage.returned, 100)
  assert.equal(result.coverage.hasMore, true)
  assert.equal(result.coverage.summaryScope, 'ALL_MATCHING_ENTRIES')
  assert.equal(result.dateSemantics.dueDateAvailable, false)
  assert.deepEqual(result, queries.financialReadResult([...rows, ...excluded].reverse(), { period: 'MES_ATUAL', type: 'RECEITA', status: 'PENDENTE' }, new Date('2026-09-16T12:00:00Z')))
  const payable = queries.financialReadResult(excluded, { type: 'DESPESA' }).summary
  assert.equal(payable.payable, 12.34)
})

test('calendar intervals are ISO, timezone aware, half-open and use Monday weeks', () => {
  assert.deepEqual(queries.resolveQueryRange({ date: '2026-09-01', timeZone: 'America/Sao_Paulo' }), { start: '2026-09-01T03:00:00.000Z', endExclusive: '2026-09-02T03:00:00.000Z', timeZone: 'America/Sao_Paulo', referenceDate: '2026-09-01' })
  const today = queries.resolveQueryRange({ period: 'HOJE', timeZone: 'America/Sao_Paulo' }, new Date('2026-09-02T01:00:00Z'))
  assert.equal(today.referenceDate, '2026-09-01')
  assert.equal(today.endExclusive, '2026-09-02T03:00:00.000Z')
  assert.equal(queries.resolveQueryRange({ period: 'SEMANA_ATUAL' }, new Date('2026-09-06T12:00:00Z')).start, '2026-08-31T03:00:00.000Z')
  const dst = queries.resolveQueryRange({ date: '2026-03-08', timeZone: 'America/New_York' })
  assert.equal(dst.start, '2026-03-08T05:00:00.000Z')
  assert.equal(dst.endExclusive, '2026-03-09T04:00:00.000Z')
})

const trusted = { centralContactId: '11111111-1111-4111-8111-111111111111', centralClientId: '22222222-2222-4222-8222-222222222222', centralHubId: '33333333-3333-4333-8333-333333333333', centralRole: 'hub_owner', senderPhone: '+5521999999999' }
const parse = (action: string, data: unknown) => parseSofiaDomainAction({ ...trusted, action, data })

test('agenda contract and result select scheduled calls plus overlapping events, never archived or unscheduled', () => {
  assert.equal(parse('list_agenda', { date: '2026-09-01', timeZone: 'America/Sao_Paulo' }).ok, true)
  for (const data of [{ date: '01/09/2026' }, { startDate: '2026-09-02', endDate: '2026-09-01' }, { date: '2026-09-01', status: 'IGNORED' }, { startDate: '2026-09-01' }]) assert.equal(parse('list_agenda', data).ok, false)
  const requests = [
    { id: 'yes', scheduledAt: '2026-09-01T03:00:00Z', archivedAt: null },
    { id: 'no-date', scheduledAt: null, archivedAt: null },
    { id: 'end', scheduledAt: '2026-09-02T03:00:00Z', archivedAt: null },
    { id: 'archived', scheduledAt: '2026-09-01T12:00:00Z', archivedAt: '2026-09-01' },
  ]
  const events = [
    { id: 'overlap', startsAt: '2026-08-31T12:00:00Z', endsAt: '2026-09-01T04:00:00Z', status: 'SCHEDULED' },
    { id: 'archived', startsAt: '2026-09-01T12:00:00Z', endsAt: '2026-09-01T13:00:00Z', status: 'ARCHIVED' },
    { id: 'linked-archived', startsAt: '2026-09-01T12:00:00Z', endsAt: '2026-09-01T13:00:00Z', status: 'SCHEDULED', serviceRequestArchivedAt: '2026-09-01' },
  ]
  const result = queries.agendaReadResult(requests, events, { date: '2026-09-01' })
  assert.deepEqual(result.scheduledRequests.map(row => row.id), ['yes'])
  assert.deepEqual(result.events.map(row => row.id), ['overlap'])
  assert.equal(result.range.timeZone, 'America/Sao_Paulo')
  assert.equal(result.coverage.scheduledRequests.totalMatching, 1)
  assert.equal(result.sources.scheduledRequests, 'service_requests.scheduled_at')
  assert.equal(result.sources.events, 'agenda_events')
})

test('finance and stock contracts reject unknown fields, malformed data and lossy numbers', () => {
  for (const action of ['list_stock', 'list_financial_entries', 'get_financial_summary']) {
    assert.equal(parse(action, { typoFilter: 'ignored?' }).ok, false)
    assert.equal(parse(action, []).ok, false)
  }
  for (const data of [{ type: 'BOGUS' }, { status: 'BOGUS' }, { period: 'MES_ATUAL', date: '2026-09-01' }, { date: '2026-02-31' }, { timeZone: 'invalid/zone' }]) assert.equal(parse('list_financial_entries', data).ok, false)
  assert.equal(parse('list_financial_entries', { type: 'RECEITA', status: 'PENDENTE', date: '2026-09-01', timeZone: 'America/Sao_Paulo' }).ok, true)
  assert.equal(parse('list_stock', { query: 'x'.repeat(161) }).ok, false)
  for (const amount of ['1e3', '0x10', '1.234', 'Infinity', '', true, 0.001]) assert.equal(parse('create_financial_entry', { type: 'RECEITA', amount, description: 'Teste' }).ok, false)
  assert.equal(parse('create_financial_entry', { type: 'RECEITA', amount: 12.34, description: 'Teste' }).ok, true)
  assert.equal(parse('update_financial_entry', { entryId: trusted.centralHubId, description: '' }).ok, false)
})

test('stock exposes minimum and distinguishes equal, above and invalid numbers', () => {
  const item = { id: '1', nome: 'Luvas', categoria: 'EPI', quantidade: '5.00', unidade: 'par', nivelCritico: '5.00' }
  assert.deepEqual(safeStockSummary(item), { id: '1', name: 'Luvas', category: 'EPI', quantity: '5.00', unit: 'par', minimumQuantity: '5.00', stockState: 'AT_OR_BELOW_MINIMUM', lowStock: true })
  assert.equal(safeStockSummary({ ...item, quantidade: '6' }).stockState, 'ABOVE_MINIMUM')
  for (const nivelCritico of ['', 'NaN', 'Infinity', '-1']) {
    const result = safeStockSummary({ ...item, nivelCritico })
    assert.equal(result.stockState, 'UNKNOWN')
    assert.equal(result.lowStock, null)
    assert.equal(result.minimumQuantity, null)
  }
})
