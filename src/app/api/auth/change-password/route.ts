import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { auditEvents, db, sessions, users } from '@/db'
import { getSessionUser } from '@/lib/auth'
import { hashPassword, verifyPassword } from '@/lib/auth-crypto'

export async function POST(req: NextRequest) {
  const session = await getSessionUser()
  if (!session) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  if (!db) return NextResponse.json({ error: 'Banco indisponível.' }, { status: 503 })
  const body = await req.json().catch(() => null)
  const currentPassword = typeof body?.currentPassword === 'string' ? body.currentPassword : ''
  const password = typeof body?.password === 'string' ? body.password : ''
  if (!currentPassword || password.length < 12 || password.length > 256) return NextResponse.json({ error: 'Informe a senha atual e uma nova senha com pelo menos 12 caracteres.' }, { status: 422 })
  const [user] = await db.select({ id: users.id, passwordHash: users.passwordHash }).from(users).where(eq(users.id, session.id)).limit(1)
  if (!user || !verifyPassword(currentPassword, user.passwordHash)) return NextResponse.json({ error: 'Não foi possível alterar a senha.' }, { status: 403 })
  await db.transaction(async (tx) => {
    await tx.update(users).set({ passwordHash: hashPassword(password), updatedAt: new Date() }).where(eq(users.id, user.id))
    await tx.delete(sessions).where(eq(sessions.userId, user.id))
    await tx.insert(auditEvents).values({ actorUserId: user.id, action: 'password.self_changed', targetType: 'user', targetId: user.id, metadata: {} })
  })
  return NextResponse.json({ success: true, message: 'Senha alterada. Entre novamente para continuar.' })
}
