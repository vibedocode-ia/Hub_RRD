import {AsyncLocalStorage} from 'node:async_hooks';
import {readFileSync,statSync,writeFileSync} from 'node:fs';
import {createPrivateKey,createPublicKey} from 'node:crypto';
import postgres from 'postgres';
import {createAccessService} from './service.mjs';
const contextKey=Symbol.for('hvd.access.v1.verified-context');
const context=globalThis[contextKey]||(globalThis[contextKey]=new AsyncLocalStorage());
let singleton;
export const withVerifiedAccessContext=(service,peer,run)=>context.run({service,peer},run);
export function configuredService(side){
 if(process.env.ACCESS_V1_ENABLED!=='true')return null;
 if(singleton)return singleton;
 const path=process.env.ACCESS_V1_CONFIG_FILE;
 if(!path||!path.startsWith('/')||(statSync(path).mode&0o077)!==0)throw new Error('access_configuration_unavailable');
 const c=JSON.parse(readFileSync(path,'utf8'));
 if(c.side!==side||!c.databaseUrl||!c.origin?.startsWith('https://')||!c.peerUrl?.startsWith('https://'))throw new Error('access_configuration_invalid');
 const read=p=>readFileSync(p);
 const privateKey=p=>{if((statSync(p).mode&0o077)!==0)throw new Error('access_private_key_permissions');return createPrivateKey(read(p));};
 let deliver;
 if(c.fixtureDeliveryDirectory!==undefined){
  if(c.disposable!==true||!/^postgres:\/\/postgres@127\.0\.0\.1:\d+\/etapa4_test$/.test(c.databaseUrl)||typeof c.fixtureDeliveryDirectory!=='string'||!c.fixtureDeliveryDirectory.startsWith('/')||!statSync(c.fixtureDeliveryDirectory).isDirectory()||(statSync(c.fixtureDeliveryDirectory).mode&0o077)!==0)throw new Error('disposable_delivery_required');
  deliver=async(user,tokens)=>{if(!/^[0-9a-f-]{36}$/.test(user))throw new Error('invalid_delivery');writeFileSync(c.fixtureDeliveryDirectory+'/'+user+'.setup.json',JSON.stringify(tokens),{mode:0o600});};
 }
 const sql=postgres(c.databaseUrl,{max:8,onnotice:()=>{}});
 singleton=createAccessService({enabled:true,deliver,knowledgeSources:c.knowledgeSources||[],side,hubId:c.hubId,epoch:c.epoch,origin:c.origin,peerUrl:c.peerUrl,peerFingerprint:c.peerFingerprint,sql,
  messageKey:privateKey(c.messagePrivateKeyFile),messagePublic:createPublicKey(read(c.messagePublicKeyFile)),peerMessageKey:createPublicKey(read(c.peerMessagePublicKeyFile)),proofPublic:createPublicKey(read(c.proofPublicKeyFile)),proofKey:side==='central'?privateKey(c.proofPrivateKeyFile):null,
  tls:{key:read(c.tlsKeyFile),cert:read(c.tlsCertFile),ca:read(c.tlsCaFile)}});
 // No database migration and no email/SMS provider are installed implicitly.
 return singleton;
}
export function routeFor(side){return async function accessRoute(request){
 try{const c=context.getStore();const service=c?.service||configuredService(side);
 if(!service)return new Response(JSON.stringify({error:'not_found'}),{status:404,headers:{'cache-control':'no-store','content-type':'application/json'}});
 return await service.handle(request,c?.peer||null);
 }catch{return new Response(JSON.stringify({error:'access_unavailable'}),{status:503,headers:{'cache-control':'no-store','content-type':'application/json'}});}
};}
export async function accessPortalLogout(token,side){const service=activeAccessService(side);if(service)await service.revokePortalSession(token);}
export async function accessPortalIdentity(token,side){const service=activeAccessService(side);if(!service)return null;try{return await service.portalIdentity(token);}catch{return null;}}
export function activeAccessService(side='central'){return context.getStore()?.service||configuredService(side);}
export async function pilotLogin(request,side,identifier,password){
 const c=context.getStore();if(!c&&process.env.ACCESS_V1_ENABLED!=='true')return null;
 const service=c?.service||configuredService(side);if(!service||!await service.isPilotIdentifier(identifier))return null;
 const url=new URL(request.url);url.pathname='/api/access/v1/local/login';
 const response=await service.handle(new Request(url,{method:'POST',headers:request.headers,body:JSON.stringify({identifier,password})}));
 const body=await response.json();return new Response(JSON.stringify(response.ok?{...body,success:true,redirectUrl:'/acessos'}:{error:'Credenciais inválidas.'}),{status:response.status,headers:response.headers});
}
export async function pilotChannelAuthority(phone){
 const c=context.getStore();if(!c&&process.env.ACCESS_V1_ENABLED!=='true')return {pilot:false,grant:null};
 const service=c?.service||configuredService('central');
 if(!service||!await service.isPilotIdentifier(phone))return {pilot:false,grant:null};
 return {pilot:true,grant:await service.resolveChannelAuthority(phone)};
}
export async function legacyAccessGuard(identifier,side){
 const c=context.getStore();if(!c&&process.env.ACCESS_V1_ENABLED!=='true')return false;
 const service=c?.service||configuredService(side);if(!service)return true;
 return service.isPilotIdentifier(identifier);
}
