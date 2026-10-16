import test from 'node:test'
import assert from 'node:assert/strict'
import { isAdministrativeAccess, removalBlockReason } from '../people-safety'
test('last active manager cannot be removed or lose effective authority', () => {
 assert.equal(isAdministrativeAccess({ role: 'ADMIN', isActive: true, permissions: ['people.manage'] }), true)
 assert.equal(isAdministrativeAccess({ role: 'ADMIN', isActive: true, permissions: [] }), false)
 assert.equal(removalBlockReason(true, 1), 'LAST_ADMIN')
 assert.equal(removalBlockReason(true, 2), null)
 assert.equal(removalBlockReason(false, 0), null)
})
