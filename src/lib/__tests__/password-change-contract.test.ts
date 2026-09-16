import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'

const read = (file: string) => readFileSync(path.join(process.cwd(), file), 'utf8')

test('profile exposes a self-password form that posts current and new password to the dedicated route', () => {
  const profile = read('src/app/portal/perfil/ProfileClient.tsx')
  assert.match(profile, /Alterar senha/)
  assert.match(profile, /currentPassword/)
  assert.match(profile, /\/api\/auth\/change-password/)
})

test('self-password route verifies the current password then revokes every session without auditing password material', () => {
  const route = read('src/app/api/auth/change-password/route.ts')
  assert.match(route, /verifyPassword\(currentPassword, user\.passwordHash\)/)
  assert.match(route, /tx\.delete\(sessions\)\.where\(eq\(sessions\.userId, user\.id\)\)/)
  assert.match(route, /action: 'password\.self_changed'/)
  assert.doesNotMatch(route, /metadata:\s*\{[^}]*password/i)
})

test('administrative people route uses strict password authority for another account', () => {
  const route = read('src/app/api/settings/people/[id]/route.ts')
  assert.match(route, /canChangePasswordFor\(actor\.role, target\.role[^,]*, target\.id === actor\.id\)/)
})
