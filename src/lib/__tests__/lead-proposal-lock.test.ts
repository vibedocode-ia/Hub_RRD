import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

test('lead proposal status locks and re-reads target proposal before lifecycle validation', () => {
  const source = readFileSync('src/app/api/lead-proposals/[id]/route.ts', 'utf8')
  const proposalLock = source.indexOf('from lead_proposals where id = ${id} for update')
  const leadLock = source.indexOf('from leads where id = ${proposal.leadId} for update')
  const transition = source.indexOf('canTransitionProposal(proposal.status, status)')
  const update = source.indexOf('tx.update(leadProposals)')
  assert.ok(proposalLock >= 0 && leadLock > proposalLock && transition > leadLock && update > transition)
  assert.match(source, /LEAD_TERMINAL/)
})
