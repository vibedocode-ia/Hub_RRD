import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { auditEvents, db, sessions, userPermissions, users } from '@/db'
import { hashPassword } from '@/lib/auth-crypto'
import { getCurrentLocalAccess } from '@/lib/local-access'
import { isRoleManageableBy, permissionsAreAllowedForRole } from '@/lib/permissions'
import { UpdateLocalPersonSchema } from '@/lib/validation/people'

function personIdFromParams(context: { params: Promise<{ id: string }> }) {
  return context.params.then(({ id }) => id)
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const actor = await getCurrentLocalAccess()
  if (!actor) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  if (!actor.permissions.includes('people.manage')) return NextResponse.json({ error: 'Permissão insuficiente' }, { status: 403 })
  if (!db) return NextResponse.json({ error: 'Banco indisponível' }, { status: 503 })

  const targetId = await personIdFromParams(context)
  const parsed = UpdateLocalPersonSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Dados de atualização inválidos.', details: parsed.error.flatten() }, { status: 422 })
  const input = parsed.data

  const [target] = await db.select().from(users).where(eq(users.id, targetId)).limit(1)
  if (!target) return NextResponse.json({ error: 'Pessoa não encontrada.' }, { status: 404 })
  if (target.id === actor.id) {
    if (input.isActive === false) return NextResponse.json({ error: 'Você não pode desativar a própria conta.' }, { status: 409 })
    if (input.role || input.permissions) return NextResponse.json({ error: 'Sua própria conta não pode alterar papel ou permissões.' }, { status: 403 })
  } else if (!isRoleManageableBy(actor.role, target.role as typeof actor.role)) return NextResponse.json({ error: 'Não é permitido alterar pessoa com papel superior ao seu.' }, { status: 403 })

  const nextRole = input.role ?? target.role as typeof actor.role
  if (nextRole !== target.role && !isRoleManageableBy(actor.role, nextRole)) return NextResponse.json({ error: 'Não é permitido atribuir papel superior ao seu.' }, { status: 403 })
  if (input.permissions && !permissionsAreAllowedForRole(nextRole, input.permissions)) return NextResponse.json({ error: 'As permissões precisam ser compatíveis com o papel local resultante.' }, { status: 422 })
  if (input.permissions?.some((permission) => !actor.permissions.includes(permission))) return NextResponse.json({ error: 'Não é permitido delegar uma permissão que você não possui.' }, { status: 403 })

  const updated = await db.transaction(async (tx) => {
    const [person] = await tx.update(users).set({
      ...(input.name ? { name: input.name } : {}),
      ...(input.email !== undefined ? { email: input.email } : {}),
      ...(input.password ? { passwordHash: hashPassword(input.password) } : {}),
      ...(input.role ? { role: input.role } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      updatedAt: new Date(),
    }).where(eq(users.id, target.id)).returning()

    if (input.permissions) {
      await tx.delete(userPermissions).where(eq(userPermissions.userId, target.id))
      await tx.insert(userPermissions).values(input.permissions.map((permission) => ({ userId: target.id, permissionKey: permission, grantedById: actor.id })))
    }
    if (input.isActive === false || input.password) await tx.delete(sessions).where(eq(sessions.userId, target.id))
    await tx.insert(auditEvents).values({
      actorUserId: actor.id,
      action: 'person.updated',
      targetType: 'user',
      targetId: target.id,
      metadata: { role: person.role, active: person.isActive, permissionsChanged: Boolean(input.permissions), passwordChanged: Boolean(input.password) },
    })
    return person
  })

  const permissions = input.permissions ?? (await db.select({ permissionKey: userPermissions.permissionKey }).from(userPermissions).where(eq(userPermissions.userId, target.id))).map((item) => item.permissionKey)
  return NextResponse.json({ success: true, person: { id: updated.id, name: updated.name, phone: updated.phone, email: updated.email, role: updated.role, isActive: updated.isActive, lastLoginAt: updated.lastLoginAt, permissions } })
}
