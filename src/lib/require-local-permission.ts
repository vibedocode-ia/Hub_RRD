import { getCurrentLocalAccess } from '@/lib/local-access'
import type { LocalUserAccess, RrdPermission } from '@/lib/permissions'

/** Server-side, fail-closed permission guard for Hub RRD routes. */
export async function requireLocalPermission(permission: RrdPermission): Promise<{ access: LocalUserAccess } | null> {
  const access = await getCurrentLocalAccess()
  if (!access || !access.permissions.includes(permission)) return null
  return { access }
}
