import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'

const read = (file: string) => readFileSync(path.join(process.cwd(), file), 'utf8')

const ROUTE = 'src/app/api/settings/people/[id]/password-recovery/route.ts'
const HELPER = 'src/lib/password-recovery.ts'
const RECOVERY_PAGE = 'src/app/recuperar-acesso/page.tsx'
const INTERNAL = 'src/app/api/internal/password-recovery/route.ts'

test('the token-bearing issuance response is never cached and never leaks the referrer', () => {
  const route = read(ROUTE)
  assert.match(route, /Cache-Control/)
  assert.match(route, /no-store/)
  assert.match(route, /Referrer-Policy/)
  assert.match(route, /no-referrer/)
})

test('the recovery page that receives the token is dynamic, no-store and referrer no-referrer', () => {
  const page = read(RECOVERY_PAGE)
  assert.match(page, /force-dynamic/)
  assert.match(page, /referrer/)
  assert.match(page, /no-referrer/)
})

test('a new link atomically supersedes the previous one for the same person', () => {
  const route = read(ROUTE)
  const tx = route.slice(route.indexOf('db.transaction('))
  const del = tx.indexOf('tx.delete(passwordRecoveryTokens)')
  const ins = tx.indexOf('tx.insert(passwordRecoveryTokens)')
  assert.ok(del > -1 && ins > -1 && del < ins, 'the previous token must be invalidated before the new one is stored')
})

test('no schema-safe rate limiting exists, so the issuer makes no rate-limiting claim', () => {
  const route = read(ROUTE)
  const helper = read(HELPER)
  assert.doesNotMatch(route, /429|Retry-After|Throttle|COOLDOWN/i)
  assert.doesNotMatch(helper, /Throttle|RECOVERY_ISSUE_COOLDOWN_SECONDS/)
})

test('no in-memory production limiter is introduced', () => {
  const route = read(ROUTE)
  const helper = read(HELPER)
  assert.doesNotMatch(route, /new Map\(|Map<string, number>|globalThis\.__rate|setInterval\(/)
  assert.doesNotMatch(helper, /new Map\(|Map<string, number>|globalThis\./)
})

test('local issuance is audited under the password.recovery namespace with actor attribution', () => {
  const route = read(ROUTE)
  assert.match(route, /action: 'password\.recovery_issued'/)
  assert.match(route, /actorUserId: actor\.id/)
  assert.match(route, /targetType: 'user'/)
})

test('the unchanged internal issuer still audits password.recovery_issued with a null actor', () => {
  const internal = read(INTERNAL)
  assert.match(internal, /action: 'password\.recovery_issued'/)
  assert.match(internal, /actorUserId: null/)
})
