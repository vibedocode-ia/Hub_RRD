import test from 'node:test';
import assert from 'node:assert/strict';
test('RR actual Next catch-all is OFF before any database access',async()=>{
 delete process.env.ACCESS_V1_ENABLED;
 const route=await import('../../../app/api/access/v1/[...segments]/route.ts');
 assert.equal((await route.GET(new Request('https://127.0.0.1/api/access/v1/local/me'))).status,404);
});
