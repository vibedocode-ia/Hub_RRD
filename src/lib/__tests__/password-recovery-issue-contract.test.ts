import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'

const read = (file: string) => readFileSync(path.join(process.cwd(), file), 'utf8')

const ROUTE = 'src/app/api/settings/people/[id]/password-recovery/route.ts'
const HELPER = 'src/lib/password-recovery.ts'

test('the settings recovery route is a POST handler guarded by local access and people.manage', () => {
  const route = read(ROUTE)
  assert.match(route, /export async function POST\(/)
  assert.match(route, /getCurrentLocalAccess\(\)/)
  assert.match(route, /people\.manage/)
  assert.match(route, /status: 401/)
  assert.match(route, /status: 403/)
})

test('the route rejects a malformed person id as a non-identifying 404 before touching the database', () => {
  const route = read(ROUTE)
  assert.match(route, /\[0-9a-f\]\{8\}/i) // uuid shape
  const uuidIdx = route.search(/uuid/i)
  const lookupIdx = route.indexOf('.from(users)')
  assert.ok(uuidIdx > -1, 'the route must validate the uuid shape')
  assert.ok(lookupIdx > uuidIdx, 'the id must be validated before the user lookup')
  assert.match(route, /status: decision\.status/) // shares the single non-enumerating error path
})

test('the route delegates target authorization to the shared strict password authority', () => {
  const route = read(ROUTE)
  const helper = read(HELPER)
  assert.match(route, /decideRecoveryIssue\(/)
  assert.match(helper, /canChangePasswordFor\(actor\.role, target\.role, target\.id === actor\.id\)/)
})

test('the route loads only the target identity and never returns user details', () => {
  const route = read(ROUTE)
  assert.match(route, /select\(\{[^}]*id: users\.id[^}]*role: users\.role[^}]*isActive: users\.isActive[^}]*\}\)/)
  assert.doesNotMatch(route, /select\(\)\.from\(users\)/)
  assert.doesNotMatch(route, /name: target|target\.name|target\.email|target\.phone/)
})

test('the route answers unauthorized, missing permission, forbidden authority and missing target with the shared statuses', () => {
  const route = read(ROUTE)
  assert.match(route, /RECOVERY_ISSUE_ERRORS\[decision\.reason\]/)
  assert.match(route, /status: decision\.status/)
})

test('the issued link is audited to the acting manager with actor id and TTL only, never token or password material', () => {
  const route = read(ROUTE)
  assert.match(route, /actorUserId: actor\.id/)
  assert.match(route, /action: 'password\.recovery_issued'/)
  assert.match(route, /targetType: 'user'/)
  // Narrowed assertion: the audit row carries only the TTL metadata derived from the
  // one-time secret's lifetime. It must never embed the raw token, its hash or any
  // password value.
  assert.match(route, /metadata: \{ ttlMinutes: PASSWORD_RECOVERY_TTL_MINUTES \}/)
  assert.doesNotMatch(route, /metadata:[^}]*rawToken/i)
  assert.doesNotMatch(route, /metadata:[^}]*passwordHash/i)
  assert.doesNotMatch(route, /console\.(?:log|warn|error)/)
})

test('only the sha256 hash is persisted and any previous active token is invalidated in the same transaction', () => {
  const route = read(ROUTE)
  assert.match(route, /tokenHash = hashRecoveryToken\(rawToken\)/)
  assert.match(route, /db\.transaction\(/)
  assert.match(route, /tx\.delete\(passwordRecoveryTokens\)\.where\(eq\(passwordRecoveryTokens\.userId, target\.id\)\)/)
  assert.match(route, /tx\.insert\(passwordRecoveryTokens\)\.values\(\{ userId: target\.id, tokenHash, expiresAt \}\)/)
})

test('the one-time link and the 15-minute TTL are returned only after the authorization decision', () => {
  const route = read(ROUTE)
  assert.match(route, /PASSWORD_RECOVERY_TTL_MINUTES/)
  assert.match(route, /expiresAt = recoveryExpiry\(now, PASSWORD_RECOVERY_TTL_MINUTES\)/)
  assert.match(route, /url: recoveryUrl\(req\.nextUrl\.origin, rawToken\)/)
  assert.ok(route.indexOf('if (!decision.ok)') < route.indexOf('url: recoveryUrl'), 'the URL must only be built after the decision guard')
})

test('the recovery issue helper is a pure, database-free module', () => {
  const helper = read(HELPER)
  assert.doesNotMatch(helper, /drizzle-orm|@\/db/)
  assert.match(helper, /export function decideRecoveryIssue/)
})

test('the unchanged internal issuer and imported login page are not the ones this route relies on', () => {
  const route = read(ROUTE)
  assert.doesNotMatch(route, /PASSWORD_RECOVERY_ISSUER_SECRET|x-sofia-trusted-phone/)
})
