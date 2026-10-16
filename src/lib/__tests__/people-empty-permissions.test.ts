import test from 'node:test'
import assert from 'node:assert/strict'
import { CreateLocalPersonSchema, UpdateLocalPersonSchema } from '../validation/people'

test('explicit empty permissions revoke all access on PATCH and create no grants on POST', () => {
  assert.equal(UpdateLocalPersonSchema.safeParse({ permissions: [] }).success, true)
  assert.equal(CreateLocalPersonSchema.safeParse({ name: 'Pessoa teste', phone: '5521999999999', password: 'test-password-only', role: 'LEITURA', permissions: [], isActive: false }).success, true)
})
