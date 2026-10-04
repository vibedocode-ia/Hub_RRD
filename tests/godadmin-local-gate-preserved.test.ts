import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

// Regression: the GodAdmin Central route is ADDITIVE. Production's local
// permission gate (0e440f1) must survive reconciliation, and GodAdmin must be
// reachable WITHOUT a local membership — never by synthesizing hub_owner.

const here = dirname(fileURLToPath(import.meta.url))
const route = readFileSync(resolve(here, '../src/app/api/sofia/actions/route.ts'), 'utf8')

test('local RRD permission gate is preserved for ordinary Hub traffic', () => {
  assert.match(route, /locallyAuthorizedForSofiaAction/)
  assert.match(route, /Acesso indisponível ou revogado para este Hub/)
  // the gate must be inside the non-trusted branch, never removed
  const idx = route.indexOf('if (!effectiveAuth.trustedGodAdmin)')
  assert.ok(idx > -1, 'non-trusted branch must exist')
  assert.ok(route.indexOf('locallyAuthorizedForSofiaAction', idx) > idx, 'local gate must run for ordinary traffic')
})

test('GodAdmin path uses a dedicated transport and explicit envelope, not a membership', () => {
  assert.match(route, /godAdminTransport/)
  assert.match(route, /SOFIA_RRD_CENTRAL_SECRET/)
  assert.match(route, /authorizeRrdCentralEnvelope/)
  // must refuse an ordinary token claiming god_admin
  assert.match(route, /centralRole === 'god_admin'/)
})

test('trusted GodAdmin is never granted by the ordinary Hub secret', () => {
  // godAdminTransport must explicitly reject equal secrets
  assert.match(route, /secret === legacy/)
})
