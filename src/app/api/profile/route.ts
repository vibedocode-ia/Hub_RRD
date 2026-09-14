import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { auditEvents, db, users } from '@/db'
import { getSessionUser } from '@/lib/auth'
import { ProfileSchema } from '@/lib/validation/profile'

const profileFields = { id: users.id, name: users.name, phone: users.phone, email: users.email, role: users.role, jobTitle: users.jobTitle, photoUrl: users.photoUrl, company: users.company, city: users.city, state: users.state, instagramUrl: users.instagramUrl, websiteUrl: users.websiteUrl, personalNotes: users.personalNotes }

export async function GET() {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  if (!db) return NextResponse.json({ error: 'Banco indisponível' }, { status: 503 })
  const [profile] = await db.select(profileFields).from(users).where(eq(users.id, user.id)).limit(1)
  return profile ? NextResponse.json({ success: true, profile }) : NextResponse.json({ error: 'Perfil não encontrado' }, { status: 404 })
}

export async function PATCH(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  if (!db) return NextResponse.json({ error: 'Banco indisponível' }, { status: 503 })
  const parsed = ProfileSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Dados de perfil inválidos.', details: parsed.error.flatten() }, { status: 422 })
  try {
    const [profile] = await db.transaction(async (tx) => {
      const updated = await tx.update(users).set({ ...parsed.data, updatedAt: new Date() }).where(eq(users.id, user.id)).returning(profileFields)
      if (!updated[0]) return []
      await tx.insert(auditEvents).values({ actorUserId: user.id, action: 'profile.updated', targetType: 'user', targetId: user.id, metadata: { fields: Object.keys(parsed.data) } })
      return updated
    })
    return profile ? NextResponse.json({ success: true, profile }) : NextResponse.json({ error: 'Perfil não encontrado' }, { status: 404 })
  } catch (error: any) {
    if (error?.code === '23505') return NextResponse.json({ error: 'Este WhatsApp já está associado a outra pessoa local.' }, { status: 409 })
    console.error('Erro ao atualizar perfil:', error)
    return NextResponse.json({ error: 'Não foi possível salvar o perfil.' }, { status: 500 })
  }
}
