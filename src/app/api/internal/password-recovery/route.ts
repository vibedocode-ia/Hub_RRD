import { createHash, randomBytes, timingSafeEqual } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { auditEvents, db, passwordRecoveryTokens, USER_ROLES, users } from '@/db'

const TTL_MINUTES = 15

function authorized(req: NextRequest) {
  const expected = process.env.PASSWORD_RECOVERY_ISSUER_SECRET
  const supplied = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim() ?? ''
  if (!expected || !supplied) return false
  const expectedBuffer = Buffer.from(expected)
  const suppliedBuffer = Buffer.from(supplied)
  return expectedBuffer.length === suppliedBuffer.length && timingSafeEqual(expectedBuffer, suppliedBuffer)
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  if (!db) return NextResponse.json({ error: 'Banco indisponível.' }, { status: 503 })

  const activeGodAdmins = await db.select({ id: users.id }).from(users)
    .where(and(eq(users.role, USER_ROLES.OWNER), eq(users.isActive, true))).limit(2)
  if (activeGodAdmins.length !== 1) return NextResponse.json({ error: 'Recuperação indisponível para esta configuração de acesso.' }, { status: 409 })

  const rawToken = randomBytes(32).toString('base64url')
  const tokenHash = createHash('sha256').update(rawToken).digest('hex')
  const now = new Date()
  const expiresAt = new Date(now.getTime() + TTL_MINUTES * 60_000)
  const userId = activeGodAdmins[0].id

  await db.transaction(async (tx) => {
    await tx.delete(passwordRecoveryTokens).where(eq(passwordRecoveryTokens.userId, userId))
    await tx.insert(passwordRecoveryTokens).values({ userId, tokenHash, expiresAt })
    await tx.insert(auditEvents).values({ actorUserId: null, action: 'password.recovery_issued', targetType: 'user', targetId: userId, metadata: { ttlMinutes: TTL_MINUTES } })
  })

  return NextResponse.json({ url: new URL(`/recuperar-acesso?token=${rawToken}`, req.nextUrl.origin).toString(), expiresAt: expiresAt.toISOString() })
}
