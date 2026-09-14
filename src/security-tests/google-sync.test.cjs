const {test}=require('node:test'),assert=require('node:assert/strict');
const {harness,memoryDB}=require('./harness.cjs');
const schema=harness()('src/db/schema.ts');
const row=()=>({id:'event1',title:'Visit',startsAt:new Date('2026-10-01T10:00:00Z'),endsAt:new Date('2026-10-01T11:00:00Z'),updatedAt:new Date(),status:'SCHEDULED',googleEventId:null});
const integration={id:'integration1',status:'CONNECTED',primaryEmail:'a@example.test',accountSubject:'sub1',verifiedEmail:'a@example.test',calendarId:'primary',tokenCiphertext:'cipher',tokenIv:'iv',tokenTag:'tag'};
function setup(fetch,event=row()){const db=memoryDB(t=>t===schema.googleIntegrations?[integration]:[event]);db.transaction=async cb=>cb(db);db.execute=async()=>[];const load=harness({'@/db':{...schema,db},'@/lib/google-oauth':{decryptOAuthToken:()=>JSON.stringify({access_token:'synthetic',expiry_date:Date.now()+3600000})},fetch},{GOOGLE_TOKEN_ENCRYPTION_KEY:'1'.repeat(64)});return {db,event,sync:load('src/lib/google-calendar.ts').syncAgendaEventToGoogle}}
test('RRD-02 network/JSON failures are sanitized and persist FAILED',async()=>{for(const fetch of [async()=>{throw Error('SECRET')},async()=>({ok:true,json:async()=>{throw Error('SECRET')}})]){const{sync,db,event}=setup(fetch);const result=await sync(event);assert.equal(result.reason,'GOOGLE_SYNC_FAILED');assert.ok(db.writes.some(w=>w.p.googleSyncStatus==='FAILED'));assert.equal(JSON.stringify(result).includes('SECRET'),false)}});
module.exports={setup,row,integration,schema};
