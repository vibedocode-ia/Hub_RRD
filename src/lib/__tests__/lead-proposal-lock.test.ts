import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

test('lead proposal status locks and re-reads target proposal before lifecycle validation', () => {
  const source = readFileSync('src/app/api/lead-proposals/[id]/route.ts', 'utf8')
  const proposalLock = source.indexOf("from(leadProposals).where(eq(leadProposals.id, id)).for('update')")
  const leadLock = source.indexOf("from(leads).where(eq(leads.id, proposal.leadId)).for('update')")
  const transition = source.indexOf('canTransitionProposal(proposal.status, status)')
  const update = source.indexOf('tx.update(leadProposals)')
  assert.ok(proposalLock >= 0 && leadLock > proposalLock && transition > leadLock && update > transition)
  assert.match(source, /LEAD_TERMINAL/)
})
