import { agendaQuerySchema, financialQuerySchema } from './sofia-query-contracts'
import { financialCents as cents, financialMoney as money } from './financial-money'

type AgendaRequest = { id: string; scheduledAt: string | Date | null; archivedAt: string | Date | null }
type AgendaEvent = { id: string; startsAt: string | Date; endsAt: string | Date; status: string; serviceRequestArchivedAt?: string | Date | null }
export function agendaReadResult<R extends AgendaRequest, E extends AgendaEvent>(requests: readonly R[], events: readonly E[], input: Record<string, unknown>, now = new Date()) {
  const data = agendaQuerySchema.parse(input)
  const range = resolveQueryRange(data.date || data.startDate ? data : { ...data, period: 'HOJE' }, now)
  const start = Date.parse(range.start!), end = Date.parse(range.endExclusive!)
  const scheduledRequests = requests.filter(row => !row.archivedAt && row.scheduledAt && Date.parse(String(row.scheduledAt)) >= start && Date.parse(String(row.scheduledAt)) < end)
    .sort((a, b) => new Date(a.scheduledAt!).getTime() - new Date(b.scheduledAt!).getTime() || a.id.localeCompare(b.id))
  const localEvents = events.filter(row => row.status !== 'ARCHIVED' && !row.serviceRequestArchivedAt && new Date(row.startsAt).getTime() < end && new Date(row.endsAt).getTime() > start)
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime() || a.id.localeCompare(b.id))
  const limit = 100
  const coverage = (totalMatching: number) => ({ totalMatching, returned: Math.min(totalMatching, limit), limit, hasMore: totalMatching > limit })
  return { scheduledRequests: scheduledRequests.slice(0, limit), events: localEvents.slice(0, limit), range,
    sources: { scheduledRequests: 'service_requests.scheduled_at', events: 'agenda_events', relationship: 'SEPARATE_SOURCES_NOT_ADDITIVE' },
    coverage: { scheduledRequests: coverage(scheduledRequests.length), events: coverage(localEvents.length) } }
}

export type QueryDates = { date?: string; startDate?: string; endDate?: string; period?: 'HOJE' | 'SEMANA_ATUAL' | 'MES_ATUAL' | 'TODOS'; timeZone?: string }
const addDays = (date: string, days: number) => new Date(Date.parse(`${date}T12:00:00Z`) + days * 86400000).toISOString().slice(0, 10)
function localDate(now: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now)
  const part = (key: string) => parts.find(p => p.type === key)!.value
  return `${part('year')}-${part('month')}-${part('day')}`
}
function midnight(date: string, timeZone: string) {
  const target = Date.parse(`${date}T00:00:00Z`)
  let instant = target
  for (let i = 0; i < 5; i++) {
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(instant))
    const p = (key: string) => Number(parts.find(part => part.type === key)!.value)
    const represented = Date.UTC(p('year'), p('month') - 1, p('day'), p('hour'), p('minute'), p('second'))
    const delta = target - represented
    if (!delta) return new Date(instant).toISOString()
    instant += delta
  }
  throw new Error('O fuso não possui meia-noite inequívoca nesta data.')
}
/** Calendar dates are inclusive; the serialized instant range is [start, endExclusive). */
export function resolveQueryRange(input: QueryDates, now = new Date()) {
  const data = financialQuerySchema.parse(input)
  const zone = data.timeZone
  const referenceDate = data.date || localDate(now, zone)
  let startDate = data.date || data.startDate
  let endDate = data.date || data.endDate
  if (!startDate && data.period && data.period !== 'TODOS') {
    startDate = referenceDate
    if (data.period === 'SEMANA_ATUAL') startDate = addDays(referenceDate, -((new Date(`${referenceDate}T12:00:00Z`).getUTCDay() + 6) % 7))
    if (data.period === 'MES_ATUAL') startDate = `${referenceDate.slice(0, 7)}-01`
    endDate = data.period === 'HOJE' ? startDate : data.period === 'SEMANA_ATUAL' ? addDays(startDate, 6) : addDays(new Date(Date.UTC(Number(startDate.slice(0, 4)), Number(startDate.slice(5, 7)), 1, 12)).toISOString().slice(0, 10), -1)
  }
  return { start: startDate ? midnight(startDate, zone) : null, endExclusive: endDate ? midnight(addDays(endDate, 1), zone) : null, timeZone: zone, referenceDate }
}

type FinancialRow = { id: string; tipo: string; status: string; valor: string | number; data: string | Date }
/** Receives the whole source, never a pre-limited sample. One matched set drives list and summary. */
export function financialReadResult<T extends FinancialRow>(source: readonly T[], input: Record<string, unknown>, now = new Date()) {
  const data = financialQuerySchema.parse(input)
  const { type, status, ...dates } = data
  const range = resolveQueryRange(dates, now)
  const rows = source.filter(row => {
    const instant = new Date(row.data).getTime()
    if (!Number.isFinite(instant)) throw new Error('Data financeira inválida na fonte.')
    return (!type || row.tipo === type) && (!status || row.status === status) && (!range.start || instant >= Date.parse(range.start)) && (!range.endExclusive || instant < Date.parse(range.endExclusive))
  }).sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime() || a.id.localeCompare(b.id))
  let revenue = BigInt(0), expenses = BigInt(0), receivable = BigInt(0), payable = BigInt(0), overdueReceivable = BigInt(0)
  for (const row of rows) {
    const value = cents(row.valor)
    if (!['RECEITA', 'DESPESA'].includes(row.tipo) || !['PENDENTE', 'EFETIVADO', 'ATRASADO', 'CANCELADO'].includes(row.status)) throw new Error('Tipo/status financeiro inválido na fonte.')
    if (row.status === 'EFETIVADO') { if (row.tipo === 'RECEITA') revenue += value; else expenses += value }
    if (['PENDENTE', 'ATRASADO'].includes(row.status)) { if (row.tipo === 'RECEITA') receivable += value; else payable += value }
    if (row.tipo === 'RECEITA' && row.status === 'ATRASADO') overdueReceivable += value
  }
  const limit = 100
  return {
    entries: rows.slice(0, limit),
    summary: { revenue: money(revenue), expenses: money(expenses), receivable: money(receivable), payable: money(payable), cash: money(revenue - expenses), overdueReceivable: money(overdueReceivable), forecast: money(revenue - expenses + receivable - payable) },
    filters: { ...data, period: data.period || (data.date || data.startDate ? null : 'TODOS'), ...range },
    coverage: { totalMatching: rows.length, returned: Math.min(limit, rows.length), limit, hasMore: rows.length > limit, summaryScope: 'ALL_MATCHING_ENTRIES' as const },
    dateSemantics: { dateField: 'data', meaning: 'LAUNCH_DATE', dueDateAvailable: false, overdueBasis: 'EXPLICIT_ATRASADO_STATUS_ONLY' },
  }
}
