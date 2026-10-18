import https from 'node:https';
import {createIdentityAccess} from './identity.mjs';
import {createKnowledgeAccess} from './knowledge.mjs';
import {AsyncLocalStorage} from 'node:async_hooks';
import {createChannelAccess} from './channel.mjs';
import {createRoleManager,rank,catalog} from './roles.mjs';
import {createGrantManager} from './grants.mjs';
import {randomUUID,randomBytes,X509Certificate} from 'node:crypto';
import {migrateDisposable} from './migrate.mjs';
import {parsePhoneNumberFromString} from 'libphonenumber-js/max';
import {canonical,digest,sign,verify,validate,parse} from './protocol.mjs';
import {verifyPassword,hashPassword,validatePassword} from './credentials.mjs';
const prefix='/api/access/v1';
const opaque=()=>randomBytes(24).toString('base64url');
const now=()=>Math.floor(Date.now()/1000);
const fail=(status,code)=>{throw Object.assign(new Error(code),{status});};
const fields=(value,required,optional=[])=>{if(!value||typeof value!=='object'||Array.isArray(value)||required.some(k=>!Object.hasOwn(value,k))||Object.keys(value).some(k=>!required.includes(k)&&!optional.includes(k)))fail(422,'schema_invalid');};
const equal=(a,b)=>canonical(a)===canonical(b);
const zero=epoch=>({federation_epoch:epoch,central_revision:0,local_revision:0,block_generation:0,membership_generation:0});
const ranks={superadmin:400,admin:300,operator:200};
const operational=['profile.read','sofia.use'];
export function createAccessService(cfg){
 const sql=cfg.sql;
 const channelContext=new AsyncLocalStorage();
 const effective=state=>state?.role.key==='superadmin'?{...state,capabilities:[...new Set([...state.capabilities,...catalog.map(c=>c.key)])]}:state?.role.key==='admin'?{...state,capabilities:[...new Set([...state.capabilities,'people.manage','access.roles.manage'])]}:state;
 const rateBuckets=new Map();
 const audience=cfg.side==='central'?'urn:hvd:central:access:v1':`urn:hvd:hub:${cfg.hubId}:access:v1`;
 const peerAudience=cfg.side==='central'?`urn:hvd:hub:${cfg.hubId}:access:v1`:'urn:hvd:central:access:v1';
 const peerSide=cfg.side==='central'?'hub':'central';
 const initialize=async()=>{if(cfg.enabled!==true)fail(503,'feature_disabled');await migrateDisposable(sql,cfg);};
 const lock=async tx=>{await tx.unsafe('LOCK TABLE access_accounts,access_memberships,access_grants IN SHARE ROW EXCLUSIVE MODE');await tx.unsafe('LOCK TABLE access_roles IN SHARE ROW EXCLUSIVE MODE');};
 const audit=async(tx,actor,action,target,version=null)=>tx`insert into access_audit(actor_ref,action,target_ref,version) values(${actor},${action},${target},${tx.json(version)})`;
 const envelope=(kind,payload)=>sign({protocol:'hvd.access.v1',kind,message_id:randomUUID(),hub_id:cfg.hubId,issuer:cfg.side,audience:peerAudience,issued_at:now(),nonce:opaque(),signing_key_id:cfg.side+'-message',payload},cfg.messageKey);
 const outbox=async(tx,target,m)=>{validate('message',m);await tx`insert into access_outbox(message_id,target_ref,body) values(${m.message_id},${target},${tx.json(m)})`;};
 const nativeActive=async(tx,user)=>{const rows=cfg.side==='central'?await tx`select active as active,password_hash from users where id=${user}`:await tx`select is_active as active,password_hash from users where id=${user}`;return rows[0];};
 const session=async(tx,req,{global=false,identityOnly=false,touch=false,fresh=false}={})=>{
  const channel=channelContext.getStore();
  if(channel){
   const [row]=await tx`select a.*,a.user_id,m.state from access_accounts a left join access_memberships m on m.target_ref=a.target_ref where a.user_id=${channel.user_id}`;
   const native=row&&await nativeActive(tx,row.user_id);if(!row||!native?.active||row.status!=='ready')fail(401,'unauthorized');
   if(fresh&&(!channel.confirmedAt||Date.now()-channel.confirmedAt>=900000))fail(403,'fresh_confirmation_required');
   if(global){const [grant]=await tx`select * from access_grants where identity_ref=${row.user_id} and status='active'`;if(!grant||channel.mode!=='godadmin')fail(403,'invalid_authority');row.grant=grant;}
   else if(!identityOnly&&(!row.state||row.hub_id!==cfg.hubId||row.state.membership_status!=='active'||row.state.local_disabled||row.state.central_blocked))fail(403,'invalid_authority');
   row.state=effective(row.state);return row;
  }
  const token=(req.headers.get('cookie')||'').split(';').map(s=>s.trim()).find(s=>s.startsWith('access_v1='))?.slice(10);if(!token)fail(401,'unauthorized');
  const [row]=await tx`select s.*,a.target_ref,a.hub_id,a.status,a.credential_version as current_cv,a.session_version as current_sv,m.state from access_sessions s join access_accounts a on a.user_id=s.user_id left join access_memberships m on m.target_ref=a.target_ref where s.token_hash=${digest(token)} for update of s`;
  if(!row||row.hub_id!==cfg.hubId||row.status!=='ready'||row.credential_version!==row.current_cv||row.session_version!==row.current_sv||Date.now()>=+row.absolute_expires_at||Date.now()>=+row.last_activity_at+8*3600000)fail(401,'unauthorized');
  const native=await nativeActive(tx,row.user_id);if(!native?.active||!global&&!identityOnly&&(!row.state||row.state.membership_status!=='active'||row.state.local_disabled||row.state.central_blocked))fail(401,'unauthorized');
  if(fresh&&Date.now()-+row.created_at>=900000)fail(403,'reauthentication_required');
  if(global){const [grant]=await tx`select * from access_grants where identity_ref=${row.user_id} and status='active'`;if(!grant)fail(403,'invalid_authority');row.grant=grant;}
  if(touch)await tx`update access_sessions set last_activity_at=now() where token_hash=${row.token_hash}`;
  row.state=effective(row.state);return row;
 };
 // Same live database authority for login, me and native portal projection.
 const portalAuthority=async(tx,actor)=>{
  const [grant]=cfg.side==='central'?await tx`select grant_ref from access_grants where identity_ref=${actor.user_id} and status='active'`:[];
  if(!grant&&(!actor.state||actor.state.membership_status!=='active'||actor.state.local_disabled||actor.state.central_blocked))fail(401,'unauthorized');
  const state=effective(actor.state);
  return {authority_mode:grant?'godadmin':'hub_local',role:state?.role||null,capabilities:state?.capabilities||[],version:state?.version||null};
 };
 const cookie=token=>`access_v1=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=86400`;
 const json=(data,status=200,headers={})=>new Response(data===null?null:JSON.stringify(data),{status,headers:{'content-type':'application/json','cache-control':'no-store',...headers}});
 const proofCheck=async(tx,ref,actor,confirmation,capability)=>{
  const [row]=await tx`select body from access_proofs where proof_id=${ref}`;const p=row?.body;
  if(!p||!verify(p,cfg.proofPublic)||p.signing_key_id!=='central-proof'||p.issuer!=='central'||p.hub_id!==cfg.hubId||p.audience!==audience||p.actor_identity_ref!==actor||p.confirmation_ref!==confirmation||!p.capabilities.includes(capability))fail(403,'invalid_authority');
  if(p.issued_at>now()+60||p.expires_at<=now()||p.expires_at<=p.issued_at||p.expires_at-p.issued_at>900)fail(403,'expired_proof');
  const [known]=await tx`select * from access_grants where grant_ref=${p.grant_ref}`;
  if(known&&(known.identity_ref!==actor||known.status!=='active'||Number(known.revision)>p.grant_revision))fail(403,'invalid_authority');
  if(cfg.side==='hub'){
   try{const result=await send('/central/proof-introspections',p);if(result.active!==true||result.grant_revision!==p.grant_revision)fail(403,'invalid_authority');}
   catch(e){if(!['ECONNREFUSED','ENOTFOUND','ETIMEDOUT','ECONNRESET','EHOSTUNREACH'].includes(e.code)&&e.message!=='peer_timeout')throw e;}
  }
  return p;
 };
 const attest=(path,body,authority={},method='POST')=>sign({method,path:prefix+path,body_digest:digest(canonical(body)),request_id:randomUUID(),issued_at:now(),hub_id:cfg.hubId,issuer:cfg.side,signing_key_id:cfg.side+'-message',...authority},cfg.messageKey);
 async function send(path,body,authority={},method='POST'){
  // Registry URL only: never read an endpoint, audience, or key URL from a request.
  const url=new URL(prefix+path,cfg.peerUrl);if(url.protocol!=='https:'||url.username||url.password)fail(503,'invalid_registry');
  const bytes=canonical(body);const assertion=attest(path,body,authority,method);
  return new Promise((resolve,reject)=>{
   const req=https.request(url,{method,agent:false,key:cfg.tls.key,cert:cfg.tls.cert,ca:cfg.tls.ca,minVersion:'TLSv1.3',maxVersion:'TLSv1.3',headers:{'content-type':'application/json','x-access-request':Buffer.from(canonical(assertion)).toString('base64url'),...(authority.authorization_ref?{'idempotency-key':authority.authorization_ref}:{})},timeout:5000},res=>{
    const raw=res.socket.getPeerCertificate().raw;
    if(!raw||new X509Certificate(raw).fingerprint256!==cfg.peerFingerprint){res.destroy();reject(new Error('peer_mismatch'));return;}
    let text='';res.on('data',c=>{text+=c;if(Buffer.byteLength(text)>262144)res.destroy();});res.on('error',reject);res.on('end',()=>{try{const result=text?parse(text):null;if(res.statusCode>=400)reject(Object.assign(new Error(result?.error||'peer_rejected'),{status:res.statusCode}));else resolve(result);}catch(e){reject(e);}});
   });req.on('timeout',()=>req.destroy(new Error('peer_timeout')));req.on('error',reject);req.end(method==='GET'?undefined:bytes);
  });
 }
 async function authenticatePeer(req,peer,body){
  if(!peer?.authorized||peer.fingerprint!==cfg.peerFingerprint)fail(401,'transport_authentication');
  let a;try{a=parse(Buffer.from(req.headers.get('x-access-request')||'','base64url').toString('utf8'));}catch{fail(401,'request_signature');}
  const basic=['method','path','body_digest','request_id','issued_at','hub_id','issuer','signing_key_id','signature'];
  fields(a,basic,['actor_identity_ref','proof_ref','confirmation_ref','authorization_ref']);
  if(a.method!==req.method||a.path!==new URL(req.url).pathname||a.body_digest!==digest(canonical(body))||a.hub_id!==cfg.hubId||a.issuer!==peerSide||a.signing_key_id!==peerSide+'-message'||!verify(a,cfg.peerMessageKey)||Math.abs(now()-a.issued_at)>60)fail(401,'request_signature');
  try{await sql`insert into access_request_nonces(peer,request_id,expires_at) values(${peerSide},${a.request_id},now()+interval '120 seconds')`;}catch(e){if(e.code==='23505')fail(409,'request_replay');throw e;}
  return a;
 }
 const idempotent=async(tx,actor,operation,key,body,fn)=>{
  if(typeof key!=='string'||key.length<16||key.length>160)fail(422,'idempotency_key_required');
  const [prior]=await tx`select * from access_http_idempotency where actor_ref=${actor} and operation=${operation} and key=${key}`;
  if(prior){if(prior.digest!==digest(body))fail(409,'idempotency_mismatch');return prior.response;}
  const result=await fn();await tx`insert into access_http_idempotency(actor_ref,operation,key,digest,response) values(${actor},${operation},${key},${digest(body)},${tx.json(result)})`;return result;
 };
 function accountInput(b){
  fields(b,['name','email','phone','username']);
  if(typeof b.name!=='string'||!b.name.trim()||b.name.length>200||typeof b.email!=='string'||!/^\S+@[^\s@]+\.[^\s@]+$/.test(b.email.trim())||typeof b.username!=='string'||!/^[a-z][a-z0-9._-]{2,63}$/.test(b.username.toLowerCase()))fail(422,'invalid_identifiers');
  const p=typeof b.phone==='string'&&b.phone.startsWith('+')?parsePhoneNumberFromString(b.phone):null;if(!p?.isValid())fail(422,'invalid_identifiers');
  return {name:b.name.trim(),email:b.email.trim().toLowerCase(),phone:p.number,username:b.username.toLowerCase()};
 }
 async function reserveAccount(tx,input,actor){
  const b=accountInput(input);const user=randomUUID(),target=opaque();
  const prior=await tx`select user_id from access_accounts where email=${b.email} or phone=${b.phone} or username=${b.username}`;if(prior.length)fail(409,'identity_collision');
  // Preserve all existing UUIDs. Never merge or link on equal identifiers.
  try{
   if(cfg.side==='central')await tx`insert into users(id,full_name,email,phone,password_hash,role,active) values(${user},${b.name},${b.email},${b.phone},null,'client',false)`;
   else await tx`insert into users(id,name,email,phone,password_hash,role,is_active) values(${user},${b.name},${b.email},${b.phone.slice(1)},'','OPERATOR',false)`;
   await tx`insert into access_accounts(user_id,hub_id,target_ref,username,email,phone,status) values(${user},${cfg.hubId},${target},${b.username},${b.email},${b.phone},'onboarding')`;
  }catch(e){if(e.code==='23505')fail(409,'identity_collision');throw e;}
  await audit(tx,actor,'account.reserved',target);return {target_ref:target,local_user_ref:user,onboarding_status:'verification_pending'};
 }
 const installProof=async p=>{
  validate('proof',p);if(cfg.side!=='hub'||!verify(p,cfg.proofPublic)||p.signing_key_id!=='central-proof'||p.issuer!=='central'||p.hub_id!==cfg.hubId||p.audience!==audience||p.issued_at>now()+60||p.expires_at<=now()||p.expires_at-p.issued_at>900||p.expires_at<=p.issued_at)fail(403,'invalid_authority');
  await sql.begin(async tx=>{const [old]=await tx`select body from access_proofs where proof_id=${p.proof_id} for update`;if(old&&!equal(old.body,p))fail(409,'proof_mismatch');if(!old)await tx`insert into access_proofs(proof_id,body,expires_at) values(${p.proof_id},${tx.json(p)},${new Date(p.expires_at*1000)})`;});return {proof_id:p.proof_id};
 };
 function makeProof(actor,capabilities=['people.manage']){
  const proof=sign({proof_id:randomUUID(),issuer:'central',audience:peerAudience,hub_id:cfg.hubId,actor_identity_ref:actor.user_id,grant_ref:actor.grant.grant_ref,grant_revision:Number(actor.grant.revision),issued_at:now(),expires_at:now()+900,capabilities,confirmation_ref:opaque(),signing_key_id:'central-proof'},cfg.proofKey);validate('proof',proof);return proof;
 }
 async function queueSet(tx,actor,target,user,proof,desired,expected,operation='membership.set',rebaseOf=null){
  const auth=opaque();const command=envelope('command',{command_id:randomUUID(),operation,actor:{identity_ref:actor.user_id,authority:'godadmin',authorization_ref:auth},proof_ref:proof.proof_id,target_ref:target,expected,central_revision:desired.version.central_revision,block_generation:desired.version.block_generation,membership_generation:desired.version.membership_generation,desired,reason_code:rebaseOf?'explicit_rebase':'requested',rebase_of:rebaseOf});
  const authorization={authorization_ref:auth,actor_identity_ref:actor.user_id,proof_ref:proof.proof_id,confirmation_ref:proof.confirmation_ref,operation:'federation.command',payload_digest:digest(command.payload),expires_at:proof.expires_at};
  await outbox(tx,target,command);await tx`insert into access_desired(target_ref,hub_id,desired,applied,status,last_message_id) values(${target},${cfg.hubId},${tx.json(desired)},null,'queued',${command.message_id}) on conflict(target_ref) do update set desired=excluded.desired,status='queued',last_message_id=excluded.last_message_id`;
  await tx`insert into access_delivery_context(message_id,proof,decision) values(${command.message_id},${tx.json(proof)},${tx.json(authorization)})`;
  await audit(tx,actor.user_id,'central.desired',target,desired.version);return command;
 }
 async function createCentral(req,b){
  fields(b,['hub_id','name','email','phone','username','role','capabilities','confirmed']);
  if(cfg.side!=='central'||b.hub_id!==cfg.hubId||b.confirmed!==true||!(Object.hasOwn(ranks,b.role)||b.role?.kind==='custom')||!Array.isArray(b.capabilities)||b.capabilities.some(c=>!catalog.some(x=>x.key===c)||ranks[b.role]<300&&catalog.some(x=>x.key===c&&!x.delegable))||new Set(b.capabilities).size!==b.capabilities.length)fail(403,'invalid_authority');
  accountInput({name:b.name,email:b.email,phone:b.phone,username:b.username});
  // Commit an immutable, confirmed intent BEFORE the first remote side effect.
  const intent=await sql.begin(async tx=>{await lock(tx);const actor=await session(tx,req,{global:true,fresh:true});return idempotent(tx,actor.user_id,'central.create',req.headers.get('idempotency-key'),b,async()=>{
   const ref=randomUUID(),proof=makeProof(actor);
   await tx`insert into access_provision_intents(intent_ref,actor_ref,request,proof,authorization_ref) values(${ref},${actor.user_id},${tx.json(b)},${tx.json(proof)},${opaque()})`;
   await audit(tx,actor.user_id,'central.provision.pending',ref);return {intent_ref:ref};
  });});
  return resumeProvision(intent.intent_ref);
 }
 async function resumeProvision(ref){
  try{return await sql.begin(async tx=>{
   const [intent]=await tx`select * from access_provision_intents where intent_ref=${ref} for update`;
   if(intent.status==='completed')return intent.result;
   const p=intent.proof;
   const [grant]=await tx`select status,revision from access_grants where grant_ref=${p.grant_ref}`;
   if(p.expires_at<=now()||!grant||grant.status!=='active'||Number(grant.revision)!==p.grant_revision)fail(403,'intent_reauthorization_required');
   await send('/federation/proofs',p);
   const b=intent.request;
   const reserved=await send('/local/accounts',accountInput({name:b.name,email:b.email,phone:b.phone,username:b.username}),{actor_identity_ref:intent.actor_ref,proof_ref:p.proof_id,confirmation_ref:p.confirmation_ref,authorization_ref:intent.authorization_ref});
   await lock(tx);
   const expected=zero(cfg.epoch);const state={local_user_ref:reserved.local_user_ref,identity_ref:null,membership_status:'active',local_disabled:false,central_blocked:false,role:typeof b.role==='string'?{kind:'system',key:b.role}:b.role,capabilities:b.capabilities,version:{...expected,central_revision:1,local_revision:1,membership_generation:1}};
   await queueSet(tx,{user_id:intent.actor_ref},reserved.target_ref,reserved.local_user_ref,p,state,expected);
   await tx`update access_provision_intents set status='completed',result=${tx.json(reserved)},last_error=null where intent_ref=${ref}`;
   return reserved;
  });}catch(e){
   await sql`update access_provision_intents set last_error=${e.status?e.message:'transport_or_transaction_failure'} where intent_ref=${ref}`;
   if(e.status&&e.status<500)throw e;
   return {intent_ref:ref,status:'pending'};
  }
 }
 async function syncNative(tx,state){
  if(cfg.side==='hub'){
   const role=state.role.kind==='custom'?'OPERATOR':{superadmin:'OWNER',admin:'ADMIN',operator:'OPERATOR'}[state.role.key];if(!role)fail(422,'schema_invalid');
   await tx`update users set role=${role},is_active=${state.membership_status==='active'&&!state.local_disabled&&!state.central_blocked} where id=${state.local_user_ref}`;
   await tx`delete from user_permissions where user_id=${state.local_user_ref}`;
   for(const cap of state.capabilities)await tx`insert into user_permissions(user_id,permission_key) values(${state.local_user_ref},${cap})`;
  }
 }
 async function validRemoteRole(tx,role,caps){
  if(role.kind==='system')return Object.hasOwn(ranks,role.key)&&caps.every(cap=>catalog.some(c=>c.key===cap&&(ranks[role.key]>=300||c.delegable)));
  if(role.kind!=='custom')return false;
  const [r]=await tx`select capabilities from access_roles where hub_id=${cfg.hubId} and role_ref=${role.role_ref} and revision=${role.role_revision} and active=true`;
  return !!r&&caps.every(cap=>r.capabilities.includes(cap)&&catalog.some(c=>c.key===cap&&c.delegable));
 }
 async function receiveMessage(m){
  validate('message',m);
  if(m.issuer!==peerSide||m.hub_id!==cfg.hubId||m.audience!==audience||m.signing_key_id!==peerSide+'-message'||!verify(m,cfg.peerMessageKey))fail(403,'invalid_authority');
  return await sql.begin(async tx=>{await lock(tx);
   const [prior]=await tx`select * from access_inbox where message_id=${m.message_id}`;
   if(prior){if(prior.digest!==digest(m))fail(409,'replay_payload_mismatch');return prior.result;}
   if(cfg.side==='hub'&&m.kind==='event'&&['identity.linked','identity.updated'].includes(m.payload.event_type)){
    await identity.receive(tx,m.payload,m);
    const ack=envelope('ack',{acked_message_id:m.message_id,command_id:null,status:'applied',reason_code:'ok',desired_version:null,applied_version:m.payload.version,state_digest:digest({}),conflict_ref:null});
    await tx`insert into access_inbox(message_id,hub_id,issuer,digest,command_id,result) values(${m.message_id},${cfg.hubId},${m.issuer},${digest(m)},null,${tx.json(ack)})`;await outbox(tx,m.payload.link_decision_ref,ack);return ack;
   }
   if(cfg.side==='hub'&&m.kind==='event'&&m.payload.event_type==='godadmin.grant_changed'){
    const p=m.payload;if(p.federation_epoch!==cfg.epoch)fail(403,'epoch_mismatch');
    const [known]=await tx`select * from access_grants where grant_ref=${p.grant_ref} for update`;
    if(known&&known.identity_ref!==p.identity_ref)fail(403,'invalid_authority');
    if(!known||Number(known.revision)<p.grant_revision&&known.status!=='revoked')await tx`insert into access_grants(grant_ref,identity_ref,status,revision,protected_principal) values(${p.grant_ref},${p.identity_ref},${p.grant_status},${p.grant_revision},${p.protected_principal}) on conflict(grant_ref) do update set status=excluded.status,revision=excluded.revision,protected_principal=excluded.protected_principal`;
    const ack=envelope('ack',{acked_message_id:m.message_id,command_id:null,status:'applied',reason_code:'ok',desired_version:null,applied_version:zero(cfg.epoch),state_digest:digest({}),conflict_ref:null});
    await audit(tx,null,'godadmin.observed',p.grant_ref);await tx`insert into access_inbox(message_id,hub_id,issuer,digest,command_id,result) values(${m.message_id},${cfg.hubId},${m.issuer},${digest(m)},null,${tx.json(ack)})`;await outbox(tx,p.grant_ref,ack);return ack;
   }
   if(cfg.side==='central'&&m.kind==='event'){
    const p=m.payload;let target,state,version;
    if(p.event_type==='membership.changed'){
     target=p.aggregate_ref;state=p.state;version=state.version;
     const [current]=await tx`select * from access_desired where target_ref=${target} and hub_id=${cfg.hubId} for update`;
     const baseline=current?.applied?.version||zero(cfg.epoch);
     if(version.federation_epoch!==cfg.epoch||!equal(p.previous,baseline)||version.local_revision!==baseline.local_revision+1||version.central_revision!==baseline.central_revision||version.block_generation!==baseline.block_generation||version.membership_generation!==(current?baseline.membership_generation:1))fail(409,'version_conflict');
     if((!current?.applied&&state.identity_ref!==null)||(current?.applied&&(current.applied.local_user_ref!==state.local_user_ref||current.applied.identity_ref!==state.identity_ref)))fail(403,'invalid_authority');
     await tx`insert into access_desired(target_ref,hub_id,desired,applied,status) values(${target},${cfg.hubId},null,${tx.json(state)},'observed') on conflict(target_ref) do update set applied=excluded.applied,status=case when access_desired.desired is null then 'observed' else access_desired.status end`;
     await audit(tx,p.actor.identity_ref,'hub.observed',target,version);
    }else if(p.event_type==='identity.provisional_created'){
     target=p.provisional_ref;version=p.version;
     const [current]=await tx`select applied from access_desired where target_ref=${target} and hub_id=${cfg.hubId}`;
     if(!current?.applied||current.applied.local_user_ref!==p.local_user_ref||version.federation_epoch!==cfg.epoch)fail(403,'unknown_target');
     state={};await audit(tx,p.actor.identity_ref,'hub.'+p.onboarding_status,target,version);
    }else fail(422,'unsupported_slice');
    const ack=envelope('ack',{acked_message_id:m.message_id,command_id:null,status:'applied',reason_code:'ok',desired_version:null,applied_version:version,state_digest:digest(state),conflict_ref:null});
    await tx`insert into access_inbox(message_id,hub_id,issuer,digest,command_id,result) values(${m.message_id},${cfg.hubId},${m.issuer},${digest(m)},null,${tx.json(ack)})`;
    await outbox(tx,target,ack);return ack;
   }
   if(cfg.side!=='hub'||m.kind!=='command')fail(422,'unsupported_slice');
   const c=m.payload;const [duplicate]=await tx`select * from access_inbox where command_id=${c.command_id}`;if(duplicate)fail(409,'command_id_reused');
   const [account]=await tx`select * from access_accounts where target_ref=${c.target_ref} and hub_id=${cfg.hubId}`;
   const [existing]=await tx`select state from access_memberships where target_ref=${c.target_ref} for update`;
   let state=existing?.state,version=state?.version||zero(cfg.epoch);let status='applied',reason='ok';
   if(!account||account.user_id!==c.desired.local_user_ref){status='rejected';reason='unknown_target';}
   else if(c.expected.federation_epoch!==cfg.epoch||c.desired.version.federation_epoch!==cfg.epoch){status='fenced';reason='epoch_mismatch';}
   else{
    try{
     const [stored]=await tx`select body from access_proofs where proof_id=${c.proof_ref}`;
     const proof=await proofCheck(tx,c.proof_ref,c.actor.identity_ref,stored?.body.confirmation_ref,'people.manage');
     const [decision]=await tx`select body from access_authorizations where authorization_ref=${c.actor.authorization_ref}`;
     const d=decision?.body;
     if(!d||d.operation!=='federation.command'||d.actor_identity_ref!==c.actor.identity_ref||d.proof_ref!==c.proof_ref||d.confirmation_ref!==proof.confirmation_ref||d.payload_digest!==digest(c)||d.expires_at<=now())fail(403,'invalid_authority');
     if(c.actor.authority!=='godadmin'||!c.actor.authorization_ref||proof.actor_identity_ref!==c.actor.identity_ref)fail(403,'invalid_authority');
    }catch(e){status='rejected';reason=e.message==='expired_proof'?'expired_proof':'invalid_authority';}
   }
   if(status==='applied'&&state?.role.key==='superadmin'&&account?.status==='ready'&&(c.operation==='membership.revoke'||c.operation==='membership.set'&&c.desired.role.key!=='superadmin')){
    const [remaining]=await tx`select count(*)::int n from access_memberships m join access_accounts a on a.target_ref=m.target_ref join users u on u.id=a.user_id where a.hub_id=${cfg.hubId} and a.status='ready' and u.is_active=true and m.target_ref<>${c.target_ref} and m.state->'role'->>'key'='superadmin' and m.state->>'membership_status'='active' and m.state->>'local_disabled'='false' and m.state->>'central_blocked'='false'`;
    if(!remaining.n){status='rejected';reason='invalid_authority';}
   }
   if(status==='applied'&&c.rebase_of){const [conflict]=await tx`select * from access_conflicts where conflict_ref=${c.rebase_of} and target_ref=${c.target_ref} and status='open'`;if(!conflict||c.reason_code!=='explicit_rebase'){status='rejected';reason='invalid_authority';}}
   if(status==='applied'){
    if(c.central_revision<=version.central_revision){status='stale';reason='stale_revision';}
    else if(c.operation==='membership.block'&&state){
     if(c.block_generation<=version.block_generation||!c.desired.central_blocked||c.desired.membership_status!==(state.membership_status)||c.desired.version.block_generation!==c.block_generation){status='rejected';reason='schema_invalid';}
     else{
      state={...state,central_blocked:true,version:{...version,central_revision:c.central_revision,block_generation:c.block_generation,local_revision:version.local_revision+1}};version=state.version;
      await tx`update access_memberships set state=${tx.json(state)} where target_ref=${c.target_ref}`;
      await syncNative(tx,state);await audit(tx,c.actor.identity_ref,'membership.blocked',c.target_ref,version);
     }
    }
    else if(c.operation==='membership.revoke'&&state){
     if(c.expected.membership_generation>version.membership_generation){status='conflict';reason='version_conflict';}
     else{
      state={...state,membership_status:'revoked',version:{...version,central_revision:c.central_revision,local_revision:version.local_revision+1}};version=state.version;
      await tx`update access_memberships set state=${tx.json(state)} where target_ref=${c.target_ref}`;
      await syncNative(tx,state);await audit(tx,c.actor.identity_ref,'membership.revoked',c.target_ref,version);
     }
    }
    else if(c.operation!=='membership.set'){status='rejected';reason='schema_invalid';}
    else if(!equal(c.expected,version)){status='conflict';reason='version_conflict';}
    else if(state?.central_blocked||state?.membership_status==='revoked'){status='rejected';reason=state.central_blocked?'blocked':'revoked';}
    else if(c.desired.identity_ref!==(state?.identity_ref||null)||!await validRemoteRole(tx,c.desired.role,c.desired.capabilities)||c.desired.local_disabled!==(state?.local_disabled||false)||c.desired.central_blocked!==false||c.desired.membership_status!=='active'||c.membership_generation!==(state?version.membership_generation:1)||c.block_generation!==version.block_generation||!equal(c.desired.version,{...version,central_revision:c.central_revision,local_revision:version.local_revision+1,membership_generation:state?version.membership_generation:1})){status='rejected';reason='schema_invalid';}
    else{state=c.desired;version=state.version;await tx`insert into access_memberships(target_ref,state) values(${c.target_ref},${tx.json(state)}) on conflict(target_ref) do update set state=excluded.state`;await syncNative(tx,state);await audit(tx,c.actor.identity_ref,'membership.applied',c.target_ref,version);}
   }
   if(status==='applied'&&existing){
    await tx`update access_accounts set session_version=session_version+1 where user_id=${account.user_id}`;
    await tx`delete from access_sessions where user_id=${account.user_id}`;await tx`delete from sessions where user_id=${account.user_id}`;
   }
   const ack=envelope('ack',{acked_message_id:m.message_id,command_id:c.command_id,status,reason_code:reason,desired_version:c.desired.version,applied_version:version,state_digest:digest(state||{}),conflict_ref:status==='conflict'?randomUUID():null});
   if(status==='conflict')await tx`insert into access_conflicts(conflict_ref,target_ref,message_id,expected,observed,desired,status) values(${ack.payload.conflict_ref},${c.target_ref},${m.message_id},${tx.json(c.expected)},${tx.json(state)},${tx.json(c.desired)},'open')`;
   if(status==='applied'&&c.rebase_of)await tx`update access_conflicts set status='resolved',resolution_message_id=${m.message_id} where conflict_ref=${c.rebase_of}`;
   await tx`insert into access_inbox(message_id,hub_id,issuer,digest,command_id,result) values(${m.message_id},${cfg.hubId},${m.issuer},${digest(m)},${c.command_id},${tx.json(ack)})`;
   await outbox(tx,c.target_ref,ack);return ack;
  });
 }
 async function applyAck(ack){
  validate('message',ack);if(ack.kind!=='ack'||ack.issuer!==peerSide||ack.audience!==audience||ack.hub_id!==cfg.hubId||ack.signing_key_id!==peerSide+'-message'||!verify(ack,cfg.peerMessageKey))fail(403,'invalid_ack');
  let reconciled=null;
  if(cfg.side==='central'&&ack.payload.status==='applied'){const [sent]=await sql`select * from access_outbox where message_id=${ack.payload.acked_message_id}`;if(sent?.body.kind==='command'&&['membership.block','membership.revoke'].includes(sent.body.payload.operation)&&digest(sent.body.payload.desired)!==ack.payload.state_digest){const snapshot=await send('/federation/reconcile',{target_ref:sent.target_ref});validate('state',snapshot.state);if(snapshot.state.local_user_ref!==sent.body.payload.desired.local_user_ref||digest(snapshot.state)!==ack.payload.state_digest||!equal(snapshot.state.version,ack.payload.applied_version)||(sent.body.payload.operation==='membership.block'?!snapshot.state.central_blocked:snapshot.state.membership_status!=='revoked'))fail(403,'invalid_ack');reconciled=snapshot.state;}}
  return await sql.begin(async tx=>{await lock(tx);const [sent]=await tx`select * from access_outbox where message_id=${ack.payload.acked_message_id} for update`;if(!sent)fail(403,'unknown_ack');
   const [desired]=await tx`select * from access_desired where target_ref=${sent.target_ref} for update`;
   if(ack.payload.command_id!==(sent.body.kind==='command'?sent.body.payload.command_id:null))fail(403,'invalid_ack');
   if(sent.body.kind==='event'){
    const event=sent.body.payload;const state=event.event_type==='membership.changed'?event.state:{};
    const version=event.event_type==='membership.changed'?event.state.version:event.event_type==='godadmin.grant_changed'?zero(cfg.epoch):event.version;
    if(ack.payload.status!=='applied'||ack.payload.state_digest!==digest(state)||!equal(ack.payload.applied_version,version))fail(403,'invalid_ack');
    if(['identity.linked','identity.updated'].includes(event.event_type))await identity.ack(tx,sent);
    await tx`update access_outbox set status='acked' where message_id=${sent.message_id}`;return {received:true};
   }
   if(ack.payload.status==='applied'){
    const state=reconciled||sent.body.payload.desired;
    if(!equal(state.version,ack.payload.applied_version)||digest(state)!==ack.payload.state_digest)fail(403,'invalid_ack');
    if(!desired.applied||ack.payload.applied_version.local_revision>desired.applied.version.local_revision)await tx`update access_desired set applied=${tx.json(state)},last_ack=${tx.json(ack)},status=${desired.last_message_id===sent.message_id?'applied':desired.status} where target_ref=${sent.target_ref}`;
   }else if(desired.last_message_id===sent.message_id)await tx`update access_desired set status=${ack.payload.status},last_ack=${tx.json(ack)} where target_ref=${sent.target_ref}`;
   if(ack.payload.status==='conflict')await tx`insert into access_conflicts(conflict_ref,target_ref,message_id,expected,observed,desired,status) values(${ack.payload.conflict_ref},${sent.target_ref},${sent.message_id},${tx.json(sent.body.payload.expected)},${tx.json(desired.applied)},${tx.json(sent.body.payload.desired)},'open') on conflict(conflict_ref) do nothing`;
   if(ack.payload.status==='applied'&&sent.body.payload.rebase_of)await tx`update access_conflicts set status='resolved',resolution_message_id=${sent.message_id} where conflict_ref=${sent.body.payload.rebase_of}`;
   await tx`update access_outbox set status='acked' where message_id=${sent.message_id}`;return {received:true};
  });
 }
 async function prepareDelivery(messageId){
  const [context]=await sql`select * from access_delivery_context where message_id=${messageId}`;
  if(context){await send('/federation/proofs',context.proof);await send('/federation/authorizations',context.decision);}
 }
 async function deliver(row){
  // Recover a committed outcome BEFORE proof installation: an exact duplicate
  // needs no new authority, even if its original proof expired after commit.
  try{const prior=await send('/federation/messages/'+row.message_id+'/result',{}, {},'GET');if(prior.digest!==digest(row.body))fail(409,'replay_payload_mismatch');return prior.result;}catch(e){if(e.status!==404)throw e;}
  try{await prepareDelivery(row.message_id);}catch(e){if(e.status!==403)throw e;/* Let the real destination persist a rejection; never renew the Proof. */}
  return send('/federation/messages',row.body);
 }
 async function dispatch(){
  await identity.reconcile();
  if(cfg.side==='central'){const pending=await sql`select intent_ref from access_provision_intents where status='pending' order by intent_ref limit 20`;for(const intent of pending)await resumeProvision(intent.intent_ref).catch(()=>{});}
  const rows=await sql`select * from access_outbox where status='pending' and next_attempt_at<=now() order by next_attempt_at,message_id limit 20`;
  let delivered=0;
  for(const row of rows){try{if(row.body.kind==='ack'){await send('/federation/messages',row.body);await sql`update access_outbox set status='acked' where message_id=${row.message_id}`;}else{const ack=await deliver(row);await applyAck(ack);}delivered++;}catch(e){await sql`update access_outbox set attempts=attempts+1,status=case when attempts+1>=20 then 'dead_letter' else 'pending' end,next_attempt_at=now()+(${Math.min(300,2**Math.min(row.attempts,9))} * interval '1 second') where message_id=${row.message_id}`;if(cfg.onError)cfg.onError({code:e.message,status:e.status});}}
  return {delivered};
 }
 async function saveMembership(tx,actor,target,old,state,change){
  validate('state',state);await tx`update access_memberships set state=${tx.json(state)} where target_ref=${target}`;await syncNative(tx,state);
  await tx`update access_accounts set session_version=session_version+1 where target_ref=${target}`;
  await tx`delete from access_sessions where user_id=${old.local_user_ref}`;await tx`delete from sessions where user_id=${old.local_user_ref}`;
  await audit(tx,actor.user_id,'membership.local_changed',target,state.version);
  await outbox(tx,target,envelope('event',{event_type:'membership.changed',aggregate_ref:target,actor:{identity_ref:actor.user_id,authority:'hub_local',authorization_ref:opaque()},previous:old.version,state,causation_ref:null,change}));
 }
 const roles=createRoleManager({cfg,fail,fields,audit,idempotent,session,lock,json,saveMembership,proofCheck});
 const knowledge=createKnowledgeAccess({cfg,sql,lock,session,fields,fail,json,audit,send,idempotent});
 const identity=createIdentityAccess({cfg,sql,lock,session,fields,fail,json,audit,send,outbox,envelope,dispatch});
 const grants=createGrantManager({cfg,sql,lock,session,fields,fail,json,audit,idempotent,outbox,envelope});
 async function handle(req,peer=null){
  if(cfg.enabled!==true)return json({error:'not_found'},404);
  try{
   const path=new URL(req.url).pathname.slice(prefix.length);const method=req.method;
   if(!new URL(req.url).pathname.startsWith(prefix+'/'))return json({error:'not_found'},404);
   const text=method==='GET'?'':await req.text();const b=text?parse(text):{};
   const federation=path.startsWith('/federation/')||((path==='/local/accounts'||path.startsWith('/local/roles'))&&req.headers.has('x-access-request'))||path==='/central/proof-introspections';
   let assertion;if(federation)assertion=await authenticatePeer(req,peer,b);
   else if(method!=='GET'&&path!=='/local/login'&&req.headers.get('origin')!==cfg.origin)fail(403,'invalid_origin');
   const identityResult=await identity.handle(req,path,method,b,assertion);if(identityResult)return identityResult;
   const knowledgeResult=await knowledge.handle(req,path,method,b,assertion);if(knowledgeResult)return knowledgeResult;
   const grantResult=await grants.handle(req,path,method,b);if(grantResult)return grantResult;
   if(/^\/central\/hubs\/[^/]+\/roles(?:\/[^/]+)?$/.test(path)){
    if(cfg.side!=='central'||path.split('/')[3]!==cfg.hubId||!['GET','POST','PATCH'].includes(method))fail(403,'invalid_authority');
    const key=req.headers.get('idempotency-key');if(method!=='GET'&&(!key||key.length<16||key.length>160))fail(422,'idempotency_key_required');
    const readRoleCatalog=path==='/central/hubs/'+cfg.hubId+'/roles'&&method==='GET';
    const proof=await sql.begin(async tx=>{await lock(tx);const actor=await session(tx,req,{global:true,fresh:method!=='GET'});return makeProof(actor,readRoleCatalog?['access.roles.manage']:['people.manage']);});
    await send('/federation/proofs',proof);
    const target='/local/roles'+(path.split('/')[5]?'/'+path.split('/')[5]:'');
    const result=await send(target,b,{actor_identity_ref:proof.actor_identity_ref,proof_ref:proof.proof_id,confirmation_ref:proof.confirmation_ref,authorization_ref:req.headers.get('idempotency-key')||opaque()},method);
    // Do not release data after revocation while waiting for the destination.
    await sql.begin(async tx=>{await lock(tx);await session(tx,req,{global:true});});
    return json(result,method==='POST'?201:200);
   }
   const managed=await roles.handle(req,path,method,b,assertion);if(managed)return managed;
   if(method==='POST'&&path==='/central/proof-introspections'&&cfg.side==='central'){
    validate('proof',b);
    if(!verify(b,cfg.proofPublic)||b.signing_key_id!=='central-proof'||b.hub_id!==cfg.hubId||b.audience!==peerAudience||b.expires_at<=now()||b.expires_at-b.issued_at>900)fail(403,'invalid_authority');
    const [grant]=await sql`select identity_ref,status,revision from access_grants where grant_ref=${b.grant_ref}`;
    return json({active:!!grant&&grant.status==='active'&&grant.identity_ref===b.actor_identity_ref&&Number(grant.revision)===b.grant_revision,grant_revision:grant?Number(grant.revision):0});
   }
   if(method==='POST'&&path==='/federation/authorizations'&&cfg.side==='hub'){
    fields(b,['authorization_ref','actor_identity_ref','proof_ref','confirmation_ref','operation','payload_digest','expires_at']);
    if(b.operation!=='federation.command'||!/^[a-f0-9]{64}$/.test(b.payload_digest)||b.expires_at<=now())fail(403,'invalid_authority');
    await sql.begin(async tx=>{const proof=await proofCheck(tx,b.proof_ref,b.actor_identity_ref,b.confirmation_ref,'people.manage');if(b.expires_at>proof.expires_at)fail(403,'invalid_authority');
     const [old]=await tx`select body from access_authorizations where authorization_ref=${b.authorization_ref} for update`;if(old&&!equal(old.body,b))fail(409,'authorization_mismatch');
     if(!old)await tx`insert into access_authorizations(authorization_ref,body) values(${b.authorization_ref},${tx.json(b)})`;
    });return json({installed:true},201);
   }
   if(method==='GET'&&/^\/federation\/messages\/[0-9a-f-]+\/result$/.test(path)){
    const [prior]=await sql`select result,digest from access_inbox where message_id=${path.split('/')[3]} and hub_id=${cfg.hubId} and issuer=${peerSide}`;
    if(!prior)fail(404,'not_found');return json(prior);
   }
   if(method==='POST'&&path==='/federation/reconcile'&&cfg.side==='hub'){
    fields(b,['target_ref']);
    return await sql.begin(async tx=>{await lock(tx);const [row]=await tx`select m.state from access_memberships m join access_accounts a on a.target_ref=m.target_ref where a.target_ref=${b.target_ref} and a.hub_id=${cfg.hubId}`;if(!row)fail(404,'not_found');
     const snapshot_ref=randomUUID();await audit(tx,null,'reconciliation.snapshot',b.target_ref,row.state.version);return json({snapshot_ref,state:row.state});});
   }
   if(method==='POST'&&path==='/federation/proofs')return json(await installProof(b),201);
   if(method==='POST'&&path==='/federation/messages')return json(b.kind==='ack'?await applyAck(b):await receiveMessage(b));
   if(method==='POST'&&path==='/local/accounts'&&assertion){
    const result=await sql.begin(async tx=>{await lock(tx);await proofCheck(tx,assertion.proof_ref,assertion.actor_identity_ref,assertion.confirmation_ref,'people.manage');return idempotent(tx,assertion.actor_identity_ref,'provision',assertion.authorization_ref,b,()=>reserveAccount(tx,b,assertion.actor_identity_ref));});return json(result,201);
   }
   if(method==='POST'&&path==='/local/accounts'&&!assertion){
    fields(b,['hub_id','name','email','phone','username','role','capabilities','confirmed']);
    const result=await sql.begin(async tx=>{await lock(tx);const actor=await session(tx,req,{fresh:true});
     const role=await roles.normalize(tx,b.role);
     if(b.hub_id!==cfg.hubId||!actor.state.capabilities.includes('people.manage')||b.confirmed!==true||!roles.manages(actor,role))fail(403,'invalid_authority');await roles.delegate(tx,actor,role,b.capabilities);
     return idempotent(tx,actor.user_id,'local.create',req.headers.get('idempotency-key'),b,async()=>{
      const account=await reserveAccount(tx,{name:b.name,email:b.email,phone:b.phone,username:b.username},actor.user_id);
      const baseline=zero(cfg.epoch);const state={local_user_ref:account.local_user_ref,identity_ref:null,membership_status:'active',local_disabled:false,central_blocked:false,role,capabilities:b.capabilities,version:{...baseline,local_revision:1,membership_generation:1}};
      await tx`insert into access_memberships(target_ref,state) values(${account.target_ref},${tx.json(state)})`;await syncNative(tx,state);
      await audit(tx,actor.user_id,'membership.created',account.target_ref,state.version);
      await outbox(tx,account.target_ref,envelope('event',{event_type:'membership.changed',aggregate_ref:account.target_ref,actor:{identity_ref:actor.user_id,authority:'hub_local',authorization_ref:opaque()},previous:baseline,state,causation_ref:null,change:'create'}));return account;
     });
    });return json(result,201);
   }
   if(method==='PATCH'&&/^\/local\/memberships\/[^/]+$/.test(path)&&cfg.side==='hub'){
    fields(b,['expected','capabilities','local_disabled','confirmed'],['role','membership_status']);const target=path.split('/').at(-1);
    const result=await sql.begin(async tx=>{await lock(tx);const actor=await session(tx,req,{fresh:true});
     const [membership]=await tx`select state from access_memberships where target_ref=${target} for update`;const old=membership?.state;
     if(!old)fail(404,'not_found');
     const role=await roles.normalize(tx,b.role||old.role.key||old.role);
     if(!actor.state.capabilities.includes('people.manage')||actor.target_ref===target||!roles.manages(actor,old.role)||!roles.manages(actor,role)||b.confirmed!==true||typeof b.local_disabled!=='boolean'||!['active','revoked'].includes(b.membership_status||old.membership_status))fail(403,'invalid_authority');await roles.delegate(tx,actor,role,b.capabilities);
     return idempotent(tx,actor.user_id,'local.membership',req.headers.get('idempotency-key'),{target,...b},async()=>{
      if(!equal(b.expected,old.version))fail(409,'version_conflict');
      if(old.membership_status==='revoked'||old.central_blocked)fail(403,old.central_blocked?'blocked':'revoked');
      if(old.role.key==='superadmin'&&(role.key!=='superadmin'||b.local_disabled||b.membership_status==='revoked')){
       const [remaining]=await tx`select count(*)::int as n from access_memberships m join access_accounts a on a.target_ref=m.target_ref where a.hub_id=${cfg.hubId} and m.target_ref<>${target} and m.state->'role'->>'key'='superadmin' and m.state->>'membership_status'='active' and m.state->>'local_disabled'='false' and m.state->>'central_blocked'='false'`;if(!remaining.n)fail(409,'last_superadmin');
      }
      const state={...old,role,membership_status:b.membership_status||old.membership_status,local_disabled:b.local_disabled,capabilities:b.capabilities,version:{...old.version,local_revision:old.version.local_revision+1}};
      validate('state',state);await tx`update access_memberships set state=${tx.json(state)} where target_ref=${target}`;await syncNative(tx,state);
      await tx`update access_accounts set session_version=session_version+1 where target_ref=${target}`;
      await tx`delete from access_sessions where user_id=${old.local_user_ref}`;await tx`delete from sessions where user_id=${old.local_user_ref}`;
      await audit(tx,actor.user_id,'membership.local_changed',target,state.version);
      await outbox(tx,target,envelope('event',{event_type:'membership.changed',aggregate_ref:target,actor:{identity_ref:actor.user_id,authority:'hub_local',authorization_ref:opaque()},previous:old.version,state,causation_ref:null,change:state.membership_status==='revoked'?'revoke':b.local_disabled?'disable':old.local_disabled?'enable':'role_change'}));return state;
     });
    });return json(result);
   }
   if(method==='POST'&&path==='/local/dispatch'){
    await sql.begin(async tx=>{await lock(tx);const actor=await session(tx,req,{fresh:true});if(!actor.state.capabilities.includes('people.manage'))fail(403,'invalid_authority');});return json(await dispatch());
   }
   if(method==='POST'&&['/local/login','/local/setup-requests','/local/setup-consumptions'].includes(path)){
    const timestamp=Date.now();for(const [key,value] of rateBuckets)if(value.until<=timestamp)rateBuckets.delete(key);
    const key=digest((peer?.address||'direct-local')+':'+path+':'+String(b.identifier||b.setup_token||'').toLowerCase());
    const bucket=rateBuckets.get(key)||{count:0,until:timestamp+60000};
    if(bucket.count>=20||rateBuckets.size>=10000)fail(429,'rate_limited');bucket.count++;rateBuckets.set(key,bucket);
   }
   if(method==='POST'&&path==='/local/login'){
    fields(b,['identifier','password']);if(typeof b.identifier!=='string'||typeof b.password!=='string')fail(401,'unauthorized');
    const identifier=b.identifier.trim().toLowerCase();
    const result=await sql.begin(async tx=>{await lock(tx);
     const column=identifier.includes('@')?'email':identifier.startsWith('+')?'phone':'username';
     const rows=await tx`select a.*,m.state from access_accounts a left join access_memberships m on m.target_ref=a.target_ref where a.hub_id=${cfg.hubId} and a.${sql(column)}=${identifier}`;
     if(rows.length!==1)fail(401,'unauthorized');const row=rows[0],native=await nativeActive(tx,row.user_id);
     if(!native?.active||row.status!=='ready'||!await verifyPassword(b.password,native.password_hash,cfg.side))fail(401,'unauthorized');
     const authority=await portalAuthority(tx,row);
     const token=opaque();await tx`insert into access_sessions(token_hash,user_id,credential_version,session_version) values(${digest(token)},${row.user_id},${row.credential_version},${row.session_version})`;
     return {token,user:row.user_id,authority};
    });return json({local_user_ref:result.user,...result.authority},200,{'set-cookie':cookie(result.token)});
   }
   if(method==='POST'&&path==='/local/setup-requests'){
    fields(b,['identifier']);if(typeof cfg.deliver!=='function')fail(503,'local_verification_channel_unavailable');
    const delivery=await sql.begin(async tx=>{await lock(tx);const [account]=await tx`select * from access_accounts where hub_id=${cfg.hubId} and username=${String(b.identifier).toLowerCase()}`;
     if(!account||account.status!=='onboarding')return null;
     const tokens={setup_token:opaque(),email_token:opaque(),phone_token:opaque()};
     await tx`insert into access_setups(user_id,setup_digest,email_digest,phone_digest,expires_at) values(${account.user_id},${digest(tokens.setup_token)},${digest(tokens.email_token)},${digest(tokens.phone_token)},now()+interval '15 minutes') on conflict(user_id) do update set setup_digest=excluded.setup_digest,email_digest=excluded.email_digest,phone_digest=excluded.phone_digest,expires_at=excluded.expires_at,used_at=null`;
     await audit(tx,null,'setup.requested',account.target_ref);return {user:account.user_id,tokens};
    });
    // Private Hub-owned delivery port. Never put these tokens in an administration DTO or federated payload.
    if(delivery)await cfg.deliver(delivery.user,delivery.tokens);
    return json({accepted:true},202);
   }
   if(method==='POST'&&path==='/local/setup-consumptions'){
    fields(b,['setup_token','email_token','phone_token','username','password'],['email','phone']);validatePassword(b.password,cfg.side);
    if(typeof b.username!=='string'||!/^[a-z][a-z0-9._-]{2,63}$/.test(b.username.toLowerCase()))fail(422,'invalid_identifiers');
    const hash=await hashPassword(b.password,cfg.side);
    await sql.begin(async tx=>{await lock(tx);
     const [row]=await tx`select s.*,a.target_ref,a.hub_id,a.status,a.email as registered_email,a.phone as registered_phone from access_setups s join access_accounts a on a.user_id=s.user_id where s.setup_digest=${digest(String(b.setup_token))} for update of s`;
     if(b.email!==undefined&&(typeof b.email!=='string'||b.email.trim().toLowerCase()!==row?.registered_email)||b.phone!==undefined&&(typeof b.phone!=='string'||b.phone!==row?.registered_phone))fail(403,'invalid_setup');
     if(!row||row.hub_id!==cfg.hubId||row.status!=='onboarding'||row.used_at||Date.now()>=+row.expires_at||row.email_digest!==digest(String(b.email_token))||row.phone_digest!==digest(String(b.phone_token)))fail(403,'invalid_setup');
     const [membership]=await tx`select state from access_memberships where target_ref=${row.target_ref}`;if(!membership||membership.state.membership_status!=='active'||membership.state.central_blocked||membership.state.local_disabled)fail(403,'invalid_setup');
     try{await tx`update access_accounts set username=${b.username.toLowerCase()},status='ready',email_evidence_ref=${opaque()},phone_evidence_ref=${opaque()},credential_version=credential_version+1,session_version=session_version+1 where user_id=${row.user_id}`;}catch(e){if(e.code==='23505')fail(409,'identity_collision');throw e;}
     if(cfg.side==='central')await tx`update users set password_hash=${hash},active=true where id=${row.user_id}`;
     else await tx`update users set password_hash=${hash},is_active=true where id=${row.user_id}`;
     await tx`update access_setups set used_at=now() where user_id=${row.user_id}`;
     await tx`delete from access_sessions where user_id=${row.user_id}`;await tx`delete from sessions where user_id=${row.user_id}`;
     await audit(tx,row.user_id,'setup.consumed',row.target_ref,membership.state.version);
     const event=envelope('event',{event_type:'identity.provisional_created',provisional_ref:row.target_ref,local_user_ref:row.user_id,version:membership.state.version,onboarding_status:'local_verified',actor:{identity_ref:row.user_id,authority:'hub_local',authorization_ref:opaque()}});
     await outbox(tx,row.target_ref,event);
    });return json(null,204,{'set-cookie':cookie('')+'; Max-Age=0'});
   }
   if(method==='PATCH'&&path==='/local/profile'){
    fields(b,['name']);if(typeof b.name!=='string'||!b.name.trim()||b.name.length>200)fail(422,'schema_invalid');
    return await sql.begin(async tx=>{await lock(tx);const actor=await session(tx,req);if(cfg.side==='central')await tx`update users set full_name=${b.name.trim()} where id=${actor.user_id}`;else await tx`update users set name=${b.name.trim()} where id=${actor.user_id}`;await audit(tx,actor.user_id,'profile.updated',actor.target_ref);return json({name:b.name.trim()});});
   }
   if(method==='POST'&&path==='/local/logout'){
    await sql.begin(async tx=>{await lock(tx);const actor=await session(tx,req,{identityOnly:true});await tx`delete from access_sessions where token_hash=${actor.token_hash}`;});return json(null,204,{'set-cookie':cookie('')+'; Max-Age=0'});
   }
   if(method==='GET'&&path==='/central/directory'&&cfg.side==='central'){
    return await sql.begin(async tx=>{await lock(tx);await session(tx,req,{global:true});const people=await tx`select user_id as local_user_ref,target_ref,username,email,phone,status from access_accounts order by username`;const accesses=await tx`select target_ref,hub_id,desired,applied,status,last_ack from access_desired order by target_ref`;return json({hub_id:cfg.hubId,people,accesses});});
   }
   if(method==='GET'&&(path==='/local/me'||path==='/local/profile')){
    return await sql.begin(async tx=>{await lock(tx);const actor=await session(tx,req,{identityOnly:path==='/local/me'});
     if(path==='/local/profile'){
      if(!actor.state.capabilities.includes('profile.read'))fail(403,'missing_capability');
      const rows=cfg.side==='central'?await tx`select id as local_user_ref,full_name as name,email from users where id=${actor.user_id}`:await tx`select id as local_user_ref,name,email from users where id=${actor.user_id}`;
      await tx`update access_sessions set last_activity_at=now() where token_hash=${actor.token_hash}`;
      return json(rows[0]);
     }
     return json({local_user_ref:actor.user_id,hub_id:cfg.hubId,...await portalAuthority(tx,actor),regularization_status:actor.status});
    });
   }
   if(method==='POST'&&/^\/central\/accesses\/[^/]+\/transitions$/.test(path)&&cfg.side==='central'){
    fields(b,['operation','expected','capabilities','confirmed'],['rebase_of','role']);
    if(b.role!==undefined&&(!(Object.hasOwn(ranks,b.role)||b.role?.kind==='custom')||b.operation!=='membership.set'))fail(422,'schema_invalid');
    if(!['membership.set','membership.revoke','membership.block'].includes(b.operation)||b.confirmed!==true||!Array.isArray(b.capabilities)||b.capabilities.some(c=>!catalog.some(x=>x.key===c))||new Set(b.capabilities).size!==b.capabilities.length)fail(403,'invalid_authority');
    const target=path.split('/')[3];
    const result=await sql.begin(async tx=>{await lock(tx);const actor=await session(tx,req,{global:true,fresh:true});return idempotent(tx,actor.user_id,'central.transition',req.headers.get('idempotency-key'),{target,...b},async()=>{
     const [current]=await tx`select * from access_desired where target_ref=${target} and hub_id=${cfg.hubId} for update`;
     if(!current?.applied)fail(404,'not_found');if(!equal(current.applied.version,b.expected)||(current.status==='queued'&&!['membership.block','membership.revoke'].includes(b.operation)))fail(409,'version_conflict');
     if((current.applied.membership_status==='revoked'||current.applied.central_blocked)&&!['membership.block','membership.revoke'].includes(b.operation))fail(403,'revoked');
     if(current.status==='conflict'&&(!b.rebase_of||current.last_ack?.payload.conflict_ref!==b.rebase_of))fail(409,'explicit_rebase_required');
     if(b.rebase_of){const [conflict]=await tx`select * from access_conflicts where conflict_ref=${b.rebase_of} and target_ref=${target} and status='open'`;if(!conflict)fail(409,'unknown_conflict');}
     const p=makeProof(actor);
     const state={...current.applied,...(b.role?{role:typeof b.role==='string'?{kind:'system',key:b.role}:b.role}:{}),central_blocked:b.operation==='membership.block'?true:current.applied.central_blocked,capabilities:['membership.revoke','membership.block'].includes(b.operation)?current.applied.capabilities:b.capabilities,membership_status:b.operation==='membership.revoke'?'revoked':'active',version:{...b.expected,central_revision:Math.max(current.desired?.version.central_revision||0,b.expected.central_revision)+1,local_revision:b.expected.local_revision+1,block_generation:b.expected.block_generation+(b.operation==='membership.block'?1:0)}};
     const command=await queueSet(tx,actor,target,state.local_user_ref,p,state,b.expected,b.operation,b.rebase_of||null);return {message_id:command.message_id,status:'queued'};
    });});await prepareDelivery(result.message_id).catch(()=>{});return json(result,202);
   }
   if(method==='POST'&&/^\/central\/provision-intents\/[0-9a-f-]{36}\/retry$/.test(path)&&cfg.side==='central'){
    fields(b,['confirmed']);if(b.confirmed!==true)fail(403,'confirmation_required');const ref=path.split('/')[3];
    await sql.begin(async tx=>{await lock(tx);const actor=await session(tx,req,{global:true,fresh:true});
     return idempotent(tx,actor.user_id,'central.provision.reauthorize',req.headers.get('idempotency-key'),{ref,...b},async()=>{
      const [intent]=await tx`select * from access_provision_intents where intent_ref=${ref} for update`;if(!intent||intent.actor_ref!==actor.user_id)fail(404,'not_found');
      if(intent.status==='pending'){const proof=makeProof(actor);await tx`update access_provision_intents set proof=${tx.json(proof)},last_error=null where intent_ref=${ref}`;await audit(tx,actor.user_id,'central.provision.reauthorized',ref);}
      return {intent_ref:ref};
     });
    });const result=await resumeProvision(ref);return json(result,result.status==='pending'?202:201);
   }
   if(method==='POST'&&path==='/central/accesses'){const result=await createCentral(req,b);if(result.target_ref){const rows=await sql`select message_id from access_outbox where target_ref=${result.target_ref} and body->>'kind'='command'`;for(const row of rows)await prepareDelivery(row.message_id).catch(()=>{});}return json(result,result.status==='pending'?202:201);}
   if(method==='POST'&&path==='/central/dispatch'){
    await sql.begin(async tx=>{await lock(tx);await session(tx,req,{global:cfg.side==='central',fresh:true});});return json(await dispatch());
   }
   if(method==='GET'&&path.startsWith('/central/accesses/')&&cfg.side==='central'){
    return await sql.begin(async tx=>{await session(tx,req,{global:true});const [r]=await tx`select target_ref,desired,applied,status,last_ack from access_desired where target_ref=${path.split('/').at(-1)} and hub_id=${cfg.hubId}`;if(!r)fail(404,'not_found');return json(r);});
   }
   return json({error:'not_found'},404);
  }catch(e){if(cfg.onError&&!e.status)cfg.onError({code:e.code||e.name});return json({error:e.status?e.message:'internal_error'},e.status||500);}
 }
 function httpsServer(routeHandler){
  return https.createServer({key:cfg.tls.key,cert:cfg.tls.cert,ca:cfg.tls.ca,requestCert:true,rejectUnauthorized:false,minVersion:'TLSv1.3',maxVersion:'TLSv1.3'},async(req,res)=>{
   try{let size=0;const chunks=[];for await(const c of req){size+=c.length;if(size>262144){res.writeHead(413,{'cache-control':'no-store'});res.end('{"error":"body_too_large"}');return;}chunks.push(c);}
    const cert=req.socket.getPeerCertificate();const peer={address:req.socket.remoteAddress,authorized:req.socket.authorized,fingerprint:cert.raw?new X509Certificate(cert.raw).fingerprint256:null};
    const request=new Request((cfg.origin||'https://127.0.0.1')+req.url,{method:req.method,headers:req.headers,...(!['GET','HEAD'].includes(req.method)?{body:Buffer.concat(chunks)}:{})});
    const result=routeHandler?await routeHandler(request,peer):await handle(request,peer);res.writeHead(result.status,Object.fromEntries(result.headers));res.end(Buffer.from(await result.arrayBuffer()));
   }catch{res.writeHead(500);res.end('{"error":"internal_error"}');}
  });
 }
 const isPilotIdentifier=async identifier=>{
  if(cfg.enabled!==true)return false;
  const value=String(identifier).trim().toLowerCase();
  const phone=value.startsWith('+')?value:'+'+value.replace(/\D/g,'');
  const rows=await sql`select 1 from access_accounts where hub_id=${cfg.hubId} and (email=${value} or username=${value} or phone=${phone})`;
  return rows.length>0;
 };
 const portalIdentity=async token=>sql.begin(async tx=>{
  await lock(tx);const actor=await session(tx,new Request(cfg.origin+'/api/access/v1/local/me',{headers:{cookie:'access_v1='+token}}),{identityOnly:true});
  const authority=await portalAuthority(tx,actor);const global=authority.authority_mode==='godadmin';
  const [profile]=cfg.side==='central'?await tx`select id,full_name as name,email,phone,to_jsonb(u)->>'avatar_url' as photo_url,to_jsonb(u)->>'company' as company from users u where id=${actor.user_id}`:await tx`select id,name,email,phone,to_jsonb(u)->>'photo_url' as photo_url,to_jsonb(u)->>'job_title' as job_title from users u where id=${actor.user_id}`;
  // Never translate a Hub SuperAdmin into sovereign platform authority.
  return {...profile,...authority,accessRole:authority.role,role:cfg.side==='central'?(global?'superadmin':'client'):(authority.role?.kind==='custom'?'OPERATOR':{superadmin:'OWNER',admin:'ADMIN',operator:'OPERATOR'}[authority.role?.key])};
 });
 const channelIdentity=async phone=>{
  const rows=await sql`select a.*,m.state from access_accounts a left join access_memberships m on m.target_ref=a.target_ref where a.phone=${phone} and a.status='ready' and a.phone_evidence_ref is not null`;
  if(rows.length!==1)return null;const row=rows[0],native=await nativeActive(sql,row.user_id);if(!native?.active)return null;
  const [grant]=cfg.side==='central'?await sql`select * from access_grants where identity_ref=${row.user_id} and status='active'`:[];
  if(grant)return {...row,authority_mode:'godadmin',grant_ref:grant.grant_ref,revision:Number(grant.revision),phone,rank:500,capabilities:[]};
  if(!row.state||row.hub_id!==cfg.hubId||row.state.membership_status!=='active'||row.state.local_disabled||row.state.central_blocked||!row.state.capabilities.includes('sofia.use'))return null;
  return {...row,authority_mode:'hub_local',revision:digest(row.state),phone,rank:rank(row.state.role),capabilities:effective(row.state).capabilities};
 };
 const channel=createChannelAccess({cfg,sql,lock,fail,handle,runBound:(binding,run)=>channelContext.run(binding,run),identity:channelIdentity});
 const resolveChannelAuthority=async phone=>{
  if(cfg.side!=='central'||cfg.enabled!==true)return null;
  const rows=await sql`select g.grant_ref,g.identity_ref,g.revision,a.phone from access_grants g join access_accounts a on a.user_id=g.identity_ref join users u on u.id=a.user_id where a.phone=${phone} and a.phone_evidence_ref is not null and a.status='ready' and u.active=true and g.status='active'`;
  return rows.length===1?{grant_ref:rows[0].grant_ref,identity_ref:rows[0].identity_ref,revision:Number(rows[0].revision),phone:rows[0].phone}:null;
 };
 const isPilotAccount=async id=>(await sql`select 1 from access_accounts where user_id::text=${String(id)}`).length>0;
 return {isPilotAccount,handle,initialize,httpsServer,dispatch,send,attest,isPilotIdentifier,resolveChannelAuthority,revokePortalSession:async token=>{await sql`delete from access_sessions where token_hash=${digest(token)}`;},portalIdentity,channelTurn:channel.turn,validateChannelBinding:channel.validateBinding};
}
