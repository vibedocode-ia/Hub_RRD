import test from 'node:test'
import assert from 'node:assert/strict'
import { DEFAULT_PERMISSIONS_BY_ROLE, permissionsAreAllowedForRole } from '../permissions'

test('ADMIN includes document emission and delivery permissions', () => {
  assert.equal(DEFAULT_PERMISSIONS_BY_ROLE.ADMIN.includes('documents.issue'), true)
  assert.equal(DEFAULT_PERMISSIONS_BY_ROLE.ADMIN.includes('documents.send'), true)
  assert.equal(permissionsAreAllowedForRole('ADMIN', ['documents.issue', 'documents.send']), true)
})

test('non-admin operational roles remain unable to deliver documents', () => {
  assert.equal(permissionsAreAllowedForRole('OPERATOR', ['documents.send']), false)
  assert.equal(permissionsAreAllowedForRole('TEAM', ['documents.send']), false)
})
