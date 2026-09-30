import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

test('conversion re-locks and re-reads approved proposal before client mutation', () => {
  const source = readFileSync('src/lib/lead-conversion.ts', 'utf8')
  const proposalLock = source.indexOf('from lead_proposals where id = ${input.proposalId} and lead_id = ${lead.id} for update')
  const approval = source.indexOf("proposal.status !== 'APPROVED'")
  const mutation = source.indexOf('tx.insert(clients)')
  assert.ok(proposalLock >= 0 && approval > proposalLock && mutation > approval)
})
