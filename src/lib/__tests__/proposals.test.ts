import test from 'node:test'
import assert from 'node:assert/strict'
import { canTransitionProposal, PROPOSAL_STATUSES } from '../proposals'

test('proposal status transitions follow the commercial lifecycle',()=>{
  assert.equal(canTransitionProposal(PROPOSAL_STATUSES.DRAFT,PROPOSAL_STATUSES.SENT),true)
  assert.equal(canTransitionProposal(PROPOSAL_STATUSES.SENT,PROPOSAL_STATUSES.NEGOTIATION),true)
  assert.equal(canTransitionProposal(PROPOSAL_STATUSES.NEGOTIATION,PROPOSAL_STATUSES.APPROVED),true)
  assert.equal(canTransitionProposal(PROPOSAL_STATUSES.APPROVED,PROPOSAL_STATUSES.REJECTED),false)
})
