import {cookies} from 'next/headers';
import {activeAccessService} from './runtime.mjs';
/** Prevent a second administrative authority for opt-in accounts. The presence
 * check only denies a legacy operation; it never authenticates or exposes data.
 * Target checks are called only after the old handler authenticated its actor. */
export async function legacyPeopleGuard(targetId?:string):Promise<Response|null>{
 if(process.env.ACCESS_V1_ENABLED!=='true')return null;
 const pilotCookie=(await cookies()).get('access_v1')?.value;
 const pilotTarget=targetId?await activeAccessService('hub')?.isPilotAccount(targetId):false;
 return pilotCookie||pilotTarget?Response.json({error:'Este acesso é administrado no painel de pessoas e acessos.',panelUrl:'/acessos'},{status:409,headers:{'cache-control':'no-store'}}):null;
}
