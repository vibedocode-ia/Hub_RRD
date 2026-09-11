import { z } from 'zod'
import { DEFAULT_PERMISSIONS_BY_ROLE, LOCAL_USER_ROLES, RRD_PERMISSIONS } from '@/lib/permissions'

const normalizedPhone = z.string().trim().regex(/^\d{10,15}$/, 'Informe o telefone apenas com dígitos, incluindo DDI e DDD.')
const permission = z.enum(RRD_PERMISSIONS)
const role = z.enum(LOCAL_USER_ROLES)

function permissionsAllowedForRole(input: { role?: z.infer<typeof role>; permissions?: z.infer<typeof permission>[] }, context: z.RefinementCtx) {
  if (input.permissions && new Set(input.permissions).size !== input.permissions.length) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['permissions'], message: 'Não repita uma permissão.' })
    return
  }
  if (input.role && !input.permissions) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['permissions'], message: 'Informe as permissões que substituem as permissões do papel anterior.' })
    return
  }
  if (!input.role || !input.permissions) return
  const allowed = new Set(DEFAULT_PERMISSIONS_BY_ROLE[input.role])
  for (const item of input.permissions) {
    if (!allowed.has(item)) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ['permissions'], message: `Permissão ${item} não é permitida para o papel ${input.role}.` })
    }
  }
}

export const CreateLocalPersonSchema = z.object({
  name: z.string().trim().min(2).max(160),
  phone: normalizedPhone,
  email: z.string().trim().email().max(254).optional(),
  password: z.string().min(12).max(256),
  role,
  permissions: z.array(permission).min(1).max(RRD_PERMISSIONS.length),
}).strict().superRefine(permissionsAllowedForRole)

export const UpdateLocalPersonSchema = z.object({
  name: z.string().trim().min(2).max(160).optional(),
  email: z.string().trim().email().max(254).nullable().optional(),
  password: z.string().min(12).max(256).optional(),
  role: role.optional(),
  permissions: z.array(permission).min(1).max(RRD_PERMISSIONS.length).optional(),
  isActive: z.boolean().optional(),
}).strict().superRefine(permissionsAllowedForRole)

export type CreateLocalPersonInput = z.infer<typeof CreateLocalPersonSchema>
export type UpdateLocalPersonInput = z.infer<typeof UpdateLocalPersonSchema>
