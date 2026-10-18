import {randomUUID} from 'node:crypto';
import {createIdentityDelivery} from './identity-delivery.mjs';
// Two independently authenticated accounts consent. Identifier equality is never
// consulted; no native UUID, credential or local authority is copied or changed.
export function createIdentityAccess({cfg,sql,lock,session,fields,fail,json,audit,send,outbox,envelope,dispatch}){
 const delivery=createIdentityDelivery({cfg,sql,fail,fields,json,audit,send,outbox,envelope,dispatch});
 const owner=async(tx,req)=>{const actor=await session(tx,req,{identityOnly:true,fresh:req.method!=='GET'});const [person]=await tx`select person_ref from access_persons where owner_user_ref=${actor.user_id}`;return {actor,person};};
 const confirmed=b=>{fields(b,['confirmed']);if(b.confirmed!==true)fail(403,'confirmation_required');};
 const prove=async(proposal,account)=>{await send('/federation/identity/proofs',{proposal_ref:proposal,local_user_ref:account.local_user_ref,target_ref:account.target_ref,evidence_ref:account.evidence_ref},{actor_identity_ref:account.local_user_ref});await sql`update access_local_identity_proofs set proof_delivered=true where proposal_ref=${proposal}`;};
 const reconcile=async()=>{if(cfg.side!=='hub')return;const rows=await sql`select * from access_local_identity_proofs where proof_delivered=false and status='proved' order by proposal_ref limit 20`;for(const row of rows)try{await prove(row.proposal_ref,row);}catch{/* immutable durable evidence remains pending */}};
 async function handle(req,path,method,b,assertion){
  const delivered=await delivery.handle(path,method,b,assertion);if(delivered)return delivered;
  if(path==='/central/identities'&&method==='GET'&&cfg.side==='central')return sql.begin(async tx=>{
   await lock(tx);await session(tx,req,{global:true});
   const people=await tx`select p.person_ref,a.username,a.status from access_persons p join access_accounts a on a.user_id=p.owner_user_ref order by a.username,p.person_ref`;
   for(const person of people)person.links=await tx`select proposal_ref,hub_id,local_user_ref,target_ref,status,desired_status,link_revision,applied_revision,evidence_ref from access_person_links where person_ref=${person.person_ref} order by hub_id`;
   return json({people});
  });
  if(path==='/identity/person'&&cfg.side==='central')return sql.begin(async tx=>{
   await lock(tx);let {actor,person}=await owner(tx,req);
   if(method==='POST'){
    confirmed(b);if(!person){person={person_ref:randomUUID()};await tx`insert into access_persons(person_ref,owner_user_ref) values(${person.person_ref},${actor.user_id})`;await tx`insert into access_person_links(proposal_ref,person_ref,hub_id,local_user_ref,target_ref,status,expires_at) values(${randomUUID()},${person.person_ref},${cfg.localHubId||cfg.hubId},${actor.user_id},${actor.target_ref},'active',now())`;await audit(tx,actor.user_id,'identity.created',person.person_ref);}
   }else if(method!=='GET')fail(404,'not_found');
   return json({person_ref:person?.person_ref||null,links:person?await tx`select proposal_ref,hub_id,local_user_ref,status,desired_status,link_revision,applied_revision,evidence_ref from access_person_links where person_ref=${person.person_ref} order by hub_id`:[]},method==='POST'?201:200);
  });
  if(path==='/identity/link-proposals'&&method==='POST'&&cfg.side==='central')return sql.begin(async tx=>{
   fields(b,['hub_id','confirmed']);if(b.hub_id!==cfg.hubId||b.confirmed!==true)fail(403,'invalid_authority');
   await lock(tx);const {actor,person}=await owner(tx,req);if(!person)fail(409,'person_required');
   const proposal_ref=randomUUID();await tx`insert into access_person_links(proposal_ref,person_ref,hub_id,status,expires_at) values(${proposal_ref},${person.person_ref},${cfg.hubId},'pending',now()+interval '15 minutes')`;
   await audit(tx,actor.user_id,'identity.link_proposed',proposal_ref);return json({proposal_ref,status:'pending'},201);
  });
  if(path==='/identity/link-acceptances'&&method==='POST'&&cfg.side==='hub'){
   fields(b,['proposal_ref','confirmed']);if(b.confirmed!==true||!uuid(b.proposal_ref))fail(422,'schema_invalid');
   const account=await sql.begin(async tx=>{await lock(tx);const actor=await session(tx,req,{fresh:true});if(!actor.email_evidence_ref||!actor.phone_evidence_ref){const [a]=await tx`select email_evidence_ref,phone_evidence_ref from access_accounts where user_id=${actor.user_id}`;if(!a?.email_evidence_ref||!a.phone_evidence_ref)fail(403,'unverified_account');}
    const [old]=await tx`select * from access_local_identity_proofs where proposal_ref=${b.proposal_ref}`;if(old&&(old.local_user_ref!==actor.user_id||old.status==='revoked'))fail(409,'identity_collision');
    const evidence_ref=old?.evidence_ref||randomUUID();if(!old){await tx`insert into access_local_identity_proofs(proposal_ref,local_user_ref,target_ref,status,evidence_ref) values(${b.proposal_ref},${actor.user_id},${actor.target_ref},'proved',${evidence_ref})`;await audit(tx,actor.user_id,'identity.local_proved',b.proposal_ref);}return {local_user_ref:actor.user_id,target_ref:actor.target_ref,evidence_ref};});
   try{await prove(b.proposal_ref,account);return json({status:'proved'});}catch(e){if(e.status&&e.status<500)throw e;return json({status:'pending'},202);}
  }
  if(path==='/federation/identity/proofs'&&cfg.side==='central'){
   if(!assertion||method!=='POST')fail(403,'invalid_authority');fields(b,['proposal_ref','local_user_ref','target_ref','evidence_ref']);if(!uuid(b.proposal_ref)||!uuid(b.local_user_ref)||!uuid(b.evidence_ref)||assertion.actor_identity_ref!==b.local_user_ref)fail(403,'invalid_authority');
   return sql.begin(async tx=>{await lock(tx);const [link]=await tx`select * from access_person_links where proposal_ref=${b.proposal_ref} and hub_id=${cfg.hubId} for update`;
    if(!link||!['pending','proved','active'].includes(link.status))fail(403,'invalid_identity_proposal');
    if(link.local_user_ref){if(link.local_user_ref!==b.local_user_ref||link.target_ref!==b.target_ref||link.evidence_ref!==b.evidence_ref)fail(409,'identity_collision');return json({status:'proved'});}
    if(Date.now()>=+link.expires_at)fail(403,'invalid_identity_proposal');
    const [collision]=await tx`select proposal_ref from access_person_links where hub_id=${cfg.hubId} and local_user_ref=${b.local_user_ref} and proposal_ref<>${b.proposal_ref}`;if(collision)fail(409,'identity_collision');
    await tx`update access_person_links set local_user_ref=${b.local_user_ref},target_ref=${b.target_ref},evidence_ref=${b.evidence_ref},status='proved' where proposal_ref=${b.proposal_ref}`;await audit(tx,b.local_user_ref,'identity.remote_proved',b.proposal_ref);return json({status:'proved'});
   });
  }
  const admin=path.match(/^\/central\/identity-links\/([0-9a-f-]{36})\/revoke$/),self=path.match(/^\/identity\/link-proposals\/([0-9a-f-]{36})\/(confirm|revoke)$/);
  if((admin||self)&&method==='POST'&&cfg.side==='central'){
   confirmed(b);const ref=(admin||self)[1],revoke=!!admin||self[2]==='revoke';
   const result=await sql.begin(async tx=>{await lock(tx);let actor,person;if(admin)actor=await session(tx,req,{global:true,fresh:true});else ({actor,person}=await owner(tx,req));
    const [link]=await tx`select * from access_person_links where proposal_ref=${ref} and hub_id=${cfg.hubId} for update`;
    if(!link||!admin&&(!person||person.person_ref!==link.person_ref)||cfg.localControlPlane)fail(409,'identity_proof_required');return delivery.decide(tx,actor,link,revoke);
   });return delivery.outcome(result);
  }
  return null;
 }
 return {handle,receive:delivery.receive,ack:delivery.ack,reconcile};
}
const uuid=value=>typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(value);
