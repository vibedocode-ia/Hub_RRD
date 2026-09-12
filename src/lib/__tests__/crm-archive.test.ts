import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

test('CRM delete endpoint archives instead of deleting client history', () => {
  const route = fs.readFileSync(path.join(process.cwd(), 'src/app/api/crm/[id]/route.ts'), 'utf8')
  assert.match(route, /db\.update\(clients\)\.set\(\{[\s\S]*?isActive:\s*false/)
  assert.doesNotMatch(route, /db\.delete\(clients\)|db\.delete\(officialDocuments\)|db\.delete\(serviceRequests\)/)
})
