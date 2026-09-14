import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'

const route = readFileSync(path.join(process.cwd(), 'src/app/api/sofia/actions/route.ts'), 'utf8')

test('Central Sofia requests do not require a duplicate local Hub RRD person', () => {
  assert.doesNotMatch(route, /locallyAuthorizedForSofia\(senderPhone\)/)
  assert.doesNotMatch(route, /Acesso local à Sofia não liberado para esta pessoa no Hub RRD/)
  assert.match(route, /centralHubMatches\(rawBody\)/)
  assert.match(route, /const auth = authorized\(req\)/)
})
