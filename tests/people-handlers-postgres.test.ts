import test from 'node:test'
import assert from 'node:assert/strict'
import { AsyncLocalStorage } from 'node:async_hooks'
import { randomUUID } from 'node:crypto'
import postgres from 'postgres'

const url = process.env.RRD_PEOPLE_TEST_DATABASE_URL
if (url && !/^postgres:\/\/postgres@127\.0\.0\.1:\d+\/rrd_people_test$/.test(url)) throw new Error('Disposable localhost database required')
test('real people handlers / PostgreSQL', { skip: !url }, async t => {
 process.env.POSTGRES_RRD_URL = url!
 process.env.DATABASE_URL = url!
 ;(globalThis as any).AsyncLocalStorage = AsyncLocalStorage
 const sql = postgres(url!, { max: 3, onnotice: () => {} })
 const { workAsyncStorage } = await import('next/dist/server/app-render/work-async-storage.external')
 const { workUnitAsyncStorage } = await import('next/dist/server/app-render/work-unit-async-storage.external')
 const { RequestCookies } = await import('next/dist/server/web/spec-extension/cookies')
 const { NextRequest } = await import('next/server')
 const { DELETE, PATCH } = await import('../src/app/api/settings/people/[id]/route')
 const { conn } = await import('../src/db')
 await sql.unsafe(`
 DROP SCHEMA public CASCADE; CREATE SCHEMA public;
 CREATE TABLE users (id uuid primary key default gen_random_uuid(), name text not null, phone text unique not null, email text, job_title text, photo_url text, password_hash text not null, role text not null, is_active boolean not null default true, last_login_at timestamp, created_at timestamp default now(), updated_at timestamp default now());
 CREATE TABLE user_permissions (id uuid primary key default gen_random_uuid(), user_id uuid references users(id) on delete cascade, permission_key text not null, granted_by_id uuid references users(id), created_at timestamp default now());
 CREATE TABLE sessions (id text primary key, user_id uuid references users(id) on delete cascade, expires_at timestamp not null, created_at timestamp default now());
 CREATE TABLE password_recovery_tokens (id uuid primary key default gen_random_uuid(), user_id uuid references users(id) on delete cascade);
 CREATE TABLE teams (id uuid primary key default gen_random_uuid(), participants jsonb not null default '[]');
 CREATE TABLE protected_links (id uuid primary key default gen_random_uuid(), user_id uuid references users(id) on delete set null);
 CREATE TABLE audit_events (id uuid primary key default gen_random_uuid(), actor_user_id uuid references users(id), action text, target_type text, target_id uuid, metadata jsonb, created_at timestamp default now());`)
 async function person(role = 'LEITURA', grants: string[] = []) {
  const id = randomUUID()
  await sql`INSERT INTO users(id,name,phone,password_hash,role) VALUES (${id},${'QA '+id},${id},'not-a-login-hash',${role})`
  for (const key of grants) await sql`INSERT INTO user_permissions(user_id,permission_key) VALUES (${id},${key})`
  const token = randomUUID()
  await sql`INSERT INTO sessions(id,user_id,expires_at) VALUES (${token},${id},now()+interval '1 hour')`
  return { id, token }
 }
 async function call(method: 'DELETE'|'PATCH', actor: {token:string}, id: string, body: object = {}) {
  const req = new NextRequest('http://localhost/api/settings/people/'+id, { method, headers: {cookie: 'rrd_session_token='+actor.token, 'content-type':'application/json'}, ...(method === 'PATCH' ? {body: JSON.stringify(body)} : {}) })
  return workAsyncStorage.run({route:'/api/settings/people/[id]'} as any, () => workUnitAsyncStorage.run({type:'request',phase:'render',cookies:new RequestCookies(req.headers)} as any, () => (method === 'DELETE' ? DELETE : PATCH)(req, {params:Promise.resolve({id})})))
 }
 async function blockedRace(method: 'DELETE'|'PATCH', mutate: (actor:string,target:string) => Promise<unknown>, expected: number, permissionsOnly = false) {
  const actor = await person('ADMIN',['people.manage'])
  const target = await person('TEAM')
  const blocker = await sql.reserve()
  let committed = false
  try {
   await blocker`BEGIN`
   if (permissionsOnly) await blocker`LOCK TABLE user_permissions IN SHARE ROW EXCLUSIVE MODE`
   else await blocker`LOCK TABLE users IN SHARE ROW EXCLUSIVE MODE`
   const pending = call(method,actor,target.id,{name:'Must not save'})
   let waiting = false
   for (let i=0;i<200;i++) {
    const rows = await sql`SELECT 1 FROM pg_stat_activity WHERE datname=current_database() AND wait_event_type='Lock' AND query ILIKE '%LOCK TABLE%users%'`
    if (rows.length) { waiting = true; break }
    await new Promise(r=>setTimeout(r,10))
   }
   assert.equal(waiting,true,'handler reached transactional lock')
   // Use the lock-owning connection so users mutations do not wait on ourselves.
   await mutateWith(blocker, actor.id, target.id)
   await blocker`COMMIT`; committed = true
   assert.equal((await pending).status,expected)
   const [row] = await sql`SELECT name FROM users WHERE id=${target.id}`
   assert.ok(row); assert.notEqual(row.name,'Must not save')
  } finally { if (!committed) await blocker`ROLLBACK`; blocker.release() }
  async function mutateWith(connection: any,a:string,b:string) { await mutate.call(connection,a,b) }
 }
 try {
  for (const method of ['DELETE','PATCH'] as const) {
   await t.test(method+' serializes permission-only revocation writer', async () => {
    await blockedRace(method,async function(this:any,a){await this`DELETE FROM user_permissions WHERE user_id=${a}`},403,true)
   })
   await t.test(method+' rejects inactive actor after lock', async () => {
    await blockedRace(method,async function(this:any,a){await this`UPDATE users SET is_active=false WHERE id=${a}`},401)
   })
   await t.test(method+' rejects demoted actor after lock', async () => {
    await blockedRace(method,async function(this:any,a){await this`UPDATE users SET role='LEITURA' WHERE id=${a}`},403)
   })
   await t.test(method+' rejects target promoted after lock', async () => {
    await blockedRace(method,async function(this:any,_a,b){await this`UPDATE users SET role='OWNER' WHERE id=${b}`},403)
   })
   await t.test(method+' rejects revoked permission after lock', async () => {
    await blockedRace(method,async function(this:any,a){await this`DELETE FROM user_permissions WHERE user_id=${a}`},403)
   })
  }
  await t.test('authenticated PATCH persists and DELETE removes only disposable QA credentials', async () => {
   const admin = await person('ADMIN',['people.manage']); const target = await person()
   const sentinels = await Promise.all([person(),person(),person()])
   for (const p of sentinels) await sql`INSERT INTO protected_links(user_id) VALUES (${p.id})`
   const before = await sql`SELECT * FROM users WHERE id=ANY(${sentinels.map(p=>p.id)}::uuid[]) ORDER BY id`
   const links = await sql`SELECT * FROM protected_links ORDER BY id`
   const response = await call('PATCH',admin,target.id,{name:'QA updated'})
   assert.equal(response.status,200)
   const payload = await response.json()
   assert.equal(payload.person.name,'QA updated')
   assert.equal(JSON.stringify(payload).includes('passwordHash'),false)
   assert.equal((await call('DELETE',admin,target.id)).status,200)
   assert.equal((await sql`SELECT 1 FROM users WHERE id=${target.id}`).length,0)
   assert.equal((await sql`SELECT 1 FROM sessions WHERE user_id=${target.id}`).length,0)
   assert.equal((await sql`SELECT 1 FROM audit_events WHERE target_id=${target.id} AND action='person.deleted'`).length,1)
   assert.deepEqual(await sql`SELECT * FROM users WHERE id=ANY(${sentinels.map(p=>p.id)}::uuid[]) ORDER BY id`,before)
   assert.deepEqual(await sql`SELECT * FROM protected_links ORDER BY id`,links)
  })
  await t.test('PATCH enforces password authority against current target', async () => {
   const admin=await person('ADMIN',['people.manage']); const peer=await person('ADMIN'); const lower=await person()
   const password='synthetic-only-'+randomUUID()
   assert.equal((await call('PATCH',admin,peer.id,{password})).status,403)
   assert.equal((await call('PATCH',admin,lower.id,{password})).status,200)
   const [row]=await sql`SELECT password_hash FROM users WHERE id=${lower.id}`
   const {verifyPassword}=await import('../src/lib/auth-crypto')
   assert.equal(verifyPassword(password,row.password_hash),true)
   assert.equal((await sql`SELECT 1 FROM sessions WHERE user_id=${lower.id}`).length,0)
  })
  await t.test('DELETE history is 409 and preserves SET NULL link and person', async () => {
   const admin=await person('ADMIN',['people.manage']); const target=await person()
   await sql`INSERT INTO protected_links(user_id) VALUES (${target.id})`
   const response=await call('DELETE',admin,target.id)
   assert.equal(response.status,409); assert.equal((await response.json()).canDeactivate,true)
   assert.equal((await sql`SELECT 1 FROM protected_links WHERE user_id=${target.id}`).length,1)
   assert.equal((await sql`SELECT 1 FROM users WHERE id=${target.id}`).length,1)
  })
  await t.test('handlers reject forged expired and permissionless identities', async () => {
   const target=await person(); const denied=await person('ADMIN')
   const expired=await person('ADMIN',['people.manage'])
   await sql`UPDATE sessions SET expires_at=now()-interval '1 hour' WHERE id=${expired.token}`
   for (const method of ['DELETE','PATCH'] as const) {
    assert.equal((await call(method,{token:'forged'},target.id,{name:'No'})).status,401)
    assert.equal((await call(method,expired,target.id,{name:'No'})).status,401)
    assert.equal((await call(method,denied,target.id,{name:'No'})).status,403)
   }
  })
  await t.test('DELETE detects UUID and name-object team links without rewriting teams', async () => {
   const admin=await person('ADMIN',['people.manage']); const target=await person()
   const [row]=await sql`SELECT name FROM users WHERE id=${target.id}`
   for (const participants of [[target.id],[{name:row.name}]]) {
    await sql`INSERT INTO teams(participants) VALUES (${JSON.stringify(participants)}::jsonb)`
    const before=await sql`SELECT * FROM teams ORDER BY id`
    assert.equal((await call('DELETE',admin,target.id)).status,409)
    assert.deepEqual(await sql`SELECT * FROM teams ORDER BY id`,before)
    await sql`DELETE FROM teams`
   }
  })
  await t.test('DELETE serializes concurrent legacy team writer and preserves membership', async () => {
   const admin=await person('ADMIN',['people.manage']); const target=await person()
   const writer=await sql.reserve()
   try {
    await writer`BEGIN`; await writer`LOCK TABLE teams IN SHARE ROW EXCLUSIVE MODE`
    const pending=call('DELETE',admin,target.id)
    let waiting=false
    for(let i=0;i<200;i++) {
     const rows=await sql`SELECT 1 FROM pg_stat_activity WHERE datname=current_database() AND wait_event_type='Lock' AND query ILIKE '%LOCK TABLE teams%'`
     if(rows.length){waiting=true;break}; await new Promise(r=>setTimeout(r,10))
    }
    assert.equal(waiting,true)
    await writer`INSERT INTO teams(participants) VALUES (${JSON.stringify([target.id])}::jsonb)`
    await writer`COMMIT`
    assert.equal((await pending).status,409)
    assert.equal((await sql`SELECT 1 FROM users WHERE id=${target.id}`).length,1)
   } finally { writer.release(); await sql`DELETE FROM teams` }
  })
  await t.test('last admin and competing revocations remain safe through real handlers', async () => {
   await sql.unsafe('TRUNCATE users,user_permissions,sessions,password_recovery_tokens,protected_links,audit_events,teams')
   const a=await person('ADMIN',['people.manage']); const b=await person('ADMIN',['people.manage'])
   const results=await Promise.all([call('PATCH',a,b.id,{permissions:[]}),call('PATCH',b,a.id,{permissions:[]})])
   assert.deepEqual(results.map(r=>r.status).sort(),[200,403])
   const remaining=await sql`SELECT u.id FROM users u JOIN user_permissions p ON p.user_id=u.id WHERE u.is_active AND p.permission_key='people.manage'`
   assert.equal(remaining.length,1)
   const admin=remaining[0].id===a.id?a:b
   assert.equal((await call('DELETE',admin,admin.id)).status,409)
   assert.equal((await call('PATCH',admin,admin.id,{isActive:false})).status,409)
   const {db}=await import('../src/db'); const {assertPersonRemovalSafe}=await import('../src/lib/people-safety')
   await assert.rejects(db.transaction(tx=>assertPersonRemovalSafe(tx,admin.id,{permissions:[]})),/último administrador/)
  })
  await t.test('DELETE protects legacy free text team membership', async () => {
   const admin = await person('ADMIN',['people.manage']); const target = await person()
   await sql`UPDATE users SET name='José da Silva' WHERE id=${target.id}`
   await sql`INSERT INTO teams(participants) VALUES (${JSON.stringify(['Equipe: JOSE DA SILVA (plantão)'])}::jsonb)`
   assert.equal((await call('DELETE',admin,target.id)).status,409)
   await sql`DELETE FROM teams`
  })
  await t.test('PATCH rejects target promoted while waiting for lock', async () => {
   await blockedRace('PATCH',async function(this:any,_a,b){await this`UPDATE users SET role='OWNER' WHERE id=${b}`},403)
  })
  await t.test('DELETE rejects permission revoked while waiting for lock', async () => {
   await blockedRace('DELETE',async function(this:any,a){await this`DELETE FROM user_permissions WHERE user_id=${a}`},403)
  })
 } finally { await sql.end(); await conn?.end() }
})
