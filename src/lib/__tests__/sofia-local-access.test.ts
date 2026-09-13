import test from 'node:test'
import assert from 'node:assert/strict'
import { canUseRrdSofia, normalizeRrdPhone } from '../sofia-local-access'

test('active RRD person with Sofia permission may use the RRD Sofia dispatch', () => {
  assert.equal(canUseRrdSofia({ phone: '5521999999999', isActive: true, permissions: ['crm.read', 'sofia.use'] }, '+55 (21) 99999-9999'), true)
})

test('a RRD person without the local Sofia permission is denied even with another portal permission', () => {
  assert.equal(canUseRrdSofia({ phone: '5521999999999', isActive: true, permissions: ['crm.read', 'operations.write'] }, '+5521999999999'), false)
})

test('a deactivated RRD person is denied even when a stale Sofia permission exists', () => {
  assert.equal(canUseRrdSofia({ phone: '5521999999999', isActive: false, permissions: ['sofia.use'] }, '+5521999999999'), false)
})

test('phone matching is canonical and never accepts a different number', () => {
  assert.equal(normalizeRrdPhone('+55 (21) 99999-9999'), '5521999999999')
  assert.equal(canUseRrdSofia({ phone: '5521999999999', isActive: true, permissions: ['sofia.use'] }, '+5521988888888'), false)
})
