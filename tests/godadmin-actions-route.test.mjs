import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {randomUUID} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {getTableName} from 'drizzle-orm';
import {PgDialect} from 'drizzle-orm/pg-core';
import * as schema from '../src/db/schema.ts';

// Actual POST export, validators, domain parsers and transport auth. Only DB is
// replaced: no production URL, network, user membership, or persistent records.
const tables=new Map(),dialect=new PgDialect();let writes=0,localLookups=0;
const rows=t=>{const name=getTableName(t);if(!tables.has(name))tables.set(name,[]);return tables.get(name)};
const property=(t,column)=>Object.keys(t).find(k=>t[k]?.name===column);
function matches(t,row,condition){
 if(!condition)return true;
 const q=dialect.sqlToQuery(condition);
 const parts=[...q.sql.matchAll(/"[^"]+"\."([^"]+)" = \$(\d+)/g)];
 assert.ok(parts.length>0,'storage double requires actual equality predicates');
 return parts.every(([,col,n])=>row[property(t,col)]===q.params[Number(n)-1]);
}
const db={
 select(projection){let table,condition,max=Infinity;const chain={from(t){table=t;if(getTableName(t)===getTableName(schema.users))localLookups++;return chain},innerJoin(){return chain},where(c){condition=c;return chain},orderBy(){return chain},limit(n){max=n;return chain},then(ok,no){return Promise.resolve(rows(table).filter(r=>matches(table,r,condition)).slice(0,max).map(r=>projection?Object.fromEntries(Object.entries(projection).map(([k,c])=>[k,r[property(table,c.name)]])):{...r})).then(ok,no)}};return chain},
 insert(t){return {values(value){const r={id:randomUUID(),isActive:true,...value};rows(t).push(r);writes++;return {returning:async()=>[{...r}],then:(ok,no)=>Promise.resolve().then(ok,no)}}}},
 update(t){return {set(value){return {where(condition){const updated=rows(t).filter(r=>matches(t,r,condition));for(const row of updated)Object.assign(row,value);writes+=updated.length;return {returning:async()=>updated.map(r=>({...r})),then:(ok,no)=>Promise.resolve().then(ok,no)}}}}}},
};
globalThis.__rrdGodadminRouteDb=db;
const bundle=await build({entryPoints:['src/app/api/sofia/actions/route.ts'],bundle:true,write:false,platform:'node',format:'cjs',packages:'external',logLevel:'silent',plugins:[{name:'isolated-db',setup(b){
 // Opt-in RED control loads the exact tracked baseline entirely in memory.
 if(process.env.RRD_GODADMIN_BASELINE_RED==='1')b.onLoad({filter:/(?:sofia-actions|sofia-godadmin-policy)\.ts$|api\/sofia\/actions\/route\.ts$/},args=>({contents:execFileSync('git',['show','1014673:'+args.path.slice(process.cwd().length+1)],{encoding:'utf8'}),loader:'ts',resolveDir:resolve(args.path,'..')}));
 b.onResolve({filter:/^(?:@\/db|\.\/db|\.\.\/db)$/},()=>({path:'db',namespace:'test-db'}));
 b.onLoad({filter:/.*/,namespace:'test-db'},()=>({contents:`export * from ${JSON.stringify(resolve('src/db/schema.ts'))}; export const db=globalThis.__rrdGodadminRouteDb;`,loader:'ts',resolveDir:process.cwd()}));
}}]});
const mod={exports:{}};new Function('require','module','exports',bundle.outputFiles[0].text)(createRequire(import.meta.url),mod,mod.exports);
const hub=randomUUID(),grant=randomUUID();
const actor=String.fromCharCode(43)+String(15550000001);
const central={centralHubId:hub,centralGrantId:grant,centralRole:'god_admin',senderPhone:actor};
process.env.RRD_HUB_ID=hub;process.env.SOFIA_RRD_CENTRAL_SECRET='test-only-central-secret';process.env.SOFIA_HUB_SECRET='test-only-hub-secret';
async function call(action,data={},options={}){
 const body={...central,action,data,...options.body};if(['list_services','list_active_teams','get_document_template'].includes(action))delete body.data;
 const response=await mod.exports.POST(new Request('http://localhost/api/sofia/actions',{method:'POST',headers:{authorization:'Bearer '+(options.token||process.env.SOFIA_RRD_CENTRAL_SECRET),'idempotency-key':options.key||randomUUID(),'content-type':'application/json'},body:JSON.stringify(body)}));
 return {status:response.status,body:await response.json()};
}
test('actual actions POST: sovereign domain + CRM CRUD vertical without local membership',async()=>{
 let r=await call('create_team',{name:'Route fixture',leaderName:'Test leader'});assert.equal(r.status,201);const team=r.body.team.id;
 r=await call('update_team',{teamId:team,name:'Edited fixture'});assert.equal(r.status,200);assert.equal(rows(schema.teams).find(x=>x.id===team).name,'Edited fixture');
 r=await call('list_active_teams');assert.equal(r.status,200);assert.equal(r.body.teams[0].name,'Edited fixture');
 r=await call('list_stock');assert.equal(r.status,200);assert.deepEqual(r.body.items,[]);
 const crmKey=randomUUID();r=await call('create_client',{name:'CRM fixture',phone:actor},{key:crmKey});assert.equal(r.status,201);const client=r.body.client.id;
 const before=rows(schema.clients).length;r=await call('create_client',{name:'CRM fixture',phone:actor},{key:crmKey});assert.equal(r.body.alreadyProcessed,true);assert.equal(rows(schema.clients).length,before);
 r=await call('update_client',{clientId:client,email:'fixture@example.invalid'});assert.equal(r.status,200);assert.equal(rows(schema.clients).find(x=>x.id===client).email,'fixture@example.invalid');
 r=await call('list_clients');assert.equal(r.status,200);assert.equal(r.body.clients[0].id,client);
 r=await call('archive_client',{clientId:client});assert.equal(r.status,200);assert.equal(rows(schema.clients).find(x=>x.id===client).isActive,false);
 r=await call('list_clients');assert.deepEqual(r.body.clients,[]);assert.equal(localLookups,0);
});
test('actual actions POST: forged authority, wrong Hub, invalid data and documentary gap never mutate',async()=>{
 const before=writes;
 assert.equal((await call('create_team',{name:'No',leaderName:'No'},{token:process.env.SOFIA_HUB_SECRET})).status,403);
 assert.equal((await call('create_team',{name:'No',leaderName:'No'},{body:{centralHubId:randomUUID()}})).status,403);
 assert.equal((await call('create_team',{})).status,422);
 assert.equal((await call('adjust_stock',{quantity:'-1'})).status,422);
 assert.equal((await call('create_client',{name:'Invalid',phone:actor,document:'11111111111'})).status,422);
 assert.equal((await call('unknown_action')).status,422);
 const doc=await call('issue_service_draft',{draftId:randomUUID()});assert.equal(doc.status,422); // malformed documentary envelope still cannot mutate
 assert.equal(writes,before);
});
test('actual actions POST: ordinary Hub traffic still requires local active access',async()=>{
 const before=writes;
 const r=await call('create_team',{name:'No',leaderName:'No'},{token:process.env.SOFIA_HUB_SECRET,body:{centralRole:'hub_operator',centralGrantId:undefined,centralContactId:randomUUID(),centralClientId:randomUUID()}});
 assert.equal(r.status,403);assert.ok(localLookups>0);assert.equal(writes,before);
});
