import {randomBytes,randomUUID} from 'node:crypto';
import {canonical,digest} from './protocol.mjs';
const descriptions={access_sources:'Lista somente fontes de acervo autorizadas para a identidade atual.',access_knowledge:'Consulta catálogo ou conteúdo de uma fonte/versão autorizada. Nunca escolhe caminho físico.',access_directory:'Consulta pessoas e vínculos no escopo autorizado.',access_create:'Propõe criar acesso; exige uma nova mensagem humana de confirmação. Não recebe senha.',access_roles:'Consulta funções do próprio Hub.',access_role_create:'Propõe uma função personalizada local abaixo de Operador.'};
export function createChannelAccess({cfg,sql,lock,fail,handle,runBound,identity}){
 const operations={access_sources:{method:'GET',readOnly:true,path:()=>'/knowledge/catalog'},access_knowledge:{method:'POST',readOnly:true,path:()=>'/knowledge/query'},access_directory:{method:'GET',path:actor=>actor.authority_mode==='godadmin'?'/central/directory':'/local/directory'},access_roles:{method:'GET',path:()=>'/local/roles'},access_create:{method:'POST',path:actor=>actor.authority_mode==='godadmin'?'/central/accesses':'/local/accounts'},access_role_create:{method:'POST',path:()=>'/local/roles'}};
 const toolsFor=actor=>Object.entries(operations).filter(([name])=>['access_sources','access_knowledge'].includes(name)?actor.authority_mode==='godadmin'||actor.capabilities.includes('knowledge.read'):actor.authority_mode==='godadmin'?(name==='access_directory'||name==='access_create'&&actor.requestedHubId===cfg.hubId):(name==='access_roles'||actor.capabilities.includes('people.manage')&&name!=='access_role_create'||name==='access_role_create'&&actor.rank>=300)).map(([name])=>({type:'function',function:{name,description:descriptions[name],parameters:{type:'object',properties:name==='access_knowledge'?{source_ref:{type:'string'},version:{type:'integer',minimum:1},action:{type:'string',enum:['catalog','search','read']},reference:{type:'string'},query:{type:'string',maxLength:160},offset:{type:'integer',minimum:0},limit:{type:'integer',minimum:1,maximum:1600}}:name==='access_create'?{name:{type:'string',maxLength:200},email:{type:'string'},phone:{type:'string'},username:{type:'string'},role:{type:'string',enum:['superadmin','admin','operator']},capabilities:{type:'array',items:{type:'string'}}}:name==='access_role_create'?{name:{type:'string'},description:{type:'string'},capabilities:{type:'array',items:{type:'string'}}}:{},required:name==='access_knowledge'?['source_ref','version','action']:name==='access_create'?['name','email','phone','username','role','capabilities']:name==='access_role_create'?['name','description','capabilities']:[],additionalProperties:false}}}));
 const binding=actor=>({identity_ref:actor.user_id,authority_mode:actor.authority_mode,authority_ref:actor.grant_ref||actor.target_ref,revision:actor.revision,...(actor.requestedHubId?{hub_id:actor.requestedHubId}:{})});
 const validateBinding=async(phone,b)=>{const a=await identity(phone);return !!a&&canonical(binding({...a,requestedHubId:b?.hub_id}))===canonical(b);};
 const execute=async(actor,operation,payload,key,confirmed=false)=>{
  const resolved=await identity(actor.phone),current=resolved?{...resolved,requestedHubId:actor.requestedHubId}:null;if(!current||!await validateBinding(actor.phone,binding(actor))||!toolsFor(current).some(t=>t.function.name===operation))fail(403,'invalid_authority');
  const spec=operations[operation];if(!spec)fail(403,'invalid_operation');
  const body=spec.method==='GET'?null:{...payload,...(operation==='access_create'?{hub_id:cfg.hubId}:{}),...(!spec.readOnly?{confirmed:true}:{})};
  const req=new Request(cfg.origin+'/api/access/v1'+spec.path(current),{method:spec.method,headers:{origin:cfg.origin,'content-type':'application/json','idempotency-key':key},...(body?{body:JSON.stringify(body)}:{})});
  const response=await runBound({user_id:current.user_id,mode:current.authority_mode,confirmedAt:confirmed?Date.now():null},()=>handle(req));
  const data=await response.json();if(!response.ok)fail(response.status,data.error||'operation_denied');return operation==='access_create'&&current.authority_mode==='godadmin'?{...data,status:data.status||'queued'}:data;
 };
 const turn=async({phone,chatId,text,model,requestedHubId})=>{
  const resolved=await identity(phone);if(!resolved)return null;const actor={...resolved,requestedHubId};
  if(requestedHubId!==undefined&&requestedHubId!==cfg.hubId)fail(403,'invalid_hub');
  const confirmation=/^\s*confirmar\s+(A6_[A-Za-z0-9_-]{24,80})\s*$/i.exec(text);
  if(confirmation){
   const code=digest(confirmation[1]);
   const row=await sql.begin(async tx=>{await lock(tx);const [p]=await tx`select * from access_channel_proposals where code_digest=${code} for update`;if(!p||p.phone_digest!==digest(phone)||p.chat_digest!==digest(chatId)||p.used_at||Date.now()>=+p.expires_at)fail(403,'invalid_confirmation');if(!await validateBinding(phone,p.binding))fail(403,'invalid_authority');await tx`update access_channel_proposals set used_at=now() where code_digest=${code}`;return p;});
   const result=await execute({...actor,requestedHubId:row.binding.hub_id},row.operation,row.payload,row.proposal_ref,true);
   if(!await validateBinding(phone,row.binding))fail(403,'invalid_authority');
   return {authorized:true,completed:!['pending','queued'].includes(result.status),reply:result.status==='pending'||result.status==='queued'?'Pedido pendente no controle de acesso; o destino ainda não confirmou.':'Pedido registrado pelo serviço de acesso. A aplicação remota só é comprovada pelo ACK do Hub.',data:result,binding:row.binding};
  }
  const tools=toolsFor(actor);if(!tools.length)return null;
  const response=await model([{role:'system',content:'Use estas ferramentas somente para pedidos explícitos de administração/consulta de acessos e funções. Não trate pedidos de CRM, documentos, grupos ou memória como gestão de acesso. Sem pedido de acesso, devolva texto vazio e nenhuma ferramenta para preservar a conversa existente. Nunca selecione ator, Hub, papel do solicitante ou autoridade. Uma proposta não é efeito aplicado.'},{role:'user',content:text}],tools);
  if(!response.tool_calls?.length)return null;
  if(response.tool_calls.length!==1)fail(403,'one_access_operation_per_turn');
  const call=response.tool_calls[0];if(!tools.some(t=>t.function.name===call.function.name)||call.function.arguments.length>8000)fail(403,'invalid_operation');
  const payload=JSON.parse(call.function.arguments);if(!payload||Array.isArray(payload)||typeof payload!=='object')fail(422,'schema_invalid');
  const tool=tools.find(t=>t.function.name===call.function.name),allowed=Object.keys(tool.function.parameters.properties);if(Object.keys(payload).some(k=>!allowed.includes(k))||tool.function.parameters.required.some(k=>!Object.hasOwn(payload,k)))fail(422,'schema_invalid');
  if(!await validateBinding(phone,binding(actor)))fail(403,'invalid_authority');
  if(operations[call.function.name].method==='GET'||operations[call.function.name].readOnly){
   if(call.function.name==='access_knowledge'&&(payload.limit>1600||payload.limit===undefined&&payload.action==='read'))payload.limit=1600;
   const data=await execute(actor,call.function.name,payload,randomUUID());if(!await validateBinding(phone,binding(actor)))fail(403,'invalid_authority');
   if(Buffer.byteLength(JSON.stringify(data))>12000)fail(413,'result_too_large');return {authorized:true,completed:true,reply:JSON.stringify(data),data,binding:binding(actor)};
  }
  const ref=randomUUID(),code='A6_'+randomBytes(24).toString('base64url');
  await sql.begin(async tx=>{await lock(tx);if(!await validateBinding(phone,binding(actor)))fail(403,'invalid_authority');await tx`insert into access_channel_proposals(proposal_ref,code_digest,phone_digest,chat_digest,binding,operation,payload,expires_at) values(${ref},${digest(code)},${digest(phone)},${digest(chatId)},${tx.json(binding(actor))},${call.function.name},${tx.json(payload)},now()+interval '15 minutes')`;});
  return {authorized:true,completed:false,reply:'Proposta sem efeito aplicado: '+JSON.stringify(payload)+'. Para confirmar exatamente este pedido em nova mensagem, envie confirmar '+code,binding:binding(actor)};
 };
 return {turn,validateBinding};
}
