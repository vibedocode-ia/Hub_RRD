import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'

const read = (file: string) => readFileSync(path.join(process.cwd(), file), 'utf8')

test('password recovery persists only a hash, has expiry and a single-use marker', () => {
  const schema = read('src/db/schema.ts')
  assert.match(schema, /export const passwordRecoveryTokens = pgTable\('password_recovery_tokens'/)
  assert.match(schema, /tokenHash: text\('token_hash'\).*unique\(\).*notNull\(\)/)
  assert.match(schema, /expiresAt: timestamp\('expires_at'\).*notNull\(\)/)
  assert.match(schema, /usedAt: timestamp\('used_at'\)/)
})

test('internal issuer is secret-gated and issues only for exactly one active GodAdmin owner', () => {
  const issuer = read('src/app/api/internal/password-recovery/route.ts')
  assert.match(issuer, /PASSWORD_RECOVERY_ISSUER_SECRET/)
  assert.match(issuer, /timingSafeEqual/)
  assert.match(issuer, /eq\(users\.role, USER_ROLES\.OWNER\)/)
  assert.match(issuer, /activeGodAdmins\.length !== 1/)
  assert.match(issuer, /createHash\('sha256'\)/)
  assert.doesNotMatch(issuer, /console\.(?:log|warn).*token/i)
})

test('public recovery consumes an unused unexpired token, hashes a new password and revokes sessions', () => {
  const route = read('src/app/api/auth/recover-password/route.ts')
  assert.match(route, /createHash\('sha256'\)/)
  assert.match(route, /isNull\(passwordRecoveryTokens\.usedAt\)/)
  assert.match(route, /gt\(passwordRecoveryTokens\.expiresAt, now\)/)
  assert.match(route, /tx\.update\(users\)[\s\S]*passwordHash: hashPassword\(password\)/)
  assert.match(route, /tx\.delete\(sessions\)\.where\(eq\(sessions\.userId, recovery\.userId\)\)/)
  assert.match(route, /usedAt: now/)
  assert.doesNotMatch(route, /metadata:\s*\{[^}]*token/i)
})

test('recovery page requires password confirmation and does not render a token outside the request payload', () => {
  const page = read('src/app/recuperar-acesso/RecoveryPasswordClient.tsx')
  assert.match(page, /password !== confirmation/)
  assert.match(page, /\/api\/auth\/recover-password/)
  assert.doesNotMatch(page, /console\.(?:log|warn).*token/i)
})
