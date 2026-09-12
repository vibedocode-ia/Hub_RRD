export const CRM_RECURRENCES = ['SERVICO_AVULSO', 'CLIENTE_MENSAL', 'CONTRATO_FIXO', 'OUTRO'] as const
export const CRM_SOURCES = ['INDICACAO', 'GOOGLE_ADS', 'META_ADS', 'ORGANICO', 'WHATSAPP', 'PARCERIA', 'OUTRO'] as const
export type CrmRecurrence = typeof CRM_RECURRENCES[number]
export type CrmSource = typeof CRM_SOURCES[number]

type Input = Record<string, unknown>
type Financial = { tipo: string; status: string; valor: string | number; data: Date | string }
type Service = { code: string; serviceType: string; status: string; totalAmount: string | number | null; completedAt: Date | string | null; createdAt: Date | string }

const dateOrNull = (value: unknown, field: string): Date | null => {
  if (value === undefined || value === null || value === '') return null
  const parsed = new Date(`${String(value).slice(0, 10)}T12:00:00.000Z`)
  if (Number.isNaN(parsed.getTime())) throw new Error(`${field}_invalid`)
  return parsed
}
const enumOrNull = <T extends readonly string[]>(value: unknown, allowed: T, field: string): T[number] | null => {
  if (value === undefined || value === null || value === '') return null
  if (typeof value !== 'string' || !allowed.includes(value)) throw new Error(`${field}_invalid`)
  return value as T[number]
}
const amount = (value: string | number | null | undefined) => {
  const parsed = Number(value ?? 0)
  return Number.isFinite(parsed) ? parsed : 0
}
const byNewest = <T extends { data?: Date | string; completedAt?: Date | string | null; createdAt?: Date | string }>(rows: T[], key: keyof T) => [...rows].sort((a, b) => new Date(String(b[key] ?? 0)).getTime() - new Date(String(a[key] ?? 0)).getTime())

/** Validates only editable relationship attributes; authority, IDs and money are never accepted from this helper. */
export function normalizeCrmInput(raw: Input) {
  const recurrence = enumOrNull(raw.recurrence, CRM_RECURRENCES, 'recurrence')
  const source = enumOrNull(raw.source, CRM_SOURCES, 'source')
  return {
    ...(typeof raw.type === 'string' && raw.type.trim() ? { type: raw.type.trim().slice(0, 32) } : {}),
    ...(recurrence ? { recurrence } : {}),
    ...(source ? { source } : {}),
    ...(dateOrNull(raw.customerSince, 'customer_since') ? { customerSince: dateOrNull(raw.customerSince, 'customer_since')! } : {}),
    ...(dateOrNull(raw.lastContactAt, 'last_contact_at') ? { lastContactAt: dateOrNull(raw.lastContactAt, 'last_contact_at')! } : {}),
    ...(dateOrNull(raw.nextVisitAt, 'next_visit_at') ? { nextVisitAt: dateOrNull(raw.nextVisitAt, 'next_visit_at')! } : {}),
    ...(typeof raw.notes === 'string' ? { notes: raw.notes.trim().slice(0, 4000) } : {}),
  }
}

/** Pure derivation used by CRM and the authorized Sofia profile. Missing source records remain null/zero, never invented. */
export function buildCrmProfile(input: { client: Partial<{ recurrence: string | null; customerSince: Date | null; lastContactAt: Date | null; nextVisitAt: Date | null }>; services: Service[]; financial: Financial[] }) {
  const completed = input.services.filter(service => service.status === 'CONCLUIDO')
  const revenue = input.financial.filter(entry => entry.tipo === 'RECEITA')
  const paid = revenue.filter(entry => entry.status === 'EFETIVADO')
  const pending = revenue.filter(entry => entry.status === 'PENDENTE')
  const lastPayment = byNewest(paid, 'data')[0]
  const lastService = byNewest(completed, 'completedAt')[0]
  const totalPaid = paid.reduce((sum, entry) => sum + amount(entry.valor), 0)
  const pendingAmount = pending.reduce((sum, entry) => sum + amount(entry.valor), 0)
  return {
    recurrence: input.client.recurrence ?? null,
    customerSince: input.client.customerSince ?? null,
    lastContactAt: input.client.lastContactAt ?? null,
    nextVisitAt: input.client.nextVisitAt ?? null,
    serviceCount: completed.length,
    totalPaid,
    pendingAmount,
    lastPayment: lastPayment ? { amount: amount(lastPayment.valor), date: lastPayment.data } : null,
    lastService: lastService ? { code: lastService.code, serviceType: lastService.serviceType, amount: amount(lastService.totalAmount), completedAt: lastService.completedAt } : null,
    financialStatus: pendingAmount > 0 ? (paid.length ? 'ATENCAO' : 'PENDENTE') : paid.length ? 'EM_DIA' : 'SEM_HISTORICO',
  } as const
}
