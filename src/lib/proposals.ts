export const PROPOSAL_STATUSES={DRAFT:'DRAFT',SENT:'SENT',NEGOTIATION:'NEGOTIATION',APPROVED:'APPROVED',REJECTED:'REJECTED',EXPIRED:'EXPIRED',CANCELLED:'CANCELLED',NOT_COUNTED:'NOT_COUNTED'} as const
export type ProposalStatus=typeof PROPOSAL_STATUSES[keyof typeof PROPOSAL_STATUSES]
const transitions:Record<ProposalStatus,ProposalStatus[]>= {
  DRAFT:['SENT','CANCELLED'], SENT:['NEGOTIATION','APPROVED','REJECTED','EXPIRED','CANCELLED','NOT_COUNTED'], NEGOTIATION:['APPROVED','REJECTED','EXPIRED','CANCELLED','NOT_COUNTED'], APPROVED:['CANCELLED'], REJECTED:[], EXPIRED:[], CANCELLED:[], NOT_COUNTED:[]
}
export function canTransitionProposal(from:string,to:string){return (transitions[from as ProposalStatus]||[]).includes(to as ProposalStatus)}
