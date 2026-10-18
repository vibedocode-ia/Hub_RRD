import {randomUUID} from 'node:crypto';
// Durable decisions use the unchanged normative IdentityEvent and canonical outbox.
// Status/evidence are fetched privately by the pinned destination, never broadcast.
export function createIdentityDelivery({cfg,sql,fail,fields,json,audit,send,outbox,envelope,dispatch}){
 async function decide(tx,actor,link,revoke){
  const desired=revoke?'revoked':'active';
  if(link.desired_status===desired&&link.last_message_id)return {person_ref:link.person_ref,proposal_ref:link.proposal_ref};
  if(!link.evidence_ref||!(revoke?['active','revoked']:['proved','active']).includes(link.status)||!revoke&&link.status!=='active'&&Date.now()>=+link.expires_at)fail(409,'identity_proof_required');
  const [person]=await tx`update access_persons set identity_revision=identity_revision+1 where person_ref=${link.person_ref} returning identity_revision`;
  const revision=Number(link.link_revision)+1,decision=randomUUID(),ir=Number(person.identity_revision);
  const version={federation_epoch:cfg.epoch,central_revision:revision,local_revision:revision,block_generation:0,membership_generation:1};
  const message=envelope('event',{event_type:revoke?'identity.updated':'identity.linked',identity_ref:link.person_ref,local_user_ref:link.local_user_ref,identity_revision:ir,verified_claims_ref:link.evidence_ref,link_decision_ref:decision,version});
  await tx`insert into access_identity_decisions(decision_ref,proposal_ref,person_ref,hub_id,local_user_ref,target_ref,status,identity_revision,link_revision,evidence_ref,message_id) values(${decision},${link.proposal_ref},${link.person_ref},${cfg.hubId},${link.local_user_ref},${link.target_ref},${desired},${ir},${revision},${link.evidence_ref},${message.message_id})`;
  await tx`update access_person_links set desired_status=${desired},link_revision=${revision},last_message_id=${message.message_id} where proposal_ref=${link.proposal_ref}`;
  await outbox(tx,link.proposal_ref,message);await audit(tx,actor.user_id,revoke?'identity.link_revoked':'identity.link_confirmed',link.proposal_ref,{identity_revision:ir,link_revision:revision});
  return {person_ref:link.person_ref,proposal_ref:link.proposal_ref};
 }
 async function outcome(result){
  await dispatch();const [link]=await sql`select status,desired_status,link_revision,applied_revision,last_message_id from access_person_links where proposal_ref=${result.proposal_ref}`;
  const pending=Number(link.link_revision)!==Number(link.applied_revision);return json({...result,...link,status:pending?'pending':link.status},pending?202:200);
 }
 async function receive(tx,p,m){
  if(cfg.side!=='hub')fail(403,'invalid_authority');const d=await send('/federation/identity/decisions',{decision_ref:p.link_decision_ref});
  if(d.hub_id!==cfg.hubId||d.message_id!==m.message_id||d.person_ref!==p.identity_ref||d.local_user_ref!==p.local_user_ref||Number(d.identity_revision)!==p.identity_revision||d.evidence_ref!==p.verified_claims_ref||Number(d.link_revision)!==p.version.central_revision||p.version.federation_epoch!==cfg.epoch||p.version.local_revision!==p.version.central_revision||p.version.block_generation!==0||p.version.membership_generation!==1)fail(403,'invalid_identity_decision');
  const [proof]=await tx`select * from access_local_identity_proofs where proposal_ref=${d.proposal_ref} for update`;
  if(!proof||proof.local_user_ref!==d.local_user_ref||proof.target_ref!==d.target_ref||proof.evidence_ref!==d.evidence_ref||proof.person_ref&&proof.person_ref!==d.person_ref)fail(403,'identity_proof_required');
  if(Number(d.link_revision)!==Number(proof.link_revision)+1||Number(d.identity_revision)<=Number(proof.identity_revision)||proof.status==='revoked'&&d.status!=='revoked')fail(409,'identity_revision_conflict');
  if(!['active','revoked'].includes(d.status)||p.event_type!==(d.status==='active'?'identity.linked':'identity.updated'))fail(403,'invalid_identity_decision');
  await tx`update access_local_identity_proofs set person_ref=${d.person_ref},status=${d.status},link_revision=${d.link_revision},identity_revision=${d.identity_revision} where proposal_ref=${d.proposal_ref}`;
  await audit(tx,null,'identity.link_'+d.status,d.proposal_ref,{identity_revision:p.identity_revision,link_revision:Number(d.link_revision)});
 }
 async function ack(tx,sent){const p=sent.body.payload;await tx`update access_person_links set status=desired_status,applied_revision=link_revision where last_message_id=${sent.message_id} and person_ref=${p.identity_ref} and local_user_ref=${p.local_user_ref} and link_revision=${p.version.central_revision}`;}
 async function handle(path,method,b,assertion){
  if(path==='/federation/identity/decisions'&&cfg.side==='central'){
   if(!assertion||method!=='POST')fail(403,'invalid_authority');fields(b,['decision_ref']);const [d]=await sql`select * from access_identity_decisions where decision_ref=${b.decision_ref} and hub_id=${cfg.hubId}`;if(!d)fail(404,'not_found');return json(d);
  }
  if(path==='/federation/identity/commits')fail(403,'identity_event_required');return null;
 }
 return {decide,outcome,receive,ack,handle};
}
