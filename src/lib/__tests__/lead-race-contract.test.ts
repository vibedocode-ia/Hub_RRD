import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

test('lead conversion serializes both lead and canonical phone before client creation', () => {
  const source = readFileSync('src/lib/lead-conversion.ts', 'utf8')
  const phoneLock = source.indexOf('hashtext(${lead.normalizedPhone})')
  const insertClient = source.indexOf('tx.insert(clients)')
  assert.ok(phoneLock >= 0 && insertClient > phoneLock)
})

test('lead proposal creation validates terminal state only after transaction lock', () => {
  const source = readFileSync('src/app/api/leads/[id]/proposals/route.ts', 'utf8')
  const lock = source.indexOf('for update')
  const terminal = source.indexOf("['NEW', 'QUOTING'].includes(lead.status)")
  const insert = source.indexOf('tx.insert(leadProposals)')
  assert.ok(lock >= 0 && terminal > lock && insert > terminal)
})

test('lead proposal status cannot cancel approval and cannot overwrite a terminal lead as lost', () => {
  const source = readFileSync('src/app/api/lead-proposals/[id]/route.ts', 'utf8')
  assert.match(source, /proposal\.status === PROPOSAL_STATUSES\.APPROVED && status === PROPOSAL_STATUSES\.CANCELLED/)
  assert.match(source, /eq\(leads\.status, LEAD_STATUSES\.QUOTING\)/)
})
