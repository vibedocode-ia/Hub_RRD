import test from 'node:test'
import assert from 'node:assert/strict'
import * as schema from '../../db/schema'
import { PgDialect } from 'drizzle-orm/pg-core'
const { harness, nr } = require('../../security-tests/harness.cjs')

const identity = { centralContactId: '11111111-1111-4111-8111-111111111111', centralClientId: '22222222-2222-4222-8222-222222222222', centralHubId: '33333333-3333-4333-8333-333333333333', centralRole: 'hub_owner', senderPhone: '+5521999999999' }
function setup(financial: unknown[] = [], requests: unknown[] = [], events: unknown[] = []) {
  const seen: Array<{ table: unknown; predicate?: string; limit?: number }> = []
  const source = new Map<unknown, unknown[]>([[schema.users, [{ phone: '5521999999999', isActive: true }]], [schema.financeiroLancamentos, financial], [schema.serviceRequests, requests], [schema.agendaEvents, events], [schema.insumos, [{ id: 'stock', nome: 'Luvas', categoria: 'EPI', quantidade: '2', nivelCritico: '2', unidade: 'par' }]]])
  const db = {
    select() {
      let rows: unknown[] = [], selection: (typeof seen)[number]
      const q: any = {
        from(table: unknown) { assert.ok(source.has(table), 'unexpected read'); rows = source.get(table)!; selection = { table }; seen.push(selection); return q },
        innerJoin() { return q }, leftJoin() { return q }, orderBy() { return q },
        where(predicate: any) { if (predicate) selection.predicate = new PgDialect().sqlToQuery(predicate).sql; return q },
        limit(n: number) { selection.limit = n; rows = rows.slice(0, n); return q },
        then(resolve: any, reject: any) { return Promise.resolve(rows).then(resolve, reject) },
      }
      return q
    },
    insert() { assert.fail('read action attempted INSERT') }, update() { assert.fail('read action attempted UPDATE') }, delete() { assert.fail('read action attempted DELETE') },
  }
  const load = harness({ 'next/server': nr, '@/db': { ...schema, db }, '@/lib/sofia-issue-draft': {}, '@/lib/official-document-lifecycle': {}, '@/lib/sofia-document-template': {} }, { SOFIA_HUB_SECRET: 'test-secret-only', RRD_HUB_ID: identity.centralHubId })
  const route = load('src/app/api/sofia/actions/route.ts')
  const call = (action: string, data: unknown) => route.POST({ headers: new Headers({ authorization: 'Bearer test-secret-only', 'idempotency-key': 'synthetic-query-test' }), json: async () => ({ ...identity, action, data }) })
  return { call, seen }
}

test('real POST finance list and summary share exact filtered total beyond both former caps without writes', async () => {
  const rows = Array.from({ length: 601 }, (_, i) => ({ id: String(i), tipo: 'RECEITA', status: 'PENDENTE', valor: '0.10', data: new Date('2026-09-01T12:00:00Z') }))
  const s = setup(rows)
  const filter = { startDate: '2026-09-01', endDate: '2026-09-30', type: 'RECEITA', status: 'PENDENTE' }
  const list = await s.call('list_financial_entries', filter)
  const summary = await s.call('get_financial_summary', filter)
  assert.equal(list.status, 200)
  assert.equal(summary.status, 200)
  assert.equal(list.body.entries.length, 100)
  assert.equal(list.body.coverage.totalMatching, 601)
  assert.equal(list.body.coverage.hasMore, true)
  assert.deepEqual(list.body.summary, summary.body.summary)
  assert.equal(summary.body.summary.receivable, 60.1)
  assert.equal(summary.body.coverage.returned, 0)
  assert.equal(list.body.entries[0].dueDate, null)
  assert.equal(list.body.dateSemantics.meaning, 'LAUNCH_DATE')
  assert.ok(s.seen.filter(read => read.table === schema.financeiroLancamentos).every(read => read.limit === undefined))
})

test('real POST agenda reads two sources with interval/archive SQL predicates and no write or replay path', async () => {
  const s = setup([], [{ id: 'scheduled', scheduledAt: '2026-09-01T12:00:00Z', archivedAt: null }, { id: 'archived', scheduledAt: '2026-09-01T12:00:00Z', archivedAt: '2026-08-01' }], [{ id: 'event', startsAt: '2026-09-01T12:00:00Z', endsAt: '2026-09-01T13:00:00Z', status: 'SCHEDULED' }])
  const result = await s.call('list_agenda', { date: '2026-09-01' })
  assert.equal(result.status, 200)
  assert.deepEqual(result.body.scheduledRequests.map((row: any) => row.id), ['scheduled'])
  assert.deepEqual(result.body.events.map((row: any) => row.id), ['event'])
  const requestSql = s.seen.find(read => read.table === schema.serviceRequests)!.predicate!
  const eventSql = s.seen.find(read => read.table === schema.agendaEvents)!.predicate!
  assert.match(requestSql, /"archived_at" is null/)
  assert.match(requestSql, /"scheduled_at" >=/)
  assert.match(requestSql, /"scheduled_at" </)
  assert.match(eventSql, /"archived_at" is null/)
  assert.match(eventSql, /"starts_at" </)
  assert.match(eventSql, /"ends_at" >/)
})

test('real POST stock exposes minimum and equality while invalid finance/agenda filters fail before domain reads', async () => {
  const s = setup()
  const stock = await s.call('list_stock', {})
  assert.equal(stock.status, 200)
  assert.equal(stock.body.items[0].minimumQuantity, '2')
  assert.equal(stock.body.items[0].lowStock, true)
  for (const action of ['list_stock', 'list_financial_entries', 'get_financial_summary', 'list_agenda']) {
    const before = s.seen.length
    const invalid = await s.call(action, { unsupportedFilter: 'must-not-ignore' })
    assert.equal(invalid.status, 422)
    assert.equal(s.seen.length - before, 1, 'only local permission gate may read')
  }
})
