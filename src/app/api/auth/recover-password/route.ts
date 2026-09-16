import { createHash } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { and, eq, gt, isNull } from 'drizzle-orm'
import { auditEvents, db, passwordRecoveryTokens, sessions, users } from '@/db'
import { hashPassword } from '@/lib/auth-crypto'

export async function POST(req: NextRequest) {
  if (!db) return NextResponse.json({ error: 'Banco indisponível.' }, { status: 503 })
  const body = await req.json().catch(() => null)
  const token = typeof body?.token === 'string' ? body.token : ''
  const password = typeof body?.password === 'string' ? body.password : ''
  if (!/^[A-Za-z0-9_-]{43}$/.test(token) || password.length < 12 || password.length > 256) return NextResponse.json({ error: 'Link inválido ou senha fora do padrão.' }, { status: 422 })

  const now = new Date()
  const tokenHash = createHash('sha256').update(token).digest('hex')
  const result = await db.transaction(async (tx) => {
    const [recovery] = await tx.select().from(passwordRecoveryTokens)
      .where(and(eq(passwordRecoveryTokens.tokenHash, tokenHash), isNull(passwordRecoveryTokens.usedAt), gt(passwordRecoveryTokens.expiresAt, now))).limit(1)
    if (!recovery) return false
    const consumed = await tx.update(passwordRecoveryTokens).set({ usedAt: now })
      .where(and(eq(passwordRecoveryTokens.id, recovery.id), isNull(passwordRecoveryTokens.usedAt))).returning({ id: passwordRecoveryTokens.id })
    if (consumed.length !== 1) return false
    await tx.update(users).set({ passwordHash: hashPassword(password), updatedAt: now }).where(eq(users.id, recovery.userId))
    await tx.delete(sessions).where(eq(sessions.userId, recovery.userId))
    await tx.insert(auditEvents).values({ actorUserId: recovery.userId, action: 'password.recovery_consumed', targetType: 'user', targetId: recovery.userId, metadata: {} })
    return true
  })
  if (!result) return NextResponse.json({ error: 'Este link é inválido, expirou ou já foi usado.' }, { status: 410 })
  return NextResponse.json({ success: true, message: 'Senha cadastrada. Entre com seu telefone e a nova senha.' })
}
