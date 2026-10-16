import { and, eq, inArray, sql } from 'drizzle-orm'
import type { LocalUserAccess, RrdPermission } from '@/lib/permissions'
import { db, users, userPermissions } from '@/db'
export const personColumns = {
  id: users.id, name: users.name, phone: users.phone, email: users.email,
  role: users.role, isActive: users.isActive, lastLoginAt: users.lastLoginAt,
  createdAt: users.createdAt, updatedAt: users.updatedAt,
}
type Access = { role: string; isActive: boolean; permissions: readonly string[] }
export function isAdministrativeAccess(p: Access) {
  return p.isActive && ['OWNER', 'SUPER_ADMIN', 'ADMIN'].includes(p.role) && p.permissions.includes('people.manage')
}
export function removalBlockReason(isAdmin: boolean, activeAdmins: number) {
  return isAdmin && activeAdmins <= 1 ? 'LAST_ADMIN' : null
}
export class PeopleConflict extends Error {}
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0]
export class PeopleRequestError extends Error {
  constructor(public status: number, message: string) { super(message) }
}
export async function lockPeopleAuthority(tx: Tx, actorId: string, targetId: string) {
  // Permissions have independent writers; locking users alone cannot protect revocations.
  await tx.execute(sql`LOCK TABLE users, user_permissions IN SHARE ROW EXCLUSIVE MODE`)
  const [actorRow] = await tx.select(personColumns).from(users).where(eq(users.id, actorId)).limit(1)
  if (!actorRow?.isActive) throw new PeopleRequestError(401, 'Não autorizado')
  const grants = await tx.select({ key: userPermissions.permissionKey }).from(userPermissions).where(eq(userPermissions.userId, actorId))
  const actor = { ...actorRow, role: actorRow.role as LocalUserAccess['role'], permissions: grants.map(g => g.key as RrdPermission) }
  if (!actor.permissions.includes('people.manage')) throw new PeopleRequestError(403, 'Permissão insuficiente')
  const [target] = await tx.select(personColumns).from(users).where(eq(users.id, targetId)).limit(1).for('update')
  if (!target) throw new PeopleRequestError(404, 'Pessoa não encontrada.')
  return { actor, target }
}
export async function assertPersonRemovalSafe(tx: Tx, targetId: string, next?: { role?: string; isActive?: boolean; permissions?: readonly string[] }) {
  // Serialize all administrative removals/demotions, including permission-only revocations.
  await tx.execute(sql`LOCK TABLE users IN SHARE ROW EXCLUSIVE MODE`)
  const [target] = await tx.select(personColumns).from(users).where(eq(users.id, targetId)).limit(1).for('update')
  if (!target) throw new PeopleConflict('Pessoa não encontrada.')
  const grants = await tx.select({ key: userPermissions.permissionKey }).from(userPermissions).where(eq(userPermissions.userId, targetId))
  const current = { ...target, permissions: grants.map(g => g.key) }
  if (!isAdministrativeAccess(current) || (next && isAdministrativeAccess({ ...current, ...next }))) return
  const admins = await tx.select({ id: users.id }).from(users).innerJoin(userPermissions, and(eq(userPermissions.userId, users.id), eq(userPermissions.permissionKey, 'people.manage'))).where(and(eq(users.isActive, true), inArray(users.role, ['OWNER', 'SUPER_ADMIN', 'ADMIN'])))
  if (removalBlockReason(true, admins.length)) throw new PeopleConflict('Não é permitido remover ou revogar o acesso do último administrador ativo.')
}

// Inspect actual FK relationships, including SET NULL links: never silently erase history.
export async function assertNoProtectedPersonLinks(tx: Tx, targetId: string) {
  const links = await tx.execute<{ table_schema: string; table_name: string; column_name: string }>(sql`
    SELECT ns.nspname AS table_schema, rel.relname AS table_name, att.attname AS column_name
    FROM pg_constraint c
    JOIN pg_class rel ON rel.oid = c.conrelid
    JOIN pg_namespace ns ON ns.oid = rel.relnamespace
    JOIN pg_attribute att ON att.attrelid = c.conrelid AND att.attnum = ANY(c.conkey)
    WHERE c.contype = 'f' AND c.confrelid = 'users'::regclass
  `)
  for (const link of links) {
    // Only disposable local authentication and the person's OWN permission grants may be removed.
    if ((link.table_name === 'sessions' || link.table_name === 'password_recovery_tokens') && link.column_name === 'user_id') continue
    if (link.table_name === 'user_permissions' && link.column_name === 'user_id') continue
    const found = await tx.execute(sql`SELECT 1 FROM ${sql.identifier(link.table_schema)}.${sql.identifier(link.table_name)} WHERE ${sql.identifier(link.column_name)} = ${targetId} LIMIT 1`)
    if (found.length) throw new PeopleConflict('Esta pessoa possui vínculos protegidos ou histórico. Preserve os dados e desative o acesso em vez de excluir.')
  }
  // JSON/text memberships have no FK. Block writers until commit, then inspect
  // legacy names/free text as well as UUIDs; never mutate teams to allow deletion.
  await tx.execute(sql`LOCK TABLE teams IN SHARE ROW EXCLUSIVE MODE`)
  const [target] = await tx.select(personColumns).from(users).where(eq(users.id, targetId)).limit(1)
  const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
  const identifiers = [targetId, target?.name, target?.phone, target?.email].filter((v): v is string => Boolean(v)).map(normalize).filter(Boolean)
  const teams = await tx.execute<{ participants: unknown }>(sql`SELECT participants FROM teams`)
  if (teams.some(team => identifiers.some(value => normalize(JSON.stringify(team.participants)).includes(value)))) throw new PeopleConflict('Esta pessoa está vinculada a uma equipe. Desative o acesso em vez de excluir.')
}
