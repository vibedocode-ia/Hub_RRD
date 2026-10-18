import test from 'node:test';
import assert from 'node:assert/strict';
import {hashPassword,verifyPassword,validatePassword} from '../credentials.mjs';
test('password policy preserves local algorithms and rejects only empty/whitespace or algorithm overflow',async()=>{
 for(const side of ['central','hub']){
  for(const p of ['', '   ','\t\n'])assert.throws(()=>validatePassword(p,side));
  const hash=await hashPassword(' x ',side);assert.equal(await verifyPassword(' x ',hash,side),true);assert.equal(await verifyPassword('x',hash,side),false);
  const short=await hashPassword('x',side);assert.equal(await verifyPassword('x',short,side),true);
 }
 validatePassword('é'.repeat(36),'central');assert.throws(()=>validatePassword('é'.repeat(37),'central'));
 validatePassword('x'.repeat(73),'hub');assert.throws(()=>validatePassword('x'.repeat(73),'central'));
});
