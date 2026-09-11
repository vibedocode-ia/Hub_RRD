import { eq } from 'drizzle-orm'
import { db, userPermissions, users } from '@/db'
import { getSessionUser } from '@/lib/auth'
import { hasPermission, type LocalUserAccess, type RrdPermission } from '@/lib/permissions'

export async function getCurrentLocalAccess(): Promise<LocalUserAccess | null> {
  const sessionUser = await getSessionUser()
  if (!sessionUser || !db) return null

  const current = await db.select({
    id: users.id,
    role: users.role,
    isActive: users.isActive,
  }).from(users).where(eq(users.id, sessionUser.id)).limit(1)

  const user = current[0]
  if (!user || !user.isActive) return null

  const permissions = await db.select({ permissionKey: userPermissions.permissionKey })
    .from(userPermissions)
    .where(eq(userPermissions.userId, user.id))

  return {
    id: user.id,
    role: user.role as LocalUserAccess['role'],
    isActive: user.isActive,
    permissions: permissions.map((item) => item.permissionKey as RrdPermission),
  }
}

export async function currentUserHasPermission(permission: RrdPermission): Promise<boolean> {
  return hasPermission(await getCurrentLocalAccess(), permission)
}
