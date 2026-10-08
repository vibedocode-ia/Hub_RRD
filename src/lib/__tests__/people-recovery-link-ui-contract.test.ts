import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'

const client = readFileSync(path.join(process.cwd(), 'src/app/portal/settings/pessoas/PeopleAccessClient.tsx'), 'utf8')

test('people settings expose a per-user one-time recovery link action backed by the new settings route', () => {
  assert.match(client, /\/api\/settings\/people\/\$\{person\.id\}\/password-recovery/)
  assert.match(client, /method: 'POST'/)
  assert.match(client, /Link de recuperação/)
})

test('the recovery link is only offered when the current manager holds password authority over the target', () => {
  assert.match(client, /canChangePasswordFor\(currentUserRole, person\.role, person\.id === currentUserId\)/)
})

test('the recovery link is shown once with a copy affordance and cleared from the UI when closed', () => {
  assert.match(client, /navigator\.clipboard\.writeText/)
  assert.match(client, /setRecoveryLink\(null\)/)
  assert.match(client, /Fechar e limpar/)
  assert.doesNotMatch(client, /console\.(?:log|warn|error).*[Rr]ecovery/)
})

test('the direct temporary-password field is preserved alongside the recovery link action', () => {
  assert.match(client, /Senha temporária/)
  assert.match(client, /Nova senha \(opcional\)/)
})
