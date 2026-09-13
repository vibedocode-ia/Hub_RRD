import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

test('service deletion archives instead of physically deleting catalog entries', () => {
  const route = fs.readFileSync('src/app/api/services/[id]/route.ts', 'utf8')
  assert.match(route, /db\.update\(serviceCatalog\)/)
  assert.match(route, /status:\s*['"]INACTIVE['"]/)
  assert.doesNotMatch(route, /db\.delete\(serviceCatalog\)/)
})
