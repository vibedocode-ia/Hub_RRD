import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { PASSWORD_RECOVERY_TTL_MINUTES } from '../password-recovery'

const read = (file: string) => readFileSync(path.join(process.cwd(), file), 'utf8')

const ROUTE = 'src/app/api/settings/people/[id]/password-recovery/route.ts'
const SCHEMA = 'src/db/schema.ts'

test('issuing a link supersedes the previous one atomically (delete before insert)', () => {
  const route = read(ROUTE)
  const tx = route.slice(route.indexOf('db.transaction('))
  assert.ok(tx.length > 0, 'the issuance must run inside a transaction')
  const del = tx.indexOf('tx.delete(passwordRecoveryTokens)')
  const ins = tx.indexOf('tx.insert(passwordRecoveryTokens)')
  assert.ok(del > -1 && ins > -1, 'the transaction must delete stale tokens and insert the new one')
  assert.ok(del < ins, 'the previous token must be invalidated before the new one is stored')
})

test('supersession stores only the sha256 hash, never the raw one-time token', () => {
  const route = read(ROUTE)
  assert.match(route, /tokenHash = hashRecoveryToken\(rawToken\)/)
  assert.match(route, /tx\.insert\(passwordRecoveryTokens\)\.values\(\{ userId: target\.id, tokenHash, expiresAt \}\)/)
  const insert = route.slice(route.indexOf('tx.insert(passwordRecoveryTokens).values('))
  assert.doesNotMatch(insert.slice(0, 200), /rawToken/)
})

test('the superseded link keeps the fifteen-minute TTL', () => {
  assert.equal(PASSWORD_RECOVERY_TTL_MINUTES, 15)
  const route = read(ROUTE)
  assert.match(route, /expiresAt = recoveryExpiry\(now, PASSWORD_RECOVERY_TTL_MINUTES\)/)
})

test('supersession reuses the existing token table, no new limiter table or column', () => {
  const schema = read(SCHEMA)
  assert.match(schema, /export const passwordRecoveryTokens = pgTable\('password_recovery_tokens'/)
  assert.match(schema, /tokenHash: text\('token_hash'\).*unique\(\).*notNull\(\)/)
  assert.match(schema, /usedAt: timestamp\('used_at'\)/)
})
