export const RRD_PERMISSIONS = [
  'people.manage',
  'crm.read',
  'crm.write',
  'operations.read',
  'operations.write',
  'inventory.read',
  'inventory.write',
  'financial.read',
  'financial.write',
  'documents.read',
  'documents.prepare',
  'documents.approve',
  'documents.issue',
  'documents.send',
  'sofia.drafts.review',
  'sofia.use',
  'settings.manage',
] as const

export type RrdPermission = typeof RRD_PERMISSIONS[number]

export const LOCAL_USER_ROLES = ['OWNER', 'ADMIN', 'OPERATOR', 'TEAM', 'FINANCEIRO', 'LEITURA'] as const
export type LocalUserRole = typeof LOCAL_USER_ROLES[number]

export interface LocalUserAccess {
  id: string
  role: LocalUserRole
  isActive: boolean
  permissions: readonly RrdPermission[]
}

const allPermissions = [...RRD_PERMISSIONS] as RrdPermission[]

export const DEFAULT_PERMISSIONS_BY_ROLE: Record<LocalUserRole, readonly RrdPermission[]> = {
  OWNER: allPermissions,
  ADMIN: allPermissions,
  OPERATOR: [
    'crm.read',
    'crm.write',
    'operations.read',
    'operations.write',
    'inventory.read',
    'documents.read',
    'documents.prepare',
    'sofia.drafts.review',
    'sofia.use',
  ],
  TEAM: ['operations.read', 'operations.write', 'inventory.read'],
  FINANCEIRO: ['financial.read', 'financial.write', 'documents.read', 'documents.prepare'],
  LEITURA: ['crm.read', 'operations.read', 'inventory.read', 'documents.read'],
}

const roleRank: Record<LocalUserRole, number> = {
  LEITURA: 1,
  TEAM: 2,
  OPERATOR: 3,
  FINANCEIRO: 3,
  ADMIN: 4,
  OWNER: 5,
}

export function hasPermission(user: LocalUserAccess | null | undefined, permission: RrdPermission): boolean {
  return Boolean(user?.isActive && user.permissions.includes(permission))
}

/** A person may manage roles at or below their own local authority. */
export function permissionsAreAllowedForRole(role: LocalUserRole, permissions: readonly RrdPermission[]): boolean {
  const allowed = new Set(DEFAULT_PERMISSIONS_BY_ROLE[role])
  return permissions.every((permission) => allowed.has(permission))
}

export function isRoleManageableBy(actorRole: LocalUserRole, targetRole: LocalUserRole): boolean {
  return roleRank[actorRole] >= roleRank[targetRole]
}
