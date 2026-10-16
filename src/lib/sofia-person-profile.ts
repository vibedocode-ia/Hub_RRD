import { z } from 'zod'
import { and, eq, exists } from 'drizzle-orm'
import { db, users, userPermissions, auditEvents } from '@/db'
import { ProfileSchema } from '@/lib/validation/profile'

// jobTitle describes the person's work. It is NOT the authority-bearing role.
// Phone is the server-resolved identity and cannot be changed through this action.
export const SofiaPersonalProfilePatchSchema = ProfileSchema.omit({ phone: true }).partial().strict()
  .refine(value => Object.values(value).some(v => v !== undefined), 'Informe ao menos um campo pessoal.')
const senderIdentity = z.string().regex(/^\+?[1-9]\d{9,14}$/)
export const SofiaPersonProfileQuery = z.object({ targetPhone: senderIdentity }).strict()
export const SofiaManagedPersonProfileUpdate = z.object({
  targetPhone: senderIdentity,
  patch: ProfileSchema.omit({ phone: true }).partial().extend({
    isActive: z.boolean().optional(), phone: z.string().regex(/^[1-9]\d{9,14}$/).optional(),
  }).strict().refine(value => Object.values(value).some(v => v !== undefined), 'Informe ao menos um campo.'),
}).strict()
const centralIdentity = {
  centralContactId: z.string().uuid(), centralClientId: z.string().uuid(), centralHubId: z.string().uuid(),
  centralRole: z.enum(['hub_owner', 'hub_admin', 'hub_operator']), senderPhone: senderIdentity,
}
const godAdminIdentity = { centralGrantId: z.string().uuid(), centralHubId: z.string().uuid(), centralRole: z.literal('god_admin'), senderPhone: senderIdentity }
export const SofiaManagedPersonProfileRequest = z.union([
  z.object({ ...centralIdentity, action: z.literal('get_person_profile'), data: SofiaPersonProfileQuery }).strict(),
  z.object({ ...centralIdentity, action: z.literal('update_person_profile'), data: SofiaManagedPersonProfileUpdate }).strict(),
  z.object({ ...godAdminIdentity, action: z.literal('get_person_profile'), data: SofiaPersonProfileQuery }).strict(),
  z.object({ ...godAdminIdentity, action: z.literal('update_person_profile'), data: SofiaManagedPersonProfileUpdate }).strict(),
])
export const SofiaPersonProfileRequest = z.union([
  z.object({ ...centralIdentity, action: z.literal('get_my_profile'), data: z.object({}).strict().default({}) }).strict(),
  z.object({ ...centralIdentity, action: z.literal('update_my_profile'), data: SofiaPersonalProfilePatchSchema }).strict(),
  z.object({ ...godAdminIdentity, action: z.literal('get_my_profile'), data: z.object({}).strict().default({}) }).strict(),
  z.object({ ...godAdminIdentity, action: z.literal('update_my_profile'), data: SofiaPersonalProfilePatchSchema }).strict(),
])
export type SofiaPersonalProfilePatch = z.infer<typeof SofiaPersonalProfilePatchSchema>
export type SofiaPersonProfile = Pick<typeof users.$inferSelect, 'id' | 'name' | 'phone' | 'email' | 'jobTitle' | 'photoUrl' | 'company' | 'city' | 'state' | 'instagramUrl' | 'websiteUrl' | 'personalNotes' | 'role' | 'isActive' | 'lastLoginAt' | 'createdAt' | 'updatedAt'> & { permissions: string[] }
export const sofiaPersonProfileColumns = {
  id: users.id, name: users.name, phone: users.phone, email: users.email,
  jobTitle: users.jobTitle, photoUrl: users.photoUrl, company: users.company,
  city: users.city, state: users.state, instagramUrl: users.instagramUrl,
  websiteUrl: users.websiteUrl, personalNotes: users.personalNotes,
  role: users.role, isActive: users.isActive, lastLoginAt: users.lastLoginAt, createdAt: users.createdAt, updatedAt: users.updatedAt,
}
export interface PersonProfileRepository {
  findByPhone(phone: string): Promise<SofiaPersonProfile | null>
  updateByPhone(phone: string, patch: SofiaPersonalProfilePatch): Promise<SofiaPersonProfile | null>
}
function publicProfile(p: SofiaPersonProfile): SofiaPersonProfile {
  return { id: p.id, name: p.name, phone: p.phone, email: p.email, jobTitle: p.jobTitle,
    photoUrl: p.photoUrl, company: p.company, city: p.city, state: p.state,
    instagramUrl: p.instagramUrl, websiteUrl: p.websiteUrl, personalNotes: p.personalNotes,
    role: p.role, isActive: p.isActive, lastLoginAt: p.lastLoginAt, createdAt: p.createdAt, updatedAt: p.updatedAt, permissions: [...p.permissions] }
}
const repository: PersonProfileRepository = {
  async findByPhone(phone) {
    const [person] = await db.select(sofiaPersonProfileColumns).from(users).where(eq(users.phone, phone)).limit(1)
    if (!person) return null
    const grants = await db.select({ key: userPermissions.permissionKey }).from(userPermissions).where(eq(userPermissions.userId, person.id))
    return { ...person, permissions: grants.map(g => g.key) }
  },
  async updateByPhone(phone, patch) {
    return db.transaction(async tx => {
      const [person] = await tx.update(users).set({ ...patch, updatedAt: new Date() })
        .where(and(eq(users.phone, phone), eq(users.isActive, true), exists(tx.select({ id: userPermissions.id }).from(userPermissions).where(and(eq(userPermissions.userId, users.id), eq(userPermissions.permissionKey, 'sofia.use'))))))
        .returning(sofiaPersonProfileColumns)
      if (!person) return null
      await tx.insert(auditEvents).values({ actorUserId: person.id, action: 'person.self_profile_updated', targetType: 'user', targetId: person.id, metadata: { fields: Object.keys(patch) } })
      const grants = await tx.select({ key: userPermissions.permissionKey }).from(userPermissions).where(eq(userPermissions.userId, person.id))
      return { ...person, permissions: grants.map(g => g.key) }
    })
  },
}
type ProfileResult = { status: number; body: { success: boolean; error?: string; profile?: SofiaPersonProfile } }
/** Call ONLY after authenticated transport, central envelope/hub validation and local Sofia access gate.
 * trustedSenderPhone must come from that envelope, never from action.data or a requested user id.
 */
export async function executeSofiaPersonProfile(action: 'get_my_profile' | 'update_my_profile', data: unknown, trustedSenderPhone: unknown, repo: PersonProfileRepository = repository): Promise<ProfileResult> {
  const fail = (status: number, error: string): ProfileResult => ({ status, body: { success: false, error } })
  if (typeof trustedSenderPhone !== 'string' || !/^\+?[1-9]\d{9,14}$/.test(trustedSenderPhone)) return fail(422, 'Identidade de origem inválida.')
  const parsed = (action === 'get_my_profile' ? z.object({}).strict() : SofiaPersonalProfilePatchSchema).safeParse(data)
  if (!parsed.success) return fail(422, 'Dados pessoais inválidos. Papel, permissões, status e identidade não são editáveis por esta ação.')
  if (!db && repo === repository) return fail(503, 'Banco de dados indisponível.')
  const phone = trustedSenderPhone.replace(/^\+/, '')
  const person = await repo.findByPhone(phone)
  if (!person) return fail(404, 'Perfil local não encontrado para a identidade de origem.')
  if (!person.isActive) return fail(403, 'Acesso local desativado.')
  if (!person.permissions.includes('sofia.use')) return fail(403, 'Permissão local Sofia revogada.')
  const result = action === 'get_my_profile' ? person : await repo.updateByPhone(phone, parsed.data)
  if (!result) return fail(409, 'Perfil indisponível ou acesso revogado durante a atualização.')
  return { status: 200, body: { success: true, profile: publicProfile(result) } }
}
