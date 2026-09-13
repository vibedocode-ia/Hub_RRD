import { NextResponse } from 'next/server'
import { db, clients, serviceRequests, sofiaEvents, REQUEST_STATUS, SOFIA_EVENT_STATUS, insumos, financeiroLancamentos, teams } from '@/db'
import { count, eq, lte } from 'drizzle-orm'
import { getSessionUser } from '@/lib/auth'

const money = (value: unknown) => Number(value || 0)
const monthKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
const monthLabel = (date: Date) => date.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')

export async function GET() {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  if (!db) return NextResponse.json({ error: 'Banco indisponível' }, { status: 503 })

  try {
    const [c] = await db.select({ val: count() }).from(clients)
    const [r] = await db.select({ val: count() }).from(serviceRequests).where(eq(serviceRequests.status, REQUEST_STATUS.PENDING_REVIEW))
    const [s] = await db.select({ val: count() }).from(sofiaEvents).where(eq(sofiaEvents.status, SOFIA_EVENT_STATUS.PENDING_REVIEW))
    const [entries, alertasEstoque, equipesAtivas] = await Promise.all([
      db.select({ tipo: financeiroLancamentos.tipo, valor: financeiroLancamentos.valor, status: financeiroLancamentos.status, data: financeiroLancamentos.data }).from(financeiroLancamentos),
      db.select().from(insumos).where(lte(insumos.quantidade, insumos.nivelCritico)).limit(5),
      db.select().from(teams).where(eq(teams.isActive, true)).limit(5),
    ])

    const current = new Date()
    const timeline = Array.from({ length: 4 }, (_, offset) => new Date(current.getFullYear(), current.getMonth() - (3 - offset), 1))
    const buckets = new Map(timeline.map(date => [monthKey(date), { label: monthLabel(date), revenue: 0, expenses: 0, forecast: 0 }]))
    for (const entry of entries) {
      if (!entry.data) continue
      const bucket = buckets.get(monthKey(new Date(entry.data)))
      if (!bucket) continue
      if (entry.tipo === 'RECEITA') {
        if (entry.status === 'EFETIVADO') bucket.revenue += money(entry.valor)
        else if (entry.status === 'PENDENTE') bucket.forecast += money(entry.valor)
      }
      if (entry.tipo === 'DESPESA' && entry.status === 'EFETIVADO') bucket.expenses += money(entry.valor)
    }
    const financialGrowth = Array.from(buckets.values())
    const previous = financialGrowth[financialGrowth.length - 2] ?? { revenue: 0 }
    const currentMonth = financialGrowth[financialGrowth.length - 1] ?? { revenue: 0, forecast: 0, expenses: 0 }
    const totals = entries.reduce((acc, entry) => {
      if (entry.status !== 'EFETIVADO') return acc
      if (entry.tipo === 'RECEITA') acc.faturamentoTotal += money(entry.valor)
      if (entry.tipo === 'DESPESA') acc.gastosTotais += money(entry.valor)
      return acc
    }, { faturamentoTotal: 0, gastosTotais: 0 })

    return NextResponse.json({
      metrics: {
        clientsCount: c?.val || 0,
        pendingRequestsCount: r?.val || 0,
        sofiaDraftsCount: s?.val || 0,
        ...totals,
        previousMonthRevenue: previous.revenue,
        currentMonthRevenue: currentMonth.revenue,
        currentMonthForecast: currentMonth.forecast,
        currentMonthExpenses: currentMonth.expenses,
      },
      financialGrowth,
      alertasEstoque,
      equipesAtivas,
    })
  } catch (e) {
    console.error('Erro na API BI:', e)
    return NextResponse.json({ error: 'Falha interna' }, { status: 500 })
  }
}
