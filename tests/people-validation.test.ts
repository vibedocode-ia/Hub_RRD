import test from 'node:test'
import assert from 'node:assert/strict'
import { CreateLocalPersonSchema, UpdateLocalPersonSchema } from '../src/lib/validation/people'

test('create local person accepts an explicitly active local account', () => {
  const parsed = CreateLocalPersonSchema.safeParse({
    name: 'Operador QA',
    phone: '5521999999999',
    password: 'senha-temporaria-segura',
    role: 'OPERATOR',
    permissions: ['crm.read', 'documents.prepare'],
    isActive: true,
  })

  assert.equal(parsed.success, true)
})

test('create local person accepts an explicitly inactive local account', () => {
  const parsed = CreateLocalPersonSchema.safeParse({
    name: 'Operador QA',
    phone: '5521999999999',
    password: 'senha-temporaria-segura',
    role: 'OPERATOR',
    permissions: ['crm.read', 'documents.prepare'],
    isActive: false,
  })

  assert.equal(parsed.success, true)
})

test('create local person rejects a central grant field and undeclared permission', () => {
  assert.equal(CreateLocalPersonSchema.safeParse({
    name: 'Operador QA',
    phone: '5521999999999',
    password: 'senha-temporaria-segura',
    role: 'OPERATOR',
    permissions: ['people.manage'],
    centralHubId: '11111111-1111-4111-8111-111111111111',
  }).success, false)
})

test('update rejects duplicate permission keys', () => {
  assert.equal(UpdateLocalPersonSchema.safeParse({ permissions: ['documents.prepare', 'documents.prepare'] }).success, false)
})

test('role change requires an explicit replacement permission set', () => {
  assert.equal(UpdateLocalPersonSchema.safeParse({ role: 'OPERATOR' }).success, false)
  assert.equal(UpdateLocalPersonSchema.safeParse({ role: 'OPERATOR', permissions: ['documents.prepare'] }).success, true)
})

test('update local person permits activation changes without a password', () => {
  assert.equal(UpdateLocalPersonSchema.safeParse({ isActive: false }).success, true)
})
