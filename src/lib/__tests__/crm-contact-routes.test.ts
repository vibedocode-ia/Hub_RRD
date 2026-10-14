import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { harness, nr } = require('../../security-tests/harness.cjs');
const tables = Object.fromEntries(['clients','contacts','clientAddresses'].map(t => [t, new Proxy({table:t}, {get:(o:any,k)=>k==='table'?o.table:String(k)})]));
const CLIENT_ID='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
function setup() {
  let state:any = {clients:[{id:CLIENT_ID,name:'Original',phone:'123',isActive:false,contactPerson:'Legacy'}],clientAddresses:[],contacts:[]};
  let failAddress=false, queue=Promise.resolve();
  const orm={eq:(k:any,v:any)=>(r:any)=>r[k]===v, isNull:(k:any)=>(r:any)=>r[k]==null, and:(...p:any[])=>(r:any)=>p.every(f=>f(r)),or:(...p:any[])=>(r:any)=>p.some(f=>f(r)),asc:()=>0,desc:()=>0};
  const db:any={
    select(){let t:any,p=(r:any)=>true;const q:any={from(x:any){t=x.table;return q},where(x:any){p=x;return q},orderBy(){return q},limit(){return Promise.resolve(state[t].filter(p))},then(a:any,b:any){return Promise.resolve(state[t].filter(p)).then(a,b)}};return q},
    update(t:any){return {set(v:any){return {where(p:any){const run=()=>{const rows=state[t.table].filter(p);if(t.table==='contacts'&&rows.length===0&&v.clientId==='client-2')throw Error('lock contention');rows.forEach((r:any)=>Object.assign(r,v));return rows};return {returning:async()=>run(),then:(a:any,b:any)=>Promise.resolve().then(run).then(a,b)}}}}}},
    insert(t:any){return {values(v:any){const run=()=>{if(t.table==='clientAddresses'&&failAddress)throw Error('address failure');const r={id:`new-${state[t.table].length}`,isActive:true,...v};state[t.table].push(r);return [r]};return {returning:async()=>run(),then:(a:any,b:any)=>Promise.resolve().then(run).then(a,b)}}}},
    transaction(fn:any){const task=queue.then(async()=>{const before=structuredClone(state);try{return await fn(db)}catch(e){state=before;throw e}});queue=task.catch(()=>{});return task}
  };
  const auth={requireLocalPermission:async()=>({access:{id:'user'}})};
  const load=harness({'next/server':nr,'drizzle-orm':orm,'@/db':{db,...tables},'@/lib/require-local-permission':auth,'../../../../lib/require-local-permission':auth});
  return {load,get state(){return state},failAddress(){failAddress=true}};
}
const req=(body:any)=>({json:async()=>body});
const params={params:Promise.resolve({id:CLIENT_ID})};
test('restore accepts isActive only and preserves profile and addresses',async()=>{
 const s=setup();const result=await s.load('src/app/api/crm/[id]/route.ts').PATCH(req({isActive:true}),params);
 assert.equal(result.status,200);assert.equal(s.state.clients[0].isActive,true);assert.equal(s.state.clients[0].name,'Original');assert.equal(s.state.clientAddresses.length,0);
});
test('editing normalizes phone and preserves multiple contacts and legacy text',async()=>{
 const s=setup();s.state.contacts.push({id:'11111111-1111-4111-8111-111111111111',clientId:CLIENT_ID,isActive:true},{id:'22222222-2222-4222-8222-222222222222',clientId:CLIENT_ID,isActive:true});
 const result=await s.load('src/app/api/crm/[id]/route.ts').PATCH(req({name:'Edited',phone:'(21) 90000-0000',contactId:s.state.contacts[0].id}),params);
 assert.equal(result.status,200);assert.equal(s.state.clients[0].normalizedPhone,'21900000000');assert.equal(s.state.clients[0].contactPerson,'Legacy');assert.deepEqual(s.state.contacts.map((c:any)=>c.clientId),[CLIENT_ID,CLIENT_ID]);
});
test('contactId unlink keeps other contacts and legacy text',async()=>{
 const s=setup();s.state.contacts.push({id:'11111111-1111-4111-8111-111111111111',clientId:CLIENT_ID,isActive:true},{id:'22222222-2222-4222-8222-222222222222',clientId:CLIENT_ID,isActive:true});
 const result=await s.load('src/app/api/crm/[id]/route.ts').PATCH(req({name:'Edited',phone:'123',contactId:''}),params);
 assert.equal(result.status,200);assert.deepEqual(s.state.contacts.map((c:any)=>c.clientId),[CLIENT_ID,CLIENT_ID]);assert.equal(s.state.clients[0].contactPerson,'Legacy');
});
test('form payload without contactId preserves legacy text and contacts',async()=>{
 const s=setup();s.state.contacts.push({id:'11111111-1111-4111-8111-111111111111',clientId:CLIENT_ID,isActive:true});
 const body={id:CLIENT_ID,name:'Form',phone:'123',type:'PF',contactPerson:'Ana',street:'Rua X',neighborhood:'Icaraí',customerSince:'2024-01-01T00:00:00.000Z',notes:'ok'};
 const result=await s.load('src/app/api/crm/[id]/route.ts').PATCH(req(body),params);
 assert.equal(result.status,200);assert.equal(s.state.clients[0].contactPerson,'Ana');assert.equal(s.state.contacts[0].clientId,CLIENT_ID);assert.equal(s.state.clientAddresses.length,1);
});
test('creation rolls back client if address fails',async()=>{
 const s=setup();s.failAddress();const result=await s.load('src/app/api/crm/route.ts').POST(req({name:'New',phone:'123'}));
 assert.equal(result.status,500);assert.equal(s.state.clients.length,1);
});
test('two creations cannot steal the same available contact',async()=>{
 const s=setup();const contactId='33333333-3333-4333-8333-333333333333';s.state.contacts.push({id:contactId,isActive:true,clientId:null});
 const route=s.load('src/app/api/crm/route.ts');
 const results=await Promise.all([route.POST(req({name:'One',phone:'123',contactId})),route.POST(req({name:'Two',phone:'456',contactId}))]);
 assert.deepEqual(results.map(r=>r.status).sort(),[201,409]);assert.equal(s.state.clients.length,2);assert.equal(s.state.clientAddresses.length,1);assert.equal(s.state.contacts[0].clientId,results.find(r=>r.status===201).body.clientId);
});
test('contact link failure rolls back client and address and reports unavailability',async()=>{
 const s=setup();const contactId='44444444-4444-4444-8444-444444444444';s.state.contacts.push({id:contactId,isActive:true,clientId:null});
 const route=s.load('src/app/api/crm/route.ts');
 const [first,second]=await Promise.all([route.POST(req({id:'client-2',name:'First',phone:'123',contactId})),route.POST(req({name:'Second',phone:'456',contactId}))]);
 const winner=first.status===201?first:second;const loser=first.status===201?second:first;
 assert.equal(winner.status,201);assert.equal(loser.status,409);assert.ok(loser.body.error);
 assert.deepEqual(s.state.clients.map((c:any)=>c.name),['Original','First']);assert.equal(s.state.clientAddresses.length,1);assert.equal(s.state.contacts[0].clientId,winner.body.clientId);
});
test('contact options stay on the contacts endpoint and never read clients',async()=>{
 const s=setup();const code=await import('node:fs').then(fs=>fs.readFileSync('src/app/api/contatos/route.ts','utf8'));
 assert.match(code,/\{ success: true, contacts: rows \}/);assert.doesNotMatch(code,/from\(clients\)/);
 const response=await s.load('src/app/api/contatos/route.ts').GET({url:'http://local/api/contatos'});
 assert.equal(response.status,200);assert.ok(Array.isArray(response.body.contacts));
});
export { setup,req,params };
