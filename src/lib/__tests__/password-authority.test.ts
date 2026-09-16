import test from 'node:test'
import assert from 'node:assert/strict'
import { canChangePasswordFor } from '../permissions'

test('an authenticated user may change only their own password without people.manage', () => {
  assert.equal(canChangePasswordFor('TEAM', 'TEAM', true), true)
})

test('a local administrator may reset the password of a strictly subordinate role', () => {
  assert.equal(canChangePasswordFor('ADMIN', 'OPERATOR', false), true)
  assert.equal(canChangePasswordFor('ADMIN', 'TEAM', false), true)
})

test('a local administrator may not reset own peer or superior password through administration', () => {
  assert.equal(canChangePasswordFor('ADMIN', 'ADMIN', false), false)
  assert.equal(canChangePasswordFor('ADMIN', 'OWNER', false), false)
})

test('owner may not reset another owner password through local administration', () => {
  assert.equal(canChangePasswordFor('OWNER', 'OWNER', false), false)
})
