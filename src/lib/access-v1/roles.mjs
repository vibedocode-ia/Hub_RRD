// The caller owns the transaction and has locked/re-read the actor. No role comes
// from a model, transport header or cached login snapshot.
import {randomUUID} from 'node:crypto';
export const rank=role=>role?.kind==='custom'?100:({superadmin:400,admin:300,operator:200}[role?.key]||0);
export const catalog=[
 {key:'profile.read',label:'Consultar próprio perfil',module:'Perfil',delegable:true},
 {key:'sofia.use',label:'Usar SofIA neste Hub',module:'SofIA',delegable:true},
 {key:'knowledge.read',label:'Consultar acervo autorizado do Hub',module:'Acervo',delegable:true},
 {key:'crm.read',label:'Consultar CRM',module:'CRM',delegable:true},
 {key:'crm.write',label:'Criar e atualizar CRM',module:'CRM',delegable:true},
 {key:'operations.read',label:'Consultar operação e agenda',module:'Operação',delegable:true},
 {key:'operations.write',label:'Criar e atualizar operação',module:'Operação',delegable:true},
 {key:'inventory.read',label:'Consultar estoque',module:'Estoque',delegable:true},
 {key:'inventory.write',label:'Movimentar estoque',module:'Estoque',delegable:true},
 {key:'financial.read',label:'Consultar financeiro',module:'Financeiro',delegable:true},
 {key:'financial.write',label:'Gerir lançamentos financeiros',module:'Financeiro',delegable:true},
 {key:'documents.read',label:'Consultar documentos',module:'Documentos',delegable:true},
 {key:'documents.prepare',label:'Preparar documentos',module:'Documentos',delegable:true},
 {key:'documents.approve',label:'Aprovar documentos',module:'Documentos',delegable:true},
 {key:'documents.issue',label:'Emitir documentos oficiais',module:'Documentos',delegable:true},
 {key:'documents.send',label:'Solicitar envio de documentos',module:'Documentos',delegable:true},
 {key:'sofia.drafts.review',label:'Revisar rascunhos SofIA',module:'SofIA',delegable:true},
 {key:'settings.manage',label:'Gerir configurações do Hub',module:'Configurações',delegable:false},
 {key:'people.manage',label:'Gerir vínculos inferiores',module:'Acessos',delegable:false},
 {key:'access.roles.manage',label:'Gerir funções personalizadas',module:'Acessos',delegable:false},
];
export function createRoleManager({cfg,fail,fields,audit,idempotent,session,lock,json,saveMembership,proofCheck}){
 const sql=cfg.sql;
 const normalize=async(tx,input)=>{
  if(typeof input==='string'&&['superadmin','admin','operator'].includes(input))return {kind:'system',key:input};
  fields(input,['kind','role_ref','role_revision']);
  if(input.kind!=='custom')fail(403,'invalid_role');
  const [r]=await tx`select * from access_roles where hub_id=${cfg.hubId} and role_ref=${input.role_ref} and active=true`;
  if(!r||Number(r.revision)!==input.role_revision)fail(409,'role_conflict');return input;
 };
 const delegate=async(tx,actor,role,caps)=>{
  if(!Array.isArray(caps)||caps.length>catalog.length||new Set(caps).size!==caps.length)fail(403,'invalid_authority');
  let allowed=catalog.filter(c=>rank(role)>=300||c.delegable).map(c=>c.key);
  if(role.kind==='custom'){
   const [r]=await tx`select capabilities from access_roles where hub_id=${cfg.hubId} and role_ref=${role.role_ref} and active=true and revision=${role.role_revision}`;
   if(!r)fail(409,'role_conflict');allowed=r.capabilities;
  }
  if(caps.some(c=>!allowed.includes(c)||!actor.state.capabilities.includes(c)))fail(403,'delegation_ceiling');
 };
 const manages=(actor,target)=>rank(actor.state.role)>rank(target)||actor.state.role.key==='superadmin'&&target.key==='superadmin';
 async function handle(req,path,method,b,assertion=null){
  if(!path.startsWith('/local/roles')&&path!=='/local/directory')return null;
  return sql.begin(async tx=>{
   await lock(tx);let actor;
   if(assertion){
    if(cfg.side!=='hub'||!path.startsWith('/local/roles'))fail(403,'invalid_authority');
    // Read proofs never authorize mutation. Sovereign authority is constructed
    // only after the authenticated proof is checked inside the locked transaction.
    await proofCheck(tx,assertion.proof_ref,assertion.actor_identity_ref,assertion.confirmation_ref,method==='GET'?'access.roles.manage':'people.manage');
    actor={user_id:assertion.actor_identity_ref,authority_mode:'godadmin',state:{role:{kind:'system',key:'superadmin'},capabilities:catalog.map(c=>c.key)}};
   }else actor=await session(tx,req,{fresh:method!=='GET'});
   if(path==='/local/directory'&&method==='GET'){
    if(!actor.state.capabilities.includes('people.manage'))fail(403,'invalid_authority');
    const rows=await tx`select a.target_ref,a.user_id as local_user_ref,a.username,a.email,a.phone,a.status,m.state from access_accounts a join access_memberships m on m.target_ref=a.target_ref where a.hub_id=${cfg.hubId} order by a.username`;
    return json({hub_id:cfg.hubId,people:rows,capabilities:catalog});
   }
   if(method==='GET'&&path==='/local/roles'){
    if(assertion){if(!actor.state.capabilities.includes('access.roles.manage'))fail(403,'invalid_authority');}
    else if(!actor.state.capabilities.includes('access.roles.manage'))fail(403,'invalid_authority');
    const roles=await tx`select role_ref,name,description,capabilities,active,revision from access_roles where hub_id=${cfg.hubId} order by name`;
    return json({roles:roles.map(r=>({...r,revision:Number(r.revision),role:{kind:'custom',role_ref:r.role_ref,role_revision:Number(r.revision)}})),catalog});
   }
   if(!['POST','PATCH'].includes(method))fail(404,'not_found');
   if(rank(actor.state.role)<300)fail(403,'invalid_authority');
   fields(b,['name','description','capabilities','confirmed'],method==='PATCH'?['expected_revision','active']:[]);
   if(b.confirmed!==true||typeof b.name!=='string'||!b.name.trim()||b.name.length>100||typeof b.description!=='string'||b.description.length>1000||!Array.isArray(b.capabilities)||new Set(b.capabilities).size!==b.capabilities.length||b.capabilities.some(c=>!catalog.some(x=>x.key===c&&x.delegable)||!actor.state.capabilities.includes(c)))fail(403,'delegation_ceiling');
   if(method==='PATCH'&&(typeof b.active!=='boolean'||!Number.isSafeInteger(b.expected_revision)))fail(422,'schema_invalid');
   const ref=method==='POST'?randomUUID():path.split('/').at(-1);
   const result=await idempotent(tx,actor.user_id,'local.role.'+method,assertion?assertion.authorization_ref:req.headers.get('idempotency-key'),{path,...b},async()=>{
    const [prior]=await tx`select * from access_roles where role_ref=${ref} and hub_id=${cfg.hubId} for update`;
    if(method==='PATCH'&&(!prior||Number(prior.revision)!==b.expected_revision))fail(409,'role_conflict');
    const revision=prior?Number(prior.revision)+1:1,active=method==='POST'?true:b.active;
    await tx`insert into access_roles(role_ref,hub_id,name,description,capabilities,revision,active) values(${ref},${cfg.hubId},${b.name.trim()},${b.description},${tx.json(b.capabilities)},${revision},${active}) on conflict(role_ref) do update set name=excluded.name,description=excluded.description,capabilities=excluded.capabilities,revision=excluded.revision,active=excluded.active`;
    const members=await tx`select m.target_ref,m.state from access_memberships m join access_accounts a on a.target_ref=m.target_ref where a.hub_id=${cfg.hubId} and m.state->'role'->>'role_ref'=${ref} for update of m`;
    for(const m of members){const state={...m.state,role:{kind:'custom',role_ref:ref,role_revision:revision},capabilities:active?b.capabilities:[],local_disabled:active?m.state.local_disabled:true,version:{...m.state.version,local_revision:m.state.version.local_revision+1}};await saveMembership(tx,actor,m.target_ref,m.state,state,'role_change');}
    await audit(tx,actor.user_id,'role.'+(prior?'updated':'created'),ref);
    return {role:{kind:'custom',role_ref:ref,role_revision:revision},name:b.name,active,capabilities:b.capabilities};
   });
   return json(result,method==='POST'?201:200);
  });
 }
 return {normalize,delegate,manages,handle};
}
