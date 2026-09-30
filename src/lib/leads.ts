export const LEAD_STATUSES = {
  NEW: 'NEW',
  QUOTING: 'QUOTING',
  APPROVED: 'APPROVED',
  LOST: 'LOST',
  CONVERTED: 'CONVERTED',
} as const

export type LeadStatus = typeof LEAD_STATUSES[keyof typeof LEAD_STATUSES]

const transitions: Record<LeadStatus, LeadStatus[]> = {
  NEW: [LEAD_STATUSES.QUOTING, LEAD_STATUSES.LOST],
  QUOTING: [LEAD_STATUSES.APPROVED, LEAD_STATUSES.LOST],
  APPROVED: [LEAD_STATUSES.CONVERTED],
  LOST: [],
  CONVERTED: [],
}

export function normalizeLeadPhone(value: unknown): string {
  return typeof value === 'string' ? value.replace(/\D/g, '') : ''
}

export function normalizeLeadDocument(value: unknown): string | null {
  const normalized = typeof value === 'string' ? value.replace(/\D/g, '') : ''
  return normalized || null
}

export function validateLeadInput(input: { name?: unknown; phone?: unknown }) {
  const name = typeof input.name === 'string' ? input.name.trim().replace(/\s+/g, ' ').slice(0, 160) : ''
  const phone = normalizeLeadPhone(input.phone)
  if (!name) return { ok: false as const, error: 'Nome é obrigatório.' }
  if (phone.length < 10 || phone.length > 15) return { ok: false as const, error: 'Telefone válido é obrigatório.' }
  return { ok: true as const, value: { name, phone } }
}

export function canTransitionLead(from: string, to: string): boolean {
  return (transitions[from as LeadStatus] || []).includes(to as LeadStatus)
}

export function leadConversionPayload(lead: { name: string; phone: string; normalizedPhone: string; document?: string | null; email?: string | null; source?: string | null }) {
  return {
    name: lead.name,
    phone: lead.phone,
    normalizedPhone: lead.normalizedPhone,
    document: lead.document || null,
    email: lead.email || null,
    source: lead.source || 'LEAD_CONVERSION',
  }
}
