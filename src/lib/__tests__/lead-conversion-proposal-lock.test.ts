import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

test('conversion re-locks and re-reads approved proposal before client mutation', () => {
  const source = readFileSync('src/lib/lead-conversion.ts', 'utf8')
  const proposalLock = source.indexOf("from(leadProposals).where(and(eq(leadProposals.id, input.proposalId), eq(leadProposals.leadId, lead.id))).for('update')")
  const approval = source.indexOf("proposal.status !== 'APPROVED'")
  const mutation = source.indexOf('tx.insert(clients)')
  assert.ok(proposalLock >= 0 && approval > proposalLock && mutation > approval)
})
