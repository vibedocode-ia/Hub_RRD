import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

test('conversion locks the approved lead before creating or reusing a client', () => {
  const source = readFileSync('src/lib/lead-conversion.ts', 'utf8')
  const lock = source.indexOf('for update')
  const clientMutation = source.indexOf('tx.insert(clients)')
  assert.ok(lock >= 0, 'lead row must be locked')
  assert.ok(clientMutation > lock, 'client mutation must happen after the lead lock')
  assert.match(source, /lead\.status !== LEAD_STATUSES\.APPROVED/)
  assert.match(source, /convertedClientId\} is null/)
})

test('terminal leads cannot receive another proposal or regress to quoting', () => {
  const source = readFileSync('src/app/api/leads/[id]/proposals/route.ts', 'utf8')
  assert.match(source, /\['NEW', 'QUOTING'\]\.includes\(lead\.status\)/)
  assert.match(source, /eq\(leads\.status, 'NEW'\)/)
})
