import { legacyPeopleGuard } from '@/lib/access-v1/legacy-management-guard'
import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { auditEvents, db, sessions, passwordRecoveryTokens, userPermissions, users } from '@/db'
import { personColumns, assertPersonRemovalSafe, assertNoProtectedPersonLinks, PeopleConflict, PeopleRequestError, lockPeopleAuthority } from '@/lib/people-safety'
import { hashPassword } from '@/lib/auth-crypto'
import { getCurrentLocalAccess } from '@/lib/local-access'
import { canChangePasswordFor, isRoleManageableBy, permissionsAreAllowedForRole } from '@/lib/permissions'
import { UpdateLocalPersonSchema } from '@/lib/validation/people'

function personIdFromParams(context: { params: Promise<{ id: string }> }) {
  return context.params.then(({ id }) => id)
}

export async function DELETE(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const pilotGuard=await legacyPeopleGuard();if(pilotGuard)return pilotGuard
  const actor = await getCurrentLocalAccess()
  if (!actor) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  if (!actor.permissions.includes('people.manage')) return NextResponse.json({ error: 'Permissão insuficiente' }, { status: 403 })
  if (!db) return NextResponse.json({ error: 'Banco indisponível' }, { status: 503 })
  const targetId = await personIdFromParams(context)
  const pilotTarget=await legacyPeopleGuard(targetId);if(pilotTarget)return pilotTarget
  if (targetId === actor.id) return NextResponse.json({ error: 'Você não pode excluir a própria conta.' }, { status: 409 })

  try {
    await db.transaction(async tx => {
      const current = await lockPeopleAuthority(tx, actor.id, targetId)
      if (!isRoleManageableBy(current.actor.role, current.target.role as typeof actor.role)) throw new PeopleRequestError(403, 'Não é permitido excluir pessoa com papel superior ao seu.')
      await assertPersonRemovalSafe(tx, targetId)
      await assertNoProtectedPersonLinks(tx, targetId)
      await tx.delete(sessions).where(eq(sessions.userId, targetId))
      await tx.delete(passwordRecoveryTokens).where(eq(passwordRecoveryTokens.userId, targetId))
      await tx.delete(userPermissions).where(eq(userPermissions.userId, targetId))
      await tx.delete(users).where(eq(users.id, targetId))
      await tx.insert(auditEvents).values({ actorUserId: actor.id, action: 'person.deleted', targetType: 'user', targetId, metadata: {} })
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof PeopleRequestError) return NextResponse.json({ error: error.message }, { status: error.status })
    if (error instanceof PeopleConflict) return NextResponse.json({ error: error.message, canDeactivate: true }, { status: 409 })
    const code = (error as { code?: string; cause?: { code?: string } }).code ?? (error as { cause?: { code?: string } }).cause?.code
    if (code === '23503') return NextResponse.json({ error: 'Esta pessoa possui vínculos protegidos. Desative o acesso em vez de excluir.', canDeactivate: true }, { status: 409 })
    throw error
  }
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const pilotGuard=await legacyPeopleGuard();if(pilotGuard)return pilotGuard
  const actor = await getCurrentLocalAccess()
  if (!actor) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  if (!actor.permissions.includes('people.manage')) return NextResponse.json({ error: 'Permissão insuficiente' }, { status: 403 })
  if (!db) return NextResponse.json({ error: 'Banco indisponível' }, { status: 503 })

  const targetId = await personIdFromParams(context)
  const pilotTarget=await legacyPeopleGuard(targetId);if(pilotTarget)return pilotTarget
  const parsed = UpdateLocalPersonSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Dados de atualização inválidos.', details: parsed.error.flatten() }, { status: 422 })
  const input = parsed.data

  let updated
  try {
  updated = await db.transaction(async (tx) => {
    const { actor: currentActor, target } = await lockPeopleAuthority(tx, actor.id, targetId)
    if (target.id === actor.id) {
      if (input.isActive === false) throw new PeopleRequestError(409, 'Você não pode desativar a própria conta.')
      if (input.role || input.permissions) throw new PeopleRequestError(403, 'Sua própria conta não pode alterar papel ou permissões.')
    } else if (!isRoleManageableBy(currentActor.role, target.role as typeof currentActor.role)) throw new PeopleRequestError(403, 'Não é permitido alterar pessoa com papel superior ao seu.')
    if (input.password && !canChangePasswordFor(currentActor.role, target.role as typeof currentActor.role, target.id === actor.id)) throw new PeopleRequestError(403, 'Só é permitido alterar a senha de uma pessoa com papel estritamente inferior ao seu.')

    const nextRole = input.role ?? target.role as typeof currentActor.role
    if (nextRole !== target.role && !isRoleManageableBy(currentActor.role, nextRole)) throw new PeopleRequestError(403, 'Não é permitido atribuir papel superior ao seu.')
    if (input.permissions && !permissionsAreAllowedForRole(nextRole, input.permissions)) throw new PeopleRequestError(422, 'As permissões precisam ser compatíveis com o papel local resultante.')
    if (input.permissions?.some((permission) => !currentActor.permissions.includes(permission))) throw new PeopleRequestError(403, 'Não é permitido delegar uma permissão que você não possui.')

    await assertPersonRemovalSafe(tx, target.id, input)
    const [person] = await tx.update(users).set({
      ...(input.name ? { name: input.name } : {}),
      ...(input.email !== undefined ? { email: input.email } : {}),
      ...(input.password ? { passwordHash: hashPassword(input.password) } : {}),
      ...(input.role ? { role: input.role } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      updatedAt: new Date(),
    }).where(eq(users.id, target.id)).returning(personColumns)

    if (input.permissions) {
      await tx.delete(userPermissions).where(eq(userPermissions.userId, target.id))
      if (input.permissions.length) await tx.insert(userPermissions).values(input.permissions.map((permission) => ({ userId: target.id, permissionKey: permission, grantedById: actor.id })))
    }
    if (input.isActive === false || input.password || input.role || input.permissions !== undefined) await tx.delete(sessions).where(eq(sessions.userId, target.id))
    await tx.insert(auditEvents).values({
      actorUserId: actor.id,
      action: 'person.updated',
      targetType: 'user',
      targetId: target.id,
      metadata: { role: person.role, active: person.isActive, permissionsChanged: Boolean(input.permissions), passwordChanged: Boolean(input.password) },
    })
    return person
  })

  } catch (error) {
    if (error instanceof PeopleRequestError) return NextResponse.json({ error: error.message }, { status: error.status })
    if (error instanceof PeopleConflict) return NextResponse.json({ error: error.message }, { status: 409 })
    throw error
  }
  const permissions = input.permissions ?? (await db.select({ permissionKey: userPermissions.permissionKey }).from(userPermissions).where(eq(userPermissions.userId, targetId))).map((item) => item.permissionKey)
  return NextResponse.json({ success: true, person: { id: updated.id, name: updated.name, phone: updated.phone, email: updated.email, role: updated.role, isActive: updated.isActive, lastLoginAt: updated.lastLoginAt, permissions } })
}
