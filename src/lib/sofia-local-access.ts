export const SOFIA_LOCAL_PERMISSION = 'sofia.use' as const

export type RrdSofiaLocalAccess = Readonly<{
  phone: string
  isActive: boolean
  permissions: readonly string[]
}>

/** Canonicalizes a local RRD telephone; malformed values never authorize. */
export function normalizeRrdPhone(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const digits = value.replace(/\D/g, '')
  return /^\d{10,15}$/.test(digits) ? digits : null
}

/**
 * Local RRD authorization gate for Sofia operations. The Central transport has
 * already authenticated its request separately; this function never trusts a
 * role or Hub chosen in message text.
 */
export function canUseRrdSofia(person: RrdSofiaLocalAccess | null | undefined, senderPhone: unknown): boolean {
  const sender = normalizeRrdPhone(senderPhone)
  const personPhone = normalizeRrdPhone(person?.phone)
  return Boolean(
    sender &&
    personPhone &&
    sender === personPhone &&
    person?.isActive &&
    person.permissions.includes(SOFIA_LOCAL_PERMISSION),
  )
}
