import { asc, eq } from 'drizzle-orm'
import { db, users, userPermissions } from '@/db'

/** Native RR access source. Never reads Access V1 accounts or login credentials. */
export async function listNativePeopleAccesses(database = db) {
  if (!database) throw new Error('DATABASE_UNAVAILABLE')
  const rows = await database.select({
    id: users.id, name: users.name, role: users.role, isActive: users.isActive,
    permission: userPermissions.permissionKey,
  }).from(users).leftJoin(userPermissions, eq(userPermissions.userId, users.id)).orderBy(asc(users.name), asc(users.id), asc(userPermissions.permissionKey))
  const people = new Map<string, { id: string; name: string; role: string; isActive: boolean; permissions: string[] }>()
  for (const row of rows) {
    const person: { id: string; name: string; role: string; isActive: boolean; permissions: string[] } = people.get(row.id) ?? { id: row.id, name: row.name, role: row.role, isActive: row.isActive, permissions: [] }
    if (row.permission && !person.permissions.includes(row.permission)) person.permissions.push(row.permission)
    people.set(row.id, person)
  }
  return Array.from(people.values())
}

/** Dedicated transport is checked by the existing caller, not inferred from JSON. */
export function isNativePeopleAccessRead(raw: Record<string, unknown>, sovereign: boolean) {
  return sovereign && raw.action === 'list_people_accesses' &&
    Object.keys(raw).sort().join(',') === ['action', 'centralRole', 'centralHubId', 'centralGrantId', 'senderPhone'].sort().join(',')
}
