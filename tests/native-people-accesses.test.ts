import test from 'node:test'
import assert from 'node:assert/strict'
import { isNativePeopleAccessRead, listNativePeopleAccesses } from '../src/lib/native-people-accesses'
import { authorizeRrdCentralEnvelope } from '../src/lib/sofia-godadmin-policy'
const hub='11111111-1111-4111-8111-111111111111'
const envelope={ action:'list_people_accesses', centralRole:'god_admin', centralHubId:hub, centralGrantId:'22222222-2222-4222-8222-222222222222', senderPhone:'+15550000000' }
test('native access read requires dedicated Central transport and exact envelope',()=>{
  assert.equal(isNativePeopleAccessRead(envelope,authorizeRrdCentralEnvelope(envelope,{expectedHubId:hub,trustedGodAdmin:true})),true)
  for (const value of [envelope,{...envelope,centralRole:'superadmin'},{...envelope,centralContactId:hub}]) assert.equal(isNativePeopleAccessRead(value,authorizeRrdCentralEnvelope(value,{expectedHubId:hub,trustedGodAdmin:false})),false)
  assert.equal(isNativePeopleAccessRead({...envelope,data:{}},true),false)
  assert.equal(isNativePeopleAccessRead({...envelope,action:'update_person_profile'},true),false)
})
test('reader preserves inactive native people, aggregates permissions and has no private identity/credential projection',async()=>{
  const rows=[{id:'a',name:'Fixture',role:'ADMIN',isActive:true,permission:'people.manage'},{id:'a',name:'Fixture',role:'ADMIN',isActive:true,permission:'people.manage'},{id:'b',name:'Inactive',role:'LEITURA',isActive:false,permission:null}]
  let fields:string[]=[]
  const fixture={select(columns:object){fields=Object.keys(columns);return {from(){return {leftJoin(){return {orderBy:async()=>rows}}}}}}}
  const people=await listNativePeopleAccesses(fixture as any)
  assert.deepEqual(fields.sort(),['id','isActive','name','permission','role'])
  assert.equal(people.length,2)
  assert.deepEqual(people[0].permissions,['people.manage'])
  assert.equal(people[1].isActive,false)
  assert.deepEqual(people[1].permissions,[])
  assert.doesNotMatch(JSON.stringify(people),/password|phone|email|document/)
})
