export type FinancialEntryForSummary = Readonly<{
  tipo: string
  status: string
  valor: string | number
  data: string | Date
}>

export type FinancialPeriod = Readonly<{
  month: number
  year: number
  annual?: boolean
  now?: Date
}>

export function summarizeFinancialEntries(entries: readonly FinancialEntryForSummary[], period: FinancialPeriod) {
  const now = period.now ?? new Date()
  const inPeriod = entries.filter((entry) => {
    const date = new Date(entry.data)
    return !Number.isNaN(date.getTime()) && date.getUTCFullYear() === period.year && (period.annual || date.getUTCMonth() + 1 === period.month)
  })

  const sum = (predicate: (entry: FinancialEntryForSummary) => boolean) => inPeriod
    .filter(predicate)
    .reduce((total, entry) => total + (Number.isFinite(Number(entry.valor)) ? Number(entry.valor) : 0), 0)

  const receivedRevenue = sum((entry) => entry.tipo === 'RECEITA' && entry.status === 'EFETIVADO')
  const effectiveExpenses = sum((entry) => entry.tipo === 'DESPESA' && entry.status === 'EFETIVADO')
  const receivable = sum((entry) => entry.tipo === 'RECEITA' && (entry.status === 'PENDENTE' || entry.status === 'ATRASADO'))
  const payable = sum((entry) => entry.tipo === 'DESPESA' && entry.status === 'PENDENTE')
  const overdueReceivable = sum((entry) => entry.tipo === 'RECEITA' && (entry.status === 'ATRASADO' || (entry.status === 'PENDENTE' && new Date(entry.data) < now)))
  const cashBalance = receivedRevenue - effectiveExpenses

  return {
    receivedRevenue,
    effectiveExpenses,
    cashBalance,
    receivable,
    payable,
    overdueReceivable,
    forecast: cashBalance + receivable - payable,
  }
}
