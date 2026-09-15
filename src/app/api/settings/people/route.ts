import { NextRequest, NextResponse } from 'next/server'
import { asc, eq, inArray } from 'drizzle-orm'
import { auditEvents, db, sessions, userPermissions, users } from '@/db'
import { hashPassword } from '@/lib/auth-crypto'
import { getCurrentLocalAccess } from '@/lib/local-access'
import { isRoleManageableBy, type RrdPermission } from '@/lib/permissions'
import { CreateLocalPersonSchema } from '@/lib/validation/people'

function safePerson(row: typeof users.$inferSelect, permissions: string[]) {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email,
    role: row.role,
    isActive: row.isActive,
    lastLoginAt: row.lastLoginAt,
    permissions,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

export async function GET() {
  const actor = await getCurrentLocalAccess()
  if (!actor) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  if (!actor.permissions.includes('people.manage')) return NextResponse.json({ error: 'Permissão insuficiente' }, { status: 403 })
  if (!db) return NextResponse.json({ error: 'Banco indisponível' }, { status: 503 })

  const rows = await db.select().from(users).orderBy(asc(users.name))
  const ids = rows.map((row) => row.id)
  const permissions = ids.length
    ? await db.select({ userId: userPermissions.userId, permissionKey: userPermissions.permissionKey }).from(userPermissions).where(inArray(userPermissions.userId, ids))
    : []
  const byUser = new Map<string, string[]>()
  for (const item of permissions) byUser.set(item.userId, [...(byUser.get(item.userId) ?? []), item.permissionKey])

  return NextResponse.json({ success: true, people: rows.map((row) => safePerson(row, byUser.get(row.id) ?? [])) })
}

export async function POST(req: NextRequest) {
  const actor = await getCurrentLocalAccess()
  if (!actor) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  if (!actor.permissions.includes('people.manage')) return NextResponse.json({ error: 'Permissão insuficiente' }, { status: 403 })
  if (!db) return NextResponse.json({ error: 'Banco indisponível' }, { status: 503 })

  const parsed = CreateLocalPersonSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Dados de pessoa inválidos.', details: parsed.error.flatten() }, { status: 422 })
  const input = parsed.data

  if (!isRoleManageableBy(actor.role, input.role)) return NextResponse.json({ error: 'Não é permitido criar pessoa com papel igual ou superior ao seu.' }, { status: 403 })
  if (input.permissions.some((permission) => !actor.permissions.includes(permission))) return NextResponse.json({ error: 'Não é permitido delegar uma permissão que você não possui.' }, { status: 403 })

  const existing = await db.select({ id: users.id }).from(users).where(eq(users.phone, input.phone)).limit(1)
  if (existing[0]) return NextResponse.json({ error: 'Já existe uma pessoa local com este telefone.' }, { status: 409 })

  const created = await db.transaction(async (tx) => {
    const [person] = await tx.insert(users).values({
      name: input.name,
      phone: input.phone,
      email: input.email || null,
      passwordHash: hashPassword(input.password),
      role: input.role,
      isActive: input.isActive,
    }).returning()
    await tx.insert(userPermissions).values(input.permissions.map((permission) => ({ userId: person.id, permissionKey: permission, grantedById: actor.id })))
    await tx.insert(auditEvents).values({ actorUserId: actor.id, action: 'person.created', targetType: 'user', targetId: person.id, metadata: { role: person.role, permissionCount: input.permissions.length } })
    return person
  })

  return NextResponse.json({ success: true, person: safePerson(created, input.permissions) }, { status: 201 })
}
