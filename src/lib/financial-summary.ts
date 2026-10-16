import { financialCents, financialMoney } from './financial-money'

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
  const inPeriod = entries.filter((entry) => {
    const date = new Date(entry.data)
    return !Number.isNaN(date.getTime()) && date.getUTCFullYear() === period.year && (period.annual || date.getUTCMonth() + 1 === period.month)
  })

  const sum = (predicate: (entry: FinancialEntryForSummary) => boolean) => inPeriod
    .filter(predicate)
    .reduce((total, entry) => total + financialCents(entry.valor), BigInt(0))

  const receivedRevenue = sum((entry) => entry.tipo === 'RECEITA' && entry.status === 'EFETIVADO')
  const effectiveExpenses = sum((entry) => entry.tipo === 'DESPESA' && entry.status === 'EFETIVADO')
  const receivable = sum((entry) => entry.tipo === 'RECEITA' && (entry.status === 'PENDENTE' || entry.status === 'ATRASADO'))
  const payable = sum((entry) => entry.tipo === 'DESPESA' && (entry.status === 'PENDENTE' || entry.status === 'ATRASADO'))
  // data is a launch date, not a due date. Only an explicit status proves overdue.
  const overdueReceivable = sum((entry) => entry.tipo === 'RECEITA' && entry.status === 'ATRASADO')
  const cashBalance = receivedRevenue - effectiveExpenses

  return {
    receivedRevenue: financialMoney(receivedRevenue),
    effectiveExpenses: financialMoney(effectiveExpenses),
    cashBalance: financialMoney(cashBalance),
    receivable: financialMoney(receivable),
    payable: financialMoney(payable),
    overdueReceivable: financialMoney(overdueReceivable),
    forecast: financialMoney(cashBalance + receivable - payable),
  }
}
