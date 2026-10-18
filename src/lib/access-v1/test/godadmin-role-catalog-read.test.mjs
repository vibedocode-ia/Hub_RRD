import test from 'node:test';
import assert from 'node:assert/strict';
import {createRoleManager} from '../roles.mjs';

function fixture(capability='access.roles.manage'){
 const rows=new Map(),proofs=[],writes=[],keys=[],sessions=[];
 const fail=(status,code)=>{throw Object.assign(new Error(code),{status})};
 const sql=async(strings,...v)=>{
  const q=strings.join('?');
  if(q.includes('insert into access_roles')){const [role_ref,hub_id,name,description,capabilities,revision,active]=v;rows.set(role_ref,{role_ref,hub_id,name,description,capabilities,revision,active});writes.push(role_ref);return [];}
  if(q.includes('select m.target_ref'))return [];
  if(q.includes('from access_roles')&&q.includes('for update'))return rows.has(v[0])?[rows.get(v[0])]:[];
  if(q.includes('from access_roles'))return [...rows.values()];
  throw new Error('unexpected SQL');
 };
 sql.json=x=>x;sql.begin=fn=>fn(sql);
 const roles=createRoleManager({cfg:{side:'hub',hubId:'fixture',sql},fail,
  fields(value,required,optional=[]){if(!value||required.some(k=>!Object.hasOwn(value,k))||Object.keys(value).some(k=>!required.includes(k)&&!optional.includes(k)))fail(422,'schema_invalid')},
  audit:async()=>{},idempotent:async(_tx,_actor,_op,key,_body,fn)=>{keys.push(key);return fn()},
  session:async(_tx,_req,options)=>{sessions.push(options);return {user_id:'local',state:{role:{kind:'system',key:'superadmin'},capabilities:['people.manage','profile.read']}}},
  lock:async()=>{},json:(value,status=200)=>({value,status}),saveMembership:async()=>{},
  proofCheck:async(_tx,ref,actor,confirmation,required)=>{proofs.push(required);if(ref!=='proof'||actor!=='godadmin'||confirmation!=='confirm'||required!==capability)fail(403,'invalid_authority')}
 });return {roles,rows,proofs,writes,keys,sessions};
}
const assertion={proof_ref:'proof',actor_identity_ref:'godadmin',confirmation_ref:'confirm',authorization_ref:'authorization-key-123'};
const req=new Request('https://hub.invalid/api/access/v1/local/roles',{headers:{'idempotency-key':'local-key-123'}});
const body={name:'Fixture',description:'test only',capabilities:['profile.read'],confirmed:true};
test('GodAdmin GET uses access.roles.manage proof and full catalog',async()=>{
 const f=fixture();const r=await f.roles.handle(req,'/local/roles','GET',{},assertion);
 assert.equal(r.status,200);assert.ok(r.value.catalog.some(x=>x.key==='people.manage'));assert.deepEqual(f.proofs,['access.roles.manage']);assert.equal(f.writes.length,0);
});
test('GodAdmin creates and edits role using people.manage proof and assertion idempotency key',async()=>{
 const f=fixture('people.manage');const created=await f.roles.handle(req,'/local/roles','POST',body,assertion);assert.equal(created.status,201);
 const ref=created.value.role.role_ref;assert.equal(f.rows.get(ref).name,'Fixture');
 const updated=await f.roles.handle(req,'/local/roles/'+ref,'PATCH',{...body,name:'Edited',active:true,expected_revision:1},assertion);
 assert.equal(updated.status,200);assert.equal(f.rows.get(ref).name,'Edited');assert.equal(f.rows.get(ref).revision,2);
 assert.deepEqual(f.proofs,['people.manage','people.manage']);assert.deepEqual(f.keys,[assertion.authorization_ref,assertion.authorization_ref]);assert.equal(f.sessions.length,0);
});
test('read-only proof never mutates and invalid confirmation never mutates',async()=>{
 const f=fixture();for(const method of ['POST','PATCH'])await assert.rejects(()=>f.roles.handle(req,'/local/roles',''+method,body,assertion),/invalid_authority/);
 assert.equal(f.writes.length,0);const g=fixture('people.manage');await assert.rejects(()=>g.roles.handle(req,'/local/roles','POST',body,{...assertion,confirmation_ref:'wrong'}),/invalid_authority/);assert.equal(g.writes.length,0);
});
test('GodAdmin still requires explicit confirmation and validates role revision',async()=>{
 const f=fixture('people.manage');await assert.rejects(()=>f.roles.handle(req,'/local/roles','POST',{...body,confirmed:false},assertion),/delegation_ceiling/);
 await assert.rejects(()=>f.roles.handle(req,'/local/roles/absent','PATCH',{...body,active:true,expected_revision:1},assertion),/role_conflict/);assert.equal(f.writes.length,0);
});
test('local session path retains fresh mutation and local idempotency key',async()=>{
 const f=fixture();const r=await f.roles.handle(req,'/local/roles','POST',body);assert.equal(r.status,201);assert.deepEqual(f.proofs,[]);assert.deepEqual(f.sessions,[{fresh:true}]);assert.deepEqual(f.keys,['local-key-123']);
});
