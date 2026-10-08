import { createHash, randomBytes } from 'crypto'
import { canChangePasswordFor, type LocalUserRole, type RrdPermission } from '@/lib/permissions'

/** Local administrators may only mint one-time recovery links for strictly lower roles. */
export const PASSWORD_RECOVERY_TTL_MINUTES = 15
export const RECOVERY_PATH = '/recuperar-acesso'

export interface RecoveryActor {
  id: string
  role: LocalUserRole
  permissions: readonly RrdPermission[]
}

export interface RecoveryTarget {
  id: string
  role: LocalUserRole
  isActive: boolean
}

export type RecoveryIssueReason = 'unauthenticated' | 'permission' | 'authority' | 'target'

export type RecoveryIssueDecision =
  | { ok: true }
  | { ok: false, status: 401 | 403 | 404, reason: RecoveryIssueReason }

export const RECOVERY_ISSUE_ERRORS: Record<RecoveryIssueReason, string> = {
  unauthenticated: 'Não autorizado',
  permission: 'Permissão insuficiente',
  authority: 'Só é permitido gerar link de recuperação para uma pessoa com papel estritamente inferior ao seu.',
  target: 'Pessoa não encontrada.',
}

/**
 * Pure, database-free authorization for the settings recovery issuer.
 * Nonexistent, inactive and malformed targets are deliberately indistinguishable
 * so the route never reveals whether an account exists.
 */
export function decideRecoveryIssue(actor: RecoveryActor | null, target: RecoveryTarget | null): RecoveryIssueDecision {
  if (!actor) return { ok: false, status: 401, reason: 'unauthenticated' }
  if (!actor.permissions.includes('people.manage')) return { ok: false, status: 403, reason: 'permission' }
  if (!target || !target.isActive) return { ok: false, status: 404, reason: 'target' }
  if (!canChangePasswordFor(actor.role, target.role, target.id === actor.id)) return { ok: false, status: 403, reason: 'authority' }
  return { ok: true }
}

export function generateRecoveryToken(): string {
  return randomBytes(32).toString('base64url')
}

export function hashRecoveryToken(rawToken: string): string {
  return createHash('sha256').update(rawToken).digest('hex')
}

export function recoveryExpiry(now: Date, ttlMinutes: number = PASSWORD_RECOVERY_TTL_MINUTES): Date {
  return new Date(now.getTime() + ttlMinutes * 60_000)
}

export function recoveryUrl(origin: string, rawToken: string): string {
  return new URL(`${RECOVERY_PATH}?token=${rawToken}`, origin).toString()
}
