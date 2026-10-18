// Private source registry stays with the owner. Shared reads are authorized live,
// never a persistent mirror or a bearer reference to the global corpus.
import {createCentralKnowledgeReader} from './source-reader.mjs';
export function createKnowledgeAccess({cfg,sql,lock,session,fields,fail,json,audit,send,idempotent}){
 const sources=()=>{
  const rows=cfg.knowledgeSources||[];if(!Array.isArray(rows)||rows.length>32)fail(503,'source_registry_unavailable');
  if(rows.some(r=>!r||!/^[A-Za-z0-9_-]{22,160}$/.test(r.source_ref)||!['knowledge','memory','skill'].includes(r.kind)||!['hub_private','central_private'].includes(r.scope)||!Number.isSafeInteger(r.version)||r.version<1||!Array.isArray(r.approved)||r.approved.length>4096||r.approved.some(d=>!/^\w{64}$/.test(d.reference)||!/^\w{64}$/.test(d.digest))))fail(503,'source_registry_unavailable');
  if(new Set(rows.map(r=>r.source_ref)).size!==rows.length)fail(503,'source_registry_unavailable');return rows;
 };
 const authority=async(tx,req)=>{
  const actor=await session(tx,req,{identityOnly:true});
  const [grant]=cfg.side==='central'?await tx`select grant_ref from access_grants where identity_ref=${actor.user_id} and status='active'`:[];
  if(grant)return {...actor,global:true};
  if(!actor.state||actor.state.membership_status!=='active'||actor.state.local_disabled||actor.state.central_blocked)fail(403,'invalid_authority');return {...actor,global:false};
 };
 const allowed=(actor,source)=>actor.global||source.scope==='hub_private'&&source.hub_id===cfg.hubId&&actor.hub_id===cfg.hubId&&actor.state.capabilities.includes('knowledge.read');
 const metadata=(s,scope=s.scope)=>({source_ref:s.source_ref,kind:s.kind,scope,owner_ref:s.hub_id,version:s.version,availability:'available',provenance_ref:s.provenance_ref,authorized:true});
 const read=async(tx,actor,source,b)=>{
  fields(b,['source_ref','version','action'],['reference','query','offset','limit']);
  if(!['catalog','search','read'].includes(b.action))fail(422,'schema_invalid');
  if(b.action==='read'&&!source.approved.some(d=>d.reference===b.reference))fail(403,'source_not_authorized');
  const reader=createCentralKnowledgeReader(source.manifestFile),{source_ref,version,...query}=b;const result=await reader(query);
  if(b.action==='read'){
   if(result.status!=='ok'||result.digest!==source.approved.find(d=>d.reference===b.reference)?.digest)fail(409,'source_version_changed');
  }else{
   result.items=result.items.filter(item=>source.approved.some(d=>d.reference===item.reference));
   delete result.total;delete result.matchedCount;delete result.skillCount;delete result.nextOffset;
  }
  await audit(tx,actor.user_id,'knowledge.'+b.action,source.source_ref,{source_version:source.version,provenance_ref:source.provenance_ref});
  return {...result,source_ref:source.source_ref,version:source.version,provenance_ref:source.provenance_ref};
 };
 async function handle(req,path,method,b,assertion=null){
  if(path==='/federation/knowledge-authority'){
   if(cfg.side!=='hub'||!assertion||method!=='POST')fail(403,'invalid_authority');fields(b,['local_user_ref','target_ref']);
   const rows=await sql`select a.status,m.state,u.is_active from access_accounts a join access_memberships m on m.target_ref=a.target_ref join users u on u.id=a.user_id where a.user_id=${b.local_user_ref} and a.target_ref=${b.target_ref} and a.hub_id=${cfg.hubId}`;
   const a=rows[0];return json({authorized:!!a&&a.status==='ready'&&a.is_active&&a.state.membership_status==='active'&&!a.state.central_blocked&&!a.state.local_disabled&&(a.state.role.key==='superadmin'||a.state.capabilities.includes('knowledge.read'))});
  }
  if(path==='/knowledge/shares'){
   if(cfg.side!=='central')fail(403,'invalid_authority');
   return sql.begin(async tx=>{await lock(tx);const actor=await session(tx,req,{global:true,fresh:method!=='GET'});
    if(method==='GET')return json({shares:await tx`select source_ref,source_version,hub_id,active,revision from access_knowledge_shares order by source_ref,source_version,hub_id`});
    if(method!=='POST')fail(404,'not_found');fields(b,['source_ref','version','hub_id','active','expected_revision','confirmed']);
    const source=sources().find(s=>s.source_ref===b.source_ref&&s.version===b.version&&s.scope==='central_private');
    if(!source||b.hub_id!==cfg.hubId||b.confirmed!==true||typeof b.active!=='boolean'||!Number.isSafeInteger(b.expected_revision)||b.expected_revision<0)fail(403,'invalid_authority');
    return json(await idempotent(tx,actor.user_id,'knowledge.share',req.headers.get('idempotency-key'),b,async()=>{
     const [old]=await tx`select revision from access_knowledge_shares where source_ref=${b.source_ref} and source_version=${b.version} and hub_id=${b.hub_id} for update`;
     if(Number(old?.revision||0)!==b.expected_revision)fail(409,'share_conflict');const revision=b.expected_revision+1;
     await tx`insert into access_knowledge_shares(source_ref,source_version,hub_id,active,revision) values(${b.source_ref},${b.version},${b.hub_id},${b.active},${revision}) on conflict(source_ref,source_version,hub_id) do update set active=excluded.active,revision=excluded.revision`;
     await audit(tx,actor.user_id,b.active?'knowledge.shared':'knowledge.share_revoked',b.source_ref,{source_version:b.version,hub_id:b.hub_id,share_revision:revision});
     return {source_ref:b.source_ref,version:b.version,hub_id:b.hub_id,active:b.active,revision};
    }));
   });
  }
  if(['/federation/knowledge/catalog','/federation/knowledge/query'].includes(path)){
   if(cfg.side!=='central'||!assertion||method!=='POST'||!assertion.actor_identity_ref||!assertion.authorization_ref)fail(403,'invalid_authority');
   const current=await send('/federation/knowledge-authority',{local_user_ref:assertion.actor_identity_ref,target_ref:assertion.authorization_ref});if(!current.authorized)fail(403,'invalid_authority');
   return sql.begin(async tx=>{await lock(tx);
    const grants=await tx`select source_ref,source_version,revision from access_knowledge_shares where hub_id=${cfg.hubId} and active=true`;
    const approved=sources().filter(s=>s.scope==='central_private'&&grants.some(g=>g.source_ref===s.source_ref&&Number(g.source_version)===s.version));
    if(path.endsWith('/catalog')){fields(b,[]);return json({entries:approved.map(s=>metadata(s,'shared_opt_in'))});}
    const source=approved.find(s=>s.source_ref===b.source_ref&&s.version===b.version);if(!source)fail(403,'source_not_authorized');
    return json(await read(tx,{user_id:assertion.actor_identity_ref},source,b));
   });
  }
  if(!['/knowledge/catalog','/knowledge/query'].includes(path))return null;
  return sql.begin(async tx=>{await lock(tx);const actor=await authority(tx,req),registered=sources();
   if(method==='GET'&&path==='/knowledge/catalog'){
    let entries=registered.filter(s=>allowed(actor,s)).map(s=>metadata(s));
    if(cfg.side==='hub'&&actor.state.capabilities.includes('knowledge.read')){
     try{const remote=await send('/federation/knowledge/catalog',{}, {actor_identity_ref:actor.user_id,authorization_ref:actor.target_ref});entries.push(...remote.entries);}catch(e){if(e.status&&e.status<500)throw e;/* unavailable Central never disables local acervo */}
    }
    await authority(tx,req);return json({catalog_revision:Math.max(0,...entries.map(s=>s.version)),entries});
   }
   if(method!=='POST'||path!=='/knowledge/query')fail(404,'not_found');
   fields(b,['source_ref','version','action'],['reference','query','offset','limit']);
   const source=registered.find(s=>s.source_ref===b.source_ref&&s.version===b.version);
   if(source&&allowed(actor,source))return json(await read(tx,actor,source,b));
   if(cfg.side==='hub'&&actor.state.capabilities.includes('knowledge.read')){
    const result=await send('/federation/knowledge/query',b,{actor_identity_ref:actor.user_id,authorization_ref:actor.target_ref});await authority(tx,req);return json(result);
   }
   fail(403,'source_not_authorized');
  });
 }
 return {handle};
}
