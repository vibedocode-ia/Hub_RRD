import type { LocalUserRole, RrdPermission } from './permissions'
import type { UpdateLocalPersonInput } from './validation/people'
type Original = { name: string; email: string | null; role: LocalUserRole; permissions: readonly RrdPermission[]; isActive: boolean }
type Form = Omit<Original, 'email'> & { email: string; password: string }
export function buildPeoplePatch(original: Original, form: Form): UpdateLocalPersonInput {
  const patch: UpdateLocalPersonInput = {}
  if (form.name !== original.name) patch.name = form.name
  if ((form.email || null) !== original.email) patch.email = form.email || null
  if (form.password) patch.password = form.password
  if (form.isActive !== original.isActive) patch.isActive = form.isActive
  if (form.role !== original.role) patch.role = form.role
  if (patch.role || form.permissions.length !== original.permissions.length || form.permissions.some(p => !original.permissions.includes(p))) patch.permissions = [...form.permissions]
  return patch
}
