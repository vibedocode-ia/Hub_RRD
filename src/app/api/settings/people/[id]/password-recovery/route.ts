import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { auditEvents, db, passwordRecoveryTokens, users } from '@/db'
import { getCurrentLocalAccess } from '@/lib/local-access'
import type { LocalUserRole } from '@/lib/permissions'
import {
  PASSWORD_RECOVERY_TTL_MINUTES,
  RECOVERY_ISSUE_ERRORS,
  decideRecoveryIssue,
  generateRecoveryToken,
  hashRecoveryToken,
  recoveryExpiry,
  recoveryUrl,
} from '@/lib/password-recovery'

/**
 * The raw token only ever travels in this response body, so it must never be
 * cached by a proxy/browser nor be echoed through a Referer header.
 */
const NO_STORE_HEADERS = { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' } as const

/** Postgres uuid shape. A malformed id must be rejected before it ever reaches the database. */
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Local administrative issuance of a one-time password recovery link.
 * Reuses the existing password_recovery_tokens table, the /api/auth/recover-password
 * consumer and the /recuperar-acesso page. The raw token is returned only to the
 * authenticated manager and is never persisted or audited.
 *
 * Only token supersession bounds issuance: there is no schema-safe rate limiter, so
 * this handler deliberately makes no rate-limiting claim. Minting a new link
 * atomically invalidates the previous one for the same person.
 */
export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const actor = await getCurrentLocalAccess()
  if (!actor) return NextResponse.json({ error: RECOVERY_ISSUE_ERRORS.unauthenticated }, { status: 401, headers: NO_STORE_HEADERS })
  if (!actor.permissions.includes('people.manage')) return NextResponse.json({ error: RECOVERY_ISSUE_ERRORS.permission }, { status: 403, headers: NO_STORE_HEADERS })
  if (!db) return NextResponse.json({ error: 'Banco indisponível' }, { status: 503, headers: NO_STORE_HEADERS })

  const targetId = (await context.params).id
  // A malformed id shares the same non-identifying 404 as a missing or inactive person.
  if (!UUID_PATTERN.test(targetId)) {
    return NextResponse.json({ error: RECOVERY_ISSUE_ERRORS.target }, { status: 404, headers: NO_STORE_HEADERS })
  }

  const [target] = await db
    .select({ id: users.id, role: users.role, isActive: users.isActive })
    .from(users)
    .where(eq(users.id, targetId))
    .limit(1)

  const decision = decideRecoveryIssue(actor, target ? { id: target.id, role: target.role as LocalUserRole, isActive: target.isActive } : null)
  if (!decision.ok) return NextResponse.json({ error: RECOVERY_ISSUE_ERRORS[decision.reason] }, { status: decision.status, headers: NO_STORE_HEADERS })

  const now = new Date()
  const rawToken = generateRecoveryToken()
  const tokenHash = hashRecoveryToken(rawToken)
  const expiresAt = recoveryExpiry(now, PASSWORD_RECOVERY_TTL_MINUTES)

  await db.transaction(async (tx) => {
    // Issuing a new link invalidates any previously active link for this person.
    await tx.delete(passwordRecoveryTokens).where(eq(passwordRecoveryTokens.userId, target.id))
    await tx.insert(passwordRecoveryTokens).values({ userId: target.id, tokenHash, expiresAt })
    await tx.insert(auditEvents).values({
      actorUserId: actor.id,
      action: 'password.recovery_issued',
      targetType: 'user',
      targetId: target.id,
      metadata: { ttlMinutes: PASSWORD_RECOVERY_TTL_MINUTES },
    })
  })

  return NextResponse.json({
    success: true,
    url: recoveryUrl(req.nextUrl.origin, rawToken),
    expiresAt: expiresAt.toISOString(),
  }, { headers: NO_STORE_HEADERS })
}
