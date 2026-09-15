import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { isRoleManageableBy } from '../permissions'

test('a local manager may create another local person with the same role', () => {
  assert.equal(isRoleManageableBy('OWNER', 'OWNER'), true)
  assert.equal(isRoleManageableBy('ADMIN', 'ADMIN'), true)
})

test('a local manager may not grant a role above their own authority', () => {
  assert.equal(isRoleManageableBy('ADMIN', 'OWNER'), false)
  assert.equal(isRoleManageableBy('TEAM', 'ADMIN'), false)
})

test('people form receives current role and blocks unavailable role before submit', () => {
  const page = readFileSync(path.join(process.cwd(), 'src/app/portal/settings/pessoas/page.tsx'), 'utf8')
  const client = readFileSync(path.join(process.cwd(), 'src/app/portal/settings/pessoas/PeopleAccessClient.tsx'), 'utf8')

  assert.match(page, /currentUserRole=\{access\.role\}/)
  assert.match(client, /currentUserRole/)
  assert.match(client, /isRoleManageableBy\(currentUserRole, form\.role\)/)
  assert.match(client, /Escolha um papel igual ou inferior ao seu antes de salvar\./)
})
