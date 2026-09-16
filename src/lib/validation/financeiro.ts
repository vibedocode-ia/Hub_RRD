import { z } from 'zod'

const amount = z.union([z.string(), z.number()])
  .transform((value) => typeof value === 'string' ? Number(value.replace(',', '.')) : value)
  .pipe(z.number().finite().positive().max(99_999_999.99))

export function isFinancialCalendarDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  return date.getUTCFullYear() === year && date.getUTCMonth() + 1 === month && date.getUTCDate() === day
}

const dateValue = z.string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Informe a data no formato AAAA-MM-DD.')
  .refine(isFinancialCalendarDate, 'Data inválida.')

const optionalUuid = z.string().uuid().nullable().optional()

export const FINANCIAL_ENTRY_TYPES = ['RECEITA', 'DESPESA'] as const
export const FINANCIAL_ENTRY_STATUSES = ['PENDENTE', 'EFETIVADO', 'ATRASADO', 'CANCELADO'] as const

export const FinancialEntrySchema = z.object({
  tipo: z.enum(FINANCIAL_ENTRY_TYPES),
  descricao: z.string().trim().min(2).max(300),
  valor: amount,
  data: dateValue.optional().default(() => new Date().toISOString().slice(0, 10)),
  categoria: z.string().trim().min(1).max(100).nullable().optional(),
  status: z.enum(FINANCIAL_ENTRY_STATUSES).default('EFETIVADO'),
  clientId: optionalUuid,
}).strict()

export type FinancialEntryInput = z.infer<typeof FinancialEntrySchema>
