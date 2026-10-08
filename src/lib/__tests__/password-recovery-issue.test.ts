import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { LOCAL_USER_ROLES } from '../permissions'
import {
  PASSWORD_RECOVERY_TTL_MINUTES,
  RECOVERY_ISSUE_ERRORS,
  RECOVERY_PATH,
  decideRecoveryIssue,
  generateRecoveryToken,
  hashRecoveryToken,
  recoveryExpiry,
  recoveryUrl,
  type RecoveryActor,
  type RecoveryTarget,
} from '../password-recovery'

const actor = (
  role: RecoveryActor['role'],
  permissions: RecoveryActor['permissions'] = ['people.manage'],
  id = 'actor-1',
): RecoveryActor => ({ id, role, permissions })

const target = (
  role: RecoveryTarget['role'],
  id = 'target-1',
  isActive = true,
): RecoveryTarget => ({ id, role, isActive })

test('an unauthenticated caller cannot issue a recovery link', () => {
  assert.deepEqual(decideRecoveryIssue(null, target('OPERATOR')), { ok: false, status: 401, reason: 'unauthenticated' })
})

test('an authenticated caller without people.manage cannot issue a recovery link', () => {
  assert.deepEqual(decideRecoveryIssue(actor('ADMIN', ['crm.read']), target('OPERATOR')), { ok: false, status: 403, reason: 'permission' })
  assert.deepEqual(decideRecoveryIssue(actor('OWNER', []), target('OPERATOR')), { ok: false, status: 403, reason: 'permission' })
})

test('a manager cannot issue a recovery link for a peer or a superior', () => {
  assert.deepEqual(decideRecoveryIssue(actor('ADMIN'), target('ADMIN')), { ok: false, status: 403, reason: 'authority' })
  assert.deepEqual(decideRecoveryIssue(actor('ADMIN'), target('OWNER')), { ok: false, status: 403, reason: 'authority' })
  assert.deepEqual(decideRecoveryIssue(actor('OWNER'), target('OWNER', 'other-owner')), { ok: false, status: 403, reason: 'authority' })
  assert.deepEqual(decideRecoveryIssue(actor('TEAM'), target('OPERATOR')), { ok: false, status: 403, reason: 'authority' })
  assert.deepEqual(decideRecoveryIssue(actor('OPERATOR'), target('FINANCEIRO')), { ok: false, status: 403, reason: 'authority' })
})

test('OWNER and ADMIN may target a strictly lower role', () => {
  for (const role of ['OPERATOR', 'TEAM', 'FINANCEIRO', 'LEITURA'] as const) {
    assert.equal(decideRecoveryIssue(actor('ADMIN'), target(role)).ok, true, `ADMIN -> ${role}`)
    assert.equal(decideRecoveryIssue(actor('OWNER'), target(role)).ok, true, `OWNER -> ${role}`)
  }
  assert.equal(decideRecoveryIssue(actor('OWNER'), target('ADMIN')).ok, true)
})

test('OWNER may target every strictly lower role and never another OWNER', () => {
  for (const role of LOCAL_USER_ROLES) {
    const decision = decideRecoveryIssue(actor('OWNER'), target(role, 'peer-1'))
    assert.equal(decision.ok, role !== 'OWNER', `OWNER -> ${role}`)
  }
})

test('inactive and nonexistent targets answer with the same non-identifying 404', () => {
  const inactive = decideRecoveryIssue(actor('OWNER'), target('OPERATOR', 'user-9f3', false))
  const missing = decideRecoveryIssue(actor('OWNER'), null)
  assert.deepEqual(inactive, { ok: false, status: 404, reason: 'target' })
  assert.deepEqual(inactive, missing)
  assert.equal(RECOVERY_ISSUE_ERRORS.target, 'Pessoa não encontrada.')
  assert.doesNotMatch(RECOVERY_ISSUE_ERRORS.target, /user-9f3|OPERATOR|@|\d{4}/)
})

test('self-service authority mirrors the administrative password rule', () => {
  assert.equal(decideRecoveryIssue(actor('ADMIN', ['people.manage'], 'self-id'), target('ADMIN', 'self-id')).ok, true)
  assert.equal(decideRecoveryIssue(actor('TEAM', ['people.manage'], 'self-id'), target('TEAM', 'self-id')).ok, true)
})

test('recovery links expire in exactly fifteen minutes', () => {
  assert.equal(PASSWORD_RECOVERY_TTL_MINUTES, 15)
  const now = new Date('2026-10-08T12:00:00.000Z')
  assert.equal(recoveryExpiry(now).toISOString(), '2026-10-08T12:15:00.000Z')
  assert.equal(recoveryExpiry(now).getTime() - now.getTime(), 15 * 60_000)
})

test('generated tokens are 43-char base64url values persisted only as a sha256 hash', () => {
  const token = generateRecoveryToken()
  assert.match(token, /^[A-Za-z0-9_-]{43}$/)
  assert.notEqual(generateRecoveryToken(), token)
  const hash = hashRecoveryToken(token)
  assert.match(hash, /^[0-9a-f]{64}$/)
  assert.equal(hash, createHash('sha256').update(token).digest('hex'))
  assert.notEqual(hash, token)
  assert.equal(hash.includes(token), false)
})

test('the recovery link points at the existing recovery consumer page', () => {
  assert.equal(RECOVERY_PATH, '/recuperar-acesso')
  assert.equal(recoveryUrl('https://rrd.example.com', 'TOKEN123'), 'https://rrd.example.com/recuperar-acesso?token=TOKEN123')
})
