import test from 'node:test'
import assert from 'node:assert/strict'
import {
  DEFAULT_PERMISSIONS_BY_ROLE,
  hasPermission,
  isRoleManageableBy,
  permissionsAreAllowedForRole,
  type LocalUserAccess,
} from '../src/lib/permissions'

const owner: LocalUserAccess = {
  id: 'owner',
  role: 'OWNER',
  isActive: true,
  permissions: DEFAULT_PERMISSIONS_BY_ROLE.OWNER,
}

const admin: LocalUserAccess = {
  id: 'admin',
  role: 'ADMIN',
  isActive: true,
  permissions: DEFAULT_PERMISSIONS_BY_ROLE.ADMIN,
}

test('owner has local people and document issue permissions', () => {
  assert.equal(hasPermission(owner, 'people.manage'), true)
  assert.equal(hasPermission(owner, 'documents.issue'), true)
})

test('operator cannot manage people or issue official documents', () => {
  const operator: LocalUserAccess = {
    id: 'operator',
    role: 'OPERATOR',
    isActive: true,
    permissions: DEFAULT_PERMISSIONS_BY_ROLE.OPERATOR,
  }

  assert.equal(hasPermission(operator, 'people.manage'), false)
  assert.equal(hasPermission(operator, 'documents.issue'), false)
  assert.equal(hasPermission(operator, 'documents.prepare'), true)
})

test('inactive local user is denied even when a permission exists', () => {
  const inactiveAdmin: LocalUserAccess = { ...admin, isActive: false }
  assert.equal(hasPermission(inactiveAdmin, 'documents.issue'), false)
})

test('permissions must remain compatible with the resulting local role', () => {
  assert.equal(permissionsAreAllowedForRole('OPERATOR', ['documents.prepare']), true)
  assert.equal(permissionsAreAllowedForRole('OPERATOR', ['people.manage']), false)
})

test('admin cannot manage an owner but owner can manage an admin', () => {
  assert.equal(isRoleManageableBy('ADMIN', 'OWNER'), false)
  assert.equal(isRoleManageableBy('OWNER', 'ADMIN'), true)
})
