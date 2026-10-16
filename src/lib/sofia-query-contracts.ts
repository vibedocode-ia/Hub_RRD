import { z } from 'zod'
import { isFinancialCalendarDate } from './validation/financeiro'

export const calendarDate = z.string().refine(isFinancialCalendarDate, 'Data ISO inválida.')
export const timeZone = z.string().max(80).refine(value => {
  try { new Intl.DateTimeFormat('en', { timeZone: value }).format(); return true } catch { return false }
}).default('America/Sao_Paulo')
export const positiveDecimal = z.union([z.string(), z.number()]).transform(String)
  .refine(value => /^\d+(?:[.,]\d{1,2})?$/.test(value) && Number.isFinite(Number(value.replace(',', '.'))) && Number(value.replace(',', '.')) > 0 && Number(value.replace(',', '.')) <= 10_000_000, 'Número decimal inválido.')
  .transform(value => value.replace(',', '.'))
const rangeFields = { date: calendarDate.optional(), startDate: calendarDate.optional(), endDate: calendarDate.optional(), timeZone }
const validRange = (data: { date?: string; startDate?: string; endDate?: string }) => !((data.date && (data.startDate || data.endDate)) || Boolean(data.startDate) !== Boolean(data.endDate) || (data.startDate && data.endDate && data.startDate > data.endDate))
export const financialQuerySchema = z.object({
  ...rangeFields,
  period: z.enum(['HOJE', 'SEMANA_ATUAL', 'MES_ATUAL', 'TODOS']).optional(),
  type: z.enum(['RECEITA', 'DESPESA']).optional(),
  status: z.enum(['PENDENTE', 'EFETIVADO', 'ATRASADO', 'CANCELADO']).optional(),
}).strict().refine(data => validRange(data) && !(data.period && (data.date || data.startDate)), 'Período ambíguo ou inválido.')
export const agendaQuerySchema = z.object({ ...rangeFields }).strict().refine(validRange, 'Intervalo inválido.')
export const stockQuerySchema = z.object({ query: z.string().trim().max(160).optional() }).strict()
const financeFields = {
  type: z.enum(['RECEITA', 'DESPESA']), amount: positiveDecimal,
  description: z.string().trim().min(2).max(300), category: z.string().trim().min(1).max(100).optional(),
  status: z.enum(['PENDENTE', 'EFETIVADO', 'ATRASADO', 'CANCELADO']).optional(), date: calendarDate.optional(),
}
export const financialCreateSchema = z.object(financeFields).strict()
export const financialUpdateSchema = z.object(financeFields).partial().extend({ entryId: z.string().uuid() }).strict().refine(data => Object.keys(data).some(key => key !== 'entryId'), 'Nenhum campo informado.')
export const stockAdjustmentSchema = z.object({ itemId: z.string().uuid(), quantity: positiveDecimal, direction: z.enum(['ENTRADA', 'SAIDA']) }).strict()
