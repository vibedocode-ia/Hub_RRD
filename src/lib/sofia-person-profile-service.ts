import { z } from 'zod'
import { eq, sql } from 'drizzle-orm'
import { db, users, userPermissions, sessions, auditEvents } from '@/db'
import { assertPersonRemovalSafe, PeopleConflict } from './people-safety'
import { isRoleManageableBy, type LocalUserRole } from './permissions'
import { SofiaPersonProfileQuery as query, SofiaManagedPersonProfileUpdate as update, sofiaPersonProfileColumns, type SofiaPersonProfile } from './sofia-person-profile'
const phone = z.string().regex(/^\+?[1-9]\d{9,14}$/)
type Result = { status: number; body: { success: boolean; error?: string; code?: string; profile?: SofiaPersonProfile } }
class ProfileError extends Error { constructor(readonly status: number, readonly code: string) { super(code) } }
// Server-only authority supplied after the dedicated Central transport was validated.
// This is not a local role/membership and never creates a local user.
type Options = { database?: typeof db; phoneIdentityMode?: 'central_phone_identity'; sovereign?: { grantId: string; hubId: string } }
/** Only authenticated/validated Central transport may call this service. Sender is not action data. */
export async function executeSofiaManagedPersonProfile(action: string, data: unknown, trustedSenderPhone: unknown, options: Options = {}): Promise<Result> {
 const fail = (status: number, code: string): Result => ({ status, body: { success: false, error: code, code } })
 const sender = phone.safeParse(trustedSenderPhone)
 const parsed = (action === 'update_person_profile' ? update : query).safeParse(data)
 if (!sender.success || !parsed.success || !['get_person_profile', 'update_person_profile'].includes(action)) return fail(422, 'INVALID_PROFILE_REQUEST')
 // No stable external identity migration exists. Reject obsolete/runtime modes rather than
 // retaining a phone-mutation escape hatch that could transfer Central authority.
 if (options.phoneIdentityMode !== undefined && options.phoneIdentityMode !== 'central_phone_identity') return fail(409, 'PHONE_IDENTITY_MODE_UNSUPPORTED')
 const database = options.database ?? db
 if (!database) return fail(503, 'DATABASE_UNAVAILABLE')
 try {
  return await database.transaction(async tx => {
   // Same lock order as People mutations; grants cannot disappear between authorization and write.
   await tx.execute(sql`LOCK TABLE users IN SHARE ROW EXCLUSIVE MODE`)
   await tx.execute(sql`LOCK TABLE user_permissions IN SHARE MODE`)
   const [actor] = await tx.select(sofiaPersonProfileColumns).from(users).where(eq(users.phone, sender.data.replace(/^\+/, ''))).limit(1)
   if (!options.sovereign && !actor?.isActive) throw new ProfileError(403, 'LOCAL_ACCESS_DENIED')
   const grants = actor ? await tx.select({ key: userPermissions.permissionKey }).from(userPermissions).where(eq(userPermissions.userId, actor.id)) : []
   const keys = grants.map(g => g.key)
   if (!options.sovereign && (!keys.includes('sofia.use') || !keys.includes('people.manage'))) throw new ProfileError(403, 'MANAGER_REQUIRED')
   const [target] = await tx.select(sofiaPersonProfileColumns).from(users).where(eq(users.phone, parsed.data.targetPhone.replace(/^\+/, ''))).limit(1)
   if (!target) throw new ProfileError(404, 'PERSON_NOT_FOUND')
   let result = target
   if (action === 'update_person_profile') {
    // Reuse the portal hierarchy with fresh, locked local roles; never infer Central authority.
    if (!options.sovereign && target.id !== actor!.id && !isRoleManageableBy(actor!.role as LocalUserRole, target.role as LocalUserRole)) throw new ProfileError(403, 'SUPERIOR_ROLE')
    const patch = update.parse(data).patch
    if (target.id === actor?.id && patch.isActive === false) throw new ProfileError(409, 'SELF_LOCKOUT')
    const changingPhone = patch.phone !== undefined && patch.phone !== target.phone
    if (changingPhone) throw new ProfileError(409, 'CENTRAL_IDENTITY_AUTHORIZATION_REQUIRED')
    await assertPersonRemovalSafe(tx, target.id, patch)
    ;[result] = await tx.update(users).set({ ...patch, updatedAt: new Date() }).where(eq(users.id, target.id)).returning(sofiaPersonProfileColumns)
    if (patch.isActive === false) await tx.delete(sessions).where(eq(sessions.userId, target.id))
    await tx.insert(auditEvents).values({ actorUserId: actor?.id ?? null, action: 'person.managed_profile_updated', targetType: 'user', targetId: target.id, metadata: { fields: Object.keys(patch), ...(options.sovereign ? { authority: 'god_admin', centralGrantId: options.sovereign.grantId, centralHubId: options.sovereign.hubId, authenticatedSenderPhone: sender.data } : {}) } })
   }
   const permissions = await tx.select({ key: userPermissions.permissionKey }).from(userPermissions).where(eq(userPermissions.userId, target.id))
   return { status: 200, body: { success: true, profile: { ...result, permissions: permissions.map(g => g.key) } } }
  })
 } catch (error) {
  if (error instanceof PeopleConflict) return fail(409, 'LAST_ADMIN')
  const cause = (error as { cause?: { code?: string }; code?: string })
  if (cause.code === '23505' || cause.cause?.code === '23505') return fail(409, 'PHONE_ALREADY_REGISTERED')
  if (error instanceof ProfileError) return fail(error.status, error.code)
  throw error
 }
}
