import { NextResponse } from 'next/server'
import { and, asc, eq } from 'drizzle-orm'
import { db, collaborators, users, userPermissions, auditEvents } from '@/db'
import { requireLocalPermission } from '@/lib/require-local-permission'
import { getCurrentLocalAccess } from '@/lib/local-access'
import { hashPassword } from '@/lib/auth-crypto'
import { DEFAULT_PERMISSIONS_BY_ROLE } from '@/lib/permissions'

const text = (value: unknown) => (typeof value === 'string' ? value.trim() || null : null)

export async function GET() {
  if (!await requireLocalPermission('operations.read') || !db) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: db ? 403 : 503 })
  }
  const rows = await db
    .select({
      id: collaborators.id,
      name: collaborators.name,
      role: collaborators.role,
      phone: collaborators.phone,
      document: collaborators.document,
      userId: collaborators.userId,
      isActive: collaborators.isActive,
      notes: collaborators.notes,
      createdAt: collaborators.createdAt,
      updatedAt: collaborators.updatedAt,
      userRole: users.role,
      userPhone: users.phone,
    })
    .from(collaborators)
    .leftJoin(users, eq(collaborators.userId, users.id))
    .orderBy(asc(collaborators.name))

  return NextResponse.json({ collaborators: rows })
}

export async function POST(request: Request) {
  if (!await requireLocalPermission('operations.write') || !db) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: db ? 403 : 503 })
  }

  const body = await request.json().catch(() => ({}))
  const name = text(body.name)
  const role = text(body.role)

  if (!name) return NextResponse.json({ error: 'O nome do colaborador é obrigatório.' }, { status: 400 })
  if (!role) return NextResponse.json({ error: 'A função/cargo do colaborador é obrigatória.' }, { status: 400 })

  const phone = text(body.phone)
  const document = text(body.document)
  const notes = text(body.notes)
  const isActive = body.isActive !== false
  let userId = text(body.userId)

  // Se solicitou criação de login de acesso no portal
  if (body.createLogin && phone && !userId) {
    const actor = await getCurrentLocalAccess()
    const cleanPhone = phone.replace(/\D/g, '')
    const loginPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`

    const existingUser = await db.select({ id: users.id }).from(users).where(eq(users.phone, loginPhone)).limit(1)
    if (existingUser[0]) {
      userId = existingUser[0].id
    } else {
      const password = typeof body.password === 'string' && body.password.length >= 6 ? body.password : 'rrd123456'
      const permissions = DEFAULT_PERMISSIONS_BY_ROLE['TEAM']

      const newUser = await db.transaction(async (tx) => {
        const [u] = await tx
          .insert(users)
          .values({
            name,
            phone: loginPhone,
            role: 'TEAM',
            passwordHash: hashPassword(password),
            isActive: true,
          })
          .returning({ id: users.id })

        if (permissions.length) {
          await tx.insert(userPermissions).values(
            permissions.map((p) => ({
              userId: u.id,
              permissionKey: p,
              grantedById: actor?.id || null,
            }))
          )
        }

        if (actor) {
          await tx.insert(auditEvents).values({
            actorUserId: actor.id,
            action: 'collaborator.user_created',
            targetType: 'user',
            targetId: u.id,
            metadata: { role: 'TEAM', collaboratorName: name },
          })
        }
        return u
      })
      userId = newUser.id
    }
  }

  const [collaborator] = await db
    .insert(collaborators)
    .values({
      name,
      role,
      phone,
      document,
      userId,
      isActive,
      notes,
    })
    .returning()

  return NextResponse.json({ collaborator }, { status: 201 })
}

export async function PATCH(request: Request) {
  if (!await requireLocalPermission('operations.write') || !db) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: db ? 403 : 503 })
  }

  const body = await request.json().catch(() => ({}))
  const id = text(body.id)
  if (!id) return NextResponse.json({ error: 'Colaborador inválido.' }, { status: 400 })

  const values: Record<string, unknown> = { updatedAt: new Date() }
  for (const key of ['name', 'role', 'phone', 'document', 'notes', 'userId'] as const) {
    if (body[key] !== undefined) values[key] = text(body[key])
  }
  if (typeof body.isActive === 'boolean') values.isActive = body.isActive

  if (values.name === null) return NextResponse.json({ error: 'O nome do colaborador é obrigatório.' }, { status: 400 })
  if (values.role === null) return NextResponse.json({ error: 'A função/cargo é obrigatória.' }, { status: 400 })

  const [collaborator] = await db
    .update(collaborators)
    .set(values as any)
    .where(eq(collaborators.id, id))
    .returning()

  if (!collaborator) return NextResponse.json({ error: 'Colaborador não encontrado.' }, { status: 404 })
  return NextResponse.json({ collaborator })
}

export async function DELETE(request: Request) {
  if (!await requireLocalPermission('operations.write') || !db) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: db ? 403 : 503 })
  }

  const id = new URL(request.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Colaborador inválido.' }, { status: 400 })

  const [collaborator] = await db
    .update(collaborators)
    .set({ isActive: false, updatedAt: new Date() })
    .where(and(eq(collaborators.id, id), eq(collaborators.isActive, true)))
    .returning()

  if (!collaborator) return NextResponse.json({ error: 'Colaborador não encontrado ou já arquivado.' }, { status: 404 })

  return NextResponse.json({ success: true, collaborator })
}
