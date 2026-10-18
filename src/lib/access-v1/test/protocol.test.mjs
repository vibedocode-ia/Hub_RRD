import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync,randomUUID} from 'node:crypto';

test('wire uses JCS Ed25519, closed schema and rejects duplicate JSON keys',async()=>{
 const p=await import('../protocol.mjs');
 const {privateKey,publicKey}=generateKeyPairSync('ed25519');
 const version={federation_epoch:1,central_revision:0,local_revision:0,block_generation:0,membership_generation:0};
 const m=p.sign({protocol:'hvd.access.v1',kind:'ack',message_id:randomUUID(),hub_id:randomUUID(),issuer:'hub',audience:'urn:hvd:central:access:v1',issued_at:1,nonce:'a'.repeat(24),signing_key_id:'hub-message',payload:{acked_message_id:randomUUID(),command_id:null,status:'applied',reason_code:'ok',desired_version:null,applied_version:version,state_digest:p.digest({}),conflict_ref:null}},privateKey);
 assert.equal(p.verify(m,publicKey),true); p.validate('message',m);
 assert.equal(p.verify({...m,audience:'forged'},publicKey),false);
 assert.throws(()=>p.parse('{"a":1,"a":2}'));
 assert.throws(()=>p.parse('{"a":"\\ud800"}'));
 assert.throws(()=>p.validate('message',{...m,password:'forbidden'}));
 assert.equal(p.canonical({b:2,a:1}),'{"a":1,"b":2}');
});
