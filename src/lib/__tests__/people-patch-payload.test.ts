import test from 'node:test'
import assert from 'node:assert/strict'
import { buildPeoplePatch } from '../people-patch'
const person = { name: 'Teste', email: null, role: 'ADMIN' as const, permissions: ['people.manage'] as const, isActive: true }
const form = { ...person, email: '', password: '', permissions: [...person.permissions] }
test('personal edit does not resend unchanged authority', () => {
  assert.deepEqual(buildPeoplePatch(person, { ...form, name: 'Novo nome' }), { name: 'Novo nome' })
})
test('explicitly removing every permission stays an empty array', () => {
  assert.deepEqual(buildPeoplePatch(person, { ...form, permissions: [] }), { permissions: [] })
})
test('role change carries replacement permissions even if unchanged', () => {
  assert.deepEqual(buildPeoplePatch(person, { ...form, role: 'OWNER' }), { role: 'OWNER', permissions: ['people.manage'] })
})
test('permissions are compared as sets and unchanged forms are empty', () => {
  assert.deepEqual(buildPeoplePatch(person, form), {})
})
