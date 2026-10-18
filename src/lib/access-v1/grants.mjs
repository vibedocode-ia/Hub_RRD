import {randomUUID} from 'node:crypto';
export function createGrantManager({cfg,sql,lock,session,fields,fail,json,audit,idempotent,outbox,envelope}){
 async function handle(req,path,method,b){
  if(cfg.side!=='central'||!path.startsWith('/central/godadmin-grants'))return null;
  return sql.begin(async tx=>{
   await lock(tx);
   if(method==='GET'){
    const actor=await session(tx,req,{identityOnly:true});
    const [grant]=await tx`select grant_ref from access_grants where identity_ref=${actor.user_id} and status='active'`;
    const grants=grant?await tx`select grant_ref,identity_ref,status,revision,protected_principal from access_grants order by grant_ref`:await tx`select grant_ref,identity_ref,status,revision,protected_principal from access_grants where identity_ref=${actor.user_id}`;
    return json({grants:grants.map(r=>({...r,revision:Number(r.revision)}))});
   }
   fields(b,method==='POST'&&path==='/central/godadmin-grants'?['identity_ref','confirmed']:['operation','expected_revision','confirmed']);
   if(b.confirmed!==true)fail(403,'confirmation_required');
   const accepting=b.operation==='accept';
   const actor=await session(tx,req,{global:!accepting,identityOnly:accepting,fresh:true});
   const result=await idempotent(tx,actor.user_id,'central.grant',req.headers.get('idempotency-key'),{path,...b},async()=>{
    if(path==='/central/godadmin-grants'&&method==='POST'){
     if(typeof b.identity_ref!=='string'||!/^[0-9a-f-]{36}$/.test(b.identity_ref))fail(422,'schema_invalid');
     const [account]=await tx`select a.user_id from access_accounts a join users u on u.id=a.user_id where a.user_id=${b.identity_ref} and a.status='ready' and a.email_evidence_ref is not null and a.phone_evidence_ref is not null and u.active=true`;
     if(!account)fail(403,'verified_identity_required');
     const [prior]=await tx`select grant_ref from access_grants where identity_ref=${b.identity_ref} and status in ('active','pending','suspended')`;if(prior)fail(409,'grant_exists');
     const ref=randomUUID();await tx`insert into access_grants(grant_ref,identity_ref,status,revision,protected_principal) values(${ref},${b.identity_ref},'pending',1,false)`;
     await audit(tx,actor.user_id,'godadmin.proposed',ref);return {grant_ref:ref,status:'pending',revision:1};
    }
    const match=path.match(/^\/central\/godadmin-grants\/([0-9a-f-]{36})\/transitions$/);if(!match||method!=='POST')fail(404,'not_found');
    if(!Number.isSafeInteger(b.expected_revision))fail(422,'schema_invalid');
    const [grant]=await tx`select * from access_grants where grant_ref=${match[1]} for update`;
    if(!grant||Number(grant.revision)!==b.expected_revision)fail(409,'grant_conflict');
    let status;
    if(accepting){if(grant.identity_ref!==actor.user_id||grant.status!=='pending')fail(403,'invalid_authority');status='active';}
    else if(['revoke','suspend'].includes(b.operation)){
     if(grant.status==='revoked'||grant.protected_principal)fail(409,'protected_grant');
     if(grant.status==='active'){const [n]=await tx`select count(*)::int as n from access_grants where status='active'`;if(n.n<=1)fail(409,'last_godadmin');}
     status=b.operation==='revoke'?'revoked':'suspended';
    }else if(b.operation==='resume'&&grant.status==='suspended')status='active';
    else fail(403,'invalid_transition');
    const revision=Number(grant.revision)+1;
    await tx`update access_grants set status=${status},revision=${revision} where grant_ref=${grant.grant_ref}`;
    await audit(tx,actor.user_id,'godadmin.'+status,grant.grant_ref);
    await outbox(tx,grant.grant_ref,envelope('event',{event_type:'godadmin.grant_changed',grant_ref:grant.grant_ref,identity_ref:grant.identity_ref,grant_revision:revision,grant_status:status,protected_principal:grant.protected_principal,federation_epoch:cfg.epoch}));
    return {grant_ref:grant.grant_ref,status,revision};
   });return json(result,path==='/central/godadmin-grants'?201:200);
  });
 }
 return {handle};
}
