import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

test('lead proposal rejects cross-lead service request links and malformed validity before insert', () => {
  const source = readFileSync('src/app/api/leads/[id]/proposals/route.ts', 'utf8')
  assert.match(source, /leadServiceRequests\.leadId, id/)
  assert.match(source, /LEAD_SERVICE_REQUEST_NOT_FOUND/)
  assert.match(source, /Number\.isNaN\(validUntil\.getTime\(\)\)/)
  assert.match(source, /status: 422/)
})

test('rejecting one proposal preserves a lead with another viable proposal', () => {
  const source = readFileSync('src/app/api/lead-proposals/[id]/route.ts', 'utf8')
  assert.match(source, /ne\(leadProposals\.id, proposal\.id\)/)
  assert.match(source, /PROPOSAL_STATUSES\.DRAFT, PROPOSAL_STATUSES\.SENT, PROPOSAL_STATUSES\.NEGOTIATION/)
  assert.match(source, /if \(!active\.length\) await tx\.update\(leads\)/)
})
