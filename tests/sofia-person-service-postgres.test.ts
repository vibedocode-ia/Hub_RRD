import test from 'node:test'
import assert from 'node:assert/strict'
import postgres from 'postgres'
const url = process.env.RRD_PROFILE_TEST_DATABASE_URL
if (!url || !/^postgres:\/\/postgres@127\.0\.0\.1:\d+\/rrd_people_test$/.test(url)) throw new Error('Explicit disposable database required')
test('profile backend service on disposable PostgreSQL', async t => {
 process.env.POSTGRES_RRD_URL = url
 process.env.DATABASE_URL = url
 const sql = postgres(url, { max: 4 })
 const { db, conn } = await import('../src/db')
 try {
  await sql.unsafe(`CREATE TABLE users (id uuid primary key default gen_random_uuid(), name text not null, phone text unique not null, email text, job_title text, photo_url text, company text, city text, state text, instagram_url text, website_url text, personal_notes text, password_hash text not null default 'secret', role text not null, is_active boolean not null default true, last_login_at timestamp, created_at timestamp not null default now(), updated_at timestamp not null default now());
  CREATE TABLE user_permissions (id uuid primary key default gen_random_uuid(), user_id uuid not null references users(id), permission_key text not null, granted_by_id uuid references users(id), created_at timestamp not null default now(), UNIQUE(user_id,permission_key));
  CREATE TABLE sessions (id text primary key, user_id uuid references users(id), expires_at timestamp not null, created_at timestamp default now());
  CREATE TABLE audit_events (id uuid primary key default gen_random_uuid(), actor_user_id uuid references users(id), action text not null, target_type text not null, target_id uuid, metadata jsonb, created_at timestamp default now());`)
  const [admin] = await sql`INSERT INTO users(name,phone,role) VALUES ('Admin','5521999999901','ADMIN') RETURNING id,phone`
  const [person] = await sql`INSERT INTO users(name,phone,role) VALUES ('Pessoa','5521999999902','LEITURA') RETURNING id,phone`
  await sql`INSERT INTO user_permissions(user_id,permission_key) VALUES (${admin.id},'sofia.use'),(${admin.id},'people.manage'),(${person.id},'sofia.use')`
  const service = await import('../src/lib/sofia-person-profile-service')
  const call = (sender: string, action: string, data: unknown, options = {}) => service.executeSofiaManagedPersonProfile(action, data, sender, { database: db, ...options })
  await t.test('manager resolves requested person by phone; non-manager denied without existence leak', async () => {
   const result = await call(admin.phone, 'get_person_profile', { targetPhone: person.phone })
   assert.equal(result.status, 200)
   assert.equal(result.body.profile?.id, person.id)
   assert.deepEqual(result.body.profile?.permissions, ['sofia.use'])
   assert.equal(JSON.stringify(result).includes('secret'), false)
   assert.equal((await call(person.phone, 'get_person_profile', { targetPhone: admin.phone })).status, 403)
   assert.equal((await call(person.phone, 'get_person_profile', { targetPhone: '5521999999909' })).status, 403)
  })
  await t.test('ADMIN cannot edit an OWNER even with people.manage; lower targets and peers remain manageable', async () => {
   const [owner] = await sql`INSERT INTO users(name,phone,role) VALUES ('Owner','5521999999920','OWNER') RETURNING id,phone`
   const result = await call(admin.phone, 'update_person_profile', { targetPhone: owner.phone, patch: { name: 'Must not save', isActive: false } })
   assert.equal(result.status, 403)
   assert.equal(result.body.code, 'SUPERIOR_ROLE')
   assert.deepEqual((await sql`SELECT name,is_active FROM users WHERE id=${owner.id}`)[0], { name: 'Owner', is_active: true })
   assert.equal((await sql`SELECT * FROM audit_events WHERE target_id=${owner.id}`).length, 0)
   assert.equal((await call(admin.phone, 'update_person_profile', { targetPhone: admin.phone, patch: { jobTitle: 'Gestor' } })).status, 200)
   await sql`DELETE FROM users WHERE id=${owner.id}`
   const [peer] = await sql`INSERT INTO users(name,phone,role) VALUES ('Peer','5521999999922','ADMIN') RETURNING id,phone`
   assert.equal((await call(admin.phone, 'update_person_profile', { targetPhone: peer.phone, patch: { jobTitle: 'Gestor par' } })).status, 200)
   assert.equal((await sql`SELECT job_title FROM users WHERE id=${peer.id}`)[0].job_title, 'Gestor par')
   await sql`DELETE FROM users WHERE id=${peer.id}`
  })
  await t.test('self edits only personal data and reports metadata, status, role and permission keys', async () => {
   const { executeSofiaPersonProfile } = await import('../src/lib/sofia-person-profile')
   const self = await executeSofiaPersonProfile('update_my_profile', { jobTitle: 'Encarregado', city: 'Rio' }, person.phone)
   assert.equal(self.status, 200)
   assert.equal(self.body.profile?.role, 'LEITURA')
   assert.equal(self.body.profile?.isActive, true)
   assert.ok(self.body.profile?.createdAt)
   assert.deepEqual(self.body.profile?.permissions, ['sofia.use'])
   for (const patch of [{ role: 'ADMIN' }, { isActive: false }, { phone: admin.phone }, { permissions: ['people.manage'] }]) assert.equal((await executeSofiaPersonProfile('update_my_profile', patch, person.phone)).status, 422)
   await sql`DELETE FROM user_permissions WHERE user_id=${person.id}`
   assert.equal((await executeSofiaPersonProfile('get_my_profile', {}, person.phone)).status, 403)
   await sql`INSERT INTO user_permissions(user_id,permission_key) VALUES (${person.id},'sofia.use')`
  })
  await t.test('manager edits description and status but never role or permission grants', async () => {
   assert.equal((await call(admin.phone, 'update_person_profile', { targetPhone: person.phone, patch: { jobTitle: 'Diretor', isActive: false } })).status, 200)
   const [saved] = await sql`SELECT role,job_title,is_active FROM users WHERE id=${person.id}`
   assert.deepEqual(saved, { role: 'LEITURA', job_title: 'Diretor', is_active: false })
   assert.equal((await call(admin.phone, 'update_person_profile', { targetPhone: person.phone, patch: { role: 'ADMIN' } })).status, 422)
   assert.equal((await call(admin.phone, 'update_person_profile', { targetPhone: person.phone, patch: { permissions: [] } })).status, 422)
   assert.equal((await call(admin.phone, 'update_person_profile', { targetPhone: admin.phone, patch: { isActive: false } })).body.code, 'SELF_LOCKOUT')
   await sql`UPDATE users SET is_active=true WHERE id=${person.id}`
   await sql`INSERT INTO sessions(id,user_id,expires_at) VALUES ('test-session',${person.id},now()+interval '1 day')`
   assert.equal((await call(admin.phone, 'update_person_profile', { targetPhone: person.phone, patch: { isActive: false } })).status, 200)
   assert.equal((await sql`SELECT * FROM sessions WHERE user_id=${person.id}`).length, 0)
   assert.equal((await sql`SELECT * FROM audit_events WHERE actor_user_id=${admin.id} AND target_id=${person.id}`).length, 2)
  })
  await t.test('last admin invariant and revoked manager gate are enforced in database transaction', async () => {
   await sql`DELETE FROM user_permissions WHERE user_id=${admin.id} AND permission_key='people.manage'`
   assert.equal((await call(admin.phone, 'get_person_profile', { targetPhone: person.phone })).status, 403)
   await sql`INSERT INTO user_permissions(user_id,permission_key) VALUES (${admin.id},'people.manage')`
   const [operator] = await sql`INSERT INTO users(name,phone,role) VALUES ('Operator','5521999999903','LEITURA') RETURNING id,phone`
   await sql`INSERT INTO user_permissions(user_id,permission_key) VALUES (${operator.id},'people.manage'),(${operator.id},'sofia.use')`
   assert.equal((await call(operator.phone, 'update_person_profile', { targetPhone: admin.phone, patch: { isActive: false } })).status, 403)
  })
  await t.test('managed service rechecks actor role, target role and grants after transactional lock', async () => {
   for (const mutation of ['demote-actor', 'promote-target', 'revoke-manager', 'deactivate-actor']) {
    await sql`UPDATE users SET role='TEAM' WHERE id=${person.id}`
    const blocker = await sql.reserve()
    let committed = false
    let pending: ReturnType<typeof call> | undefined
    try {
     await blocker`BEGIN`
     await blocker`LOCK TABLE users IN SHARE ROW EXCLUSIVE MODE`
     pending = call(admin.phone, 'update_person_profile', { targetPhone: person.phone, patch: { name: 'Must not save' } })
     let waiting = false
     for (let i = 0; i < 200; i++) {
      if ((await sql`SELECT 1 FROM pg_stat_activity WHERE datname=current_database() AND wait_event_type='Lock' AND query ILIKE '%LOCK TABLE%users%'`).length) { waiting = true; break }
      await new Promise(resolve => setTimeout(resolve, 10))
     }
     assert.equal(waiting, true, mutation + ' reached transaction lock')
     if (mutation === 'demote-actor') await blocker`UPDATE users SET role='LEITURA' WHERE id=${admin.id}`
     if (mutation === 'promote-target') await blocker`UPDATE users SET role='OWNER' WHERE id=${person.id}`
     if (mutation === 'revoke-manager') await blocker`DELETE FROM user_permissions WHERE user_id=${admin.id} AND permission_key='people.manage'`
     if (mutation === 'deactivate-actor') await blocker`UPDATE users SET is_active=false WHERE id=${admin.id}`
     await blocker`COMMIT`; committed = true
     assert.equal((await pending).status, 403, mutation)
     assert.notEqual((await sql`SELECT name FROM users WHERE id=${person.id}`)[0].name, 'Must not save')
    } finally {
     if (!committed) await blocker`ROLLBACK`
     blocker.release()
     await pending
     await sql`UPDATE users SET role='ADMIN',is_active=true WHERE id=${admin.id}`
     await sql`UPDATE users SET role='LEITURA' WHERE id=${person.id}`
     await sql`INSERT INTO user_permissions(user_id,permission_key) VALUES (${admin.id},'people.manage') ON CONFLICT DO NOTHING`
    }
   }
  })
  await t.test('phone identity cannot be changed, including removed registration-only escape hatch', async () => {
   await sql`UPDATE users SET is_active=true WHERE id=${person.id}`
   const request = { targetPhone: person.phone, patch: { phone: '5521999999910' } }
   await sql`INSERT INTO sessions(id,user_id,expires_at) VALUES ('phone-session',${person.id},now()+interval '1 day')`
   assert.equal((await call(admin.phone, 'update_person_profile', request)).body.code, 'CENTRAL_IDENTITY_AUTHORIZATION_REQUIRED')
   for (const options of [
    { phoneIdentityMode: 'registration_only' },
    { phoneIdentityMode: 'registration_only', trustedActorUserId: admin.id },
   ]) assert.equal((await call(admin.phone, 'update_person_profile', request, options)).status, 409)
   assert.equal((await sql`SELECT phone FROM users WHERE id=${person.id}`)[0].phone, person.phone)
   assert.equal((await sql`SELECT * FROM sessions WHERE user_id=${person.id}`).length, 1)
   assert.equal((await sql`SELECT * FROM audit_events WHERE metadata ? 'phoneScope'`).length, 0)
   await sql`DELETE FROM sessions WHERE id='phone-session'`
  })
  await t.test('concurrent admin deactivation cannot remove both active administrators', async () => {
   const [second] = await sql`INSERT INTO users(name,phone,role) VALUES ('Admin two','5521999999911','ADMIN') RETURNING id,phone`
   await sql`INSERT INTO user_permissions(user_id,permission_key) VALUES (${second.id},'people.manage'),(${second.id},'sofia.use')`
   const results = await Promise.all([
    call(admin.phone, 'update_person_profile', { targetPhone: second.phone, patch: { isActive: false } }),
    call(second.phone, 'update_person_profile', { targetPhone: admin.phone, patch: { isActive: false } }),
   ])
   assert.deepEqual(results.map(r => r.status).sort(), [200,403])
   const [count] = await sql`SELECT count(*)::int AS n FROM users WHERE role='ADMIN' AND is_active=true`
   assert.equal(count.n, 1)
   await sql`UPDATE users SET is_active=true WHERE id=${admin.id}`
  })
  await t.test('real actions POST applies transport, hub, local grants, strict schema and managed hierarchy gates', async () => {
   process.env.SOFIA_HUB_SECRET = 'disposable-hub-secret'
   process.env.SOFIA_RRD_CENTRAL_SECRET = 'disposable-central-secret'
   process.env.RRD_HUB_ID = '33333333-3333-4333-8333-333333333333'
   const { POST } = await import('../src/app/api/sofia/actions/route')
   const { NextRequest } = await import('next/server')
   const envelope = { centralContactId: '11111111-1111-4111-8111-111111111111', centralClientId: '22222222-2222-4222-8222-222222222222', centralHubId: process.env.RRD_HUB_ID, centralRole: 'hub_admin', senderPhone: '+' + admin.phone, action: 'update_person_profile', data: { targetPhone: person.phone, patch: { city: 'Niterói' } } }
   const post = (body: object, token = process.env.SOFIA_HUB_SECRET, key = 'profile-route-test') => POST(new NextRequest('http://localhost/api/sofia/actions', { method: 'POST', headers: { authorization: 'Bearer ' + token, 'idempotency-key': key, 'content-type': 'application/json' }, body: JSON.stringify(body) }))
   assert.equal((await post(envelope, 'wrong-token')).status, 401)
   assert.equal((await post(envelope, undefined, 'bad')).status, 400)
   assert.equal((await post({ ...envelope, centralHubId: '44444444-4444-4444-8444-444444444444' })).status, 403)
   assert.equal((await post({ ...envelope, senderPhone: '5521999999998' })).status, 403)
   assert.equal((await post({ ...envelope, data: { ...envelope.data, phoneIdentityMode: 'registration_only' } })).status, 422)
   assert.equal((await post({ ...envelope, data: { targetPhone: person.phone, patch: { role: 'OWNER' } } })).status, 422)
   const read = await post({ ...envelope, action: 'get_person_profile', data: { targetPhone: person.phone } })
   assert.equal(read.status, 200)
   assert.equal((await read.json()).profile.id, person.id)
   assert.equal((await post(envelope)).status, 200)
   assert.equal((await post({ ...envelope, data: { targetPhone: person.phone, patch: { phone: '5521999999930' } } })).status, 409)
   assert.equal((await sql`SELECT city FROM users WHERE id=${person.id}`)[0].city, 'Niterói')
   const [owner] = await sql`INSERT INTO users(name,phone,role) VALUES ('Route owner','5521999999921','OWNER') RETURNING id,phone`
   assert.equal((await post({ ...envelope, centralRole: 'hub_owner', data: { targetPhone: owner.phone, patch: { name: 'Must not save' } } })).status, 403)
   assert.equal((await sql`SELECT name FROM users WHERE id=${owner.id}`)[0].name, 'Route owner')
   await sql`DELETE FROM user_permissions WHERE user_id=${admin.id} AND permission_key='people.manage'`
   assert.equal((await post(envelope)).status, 403)
   await sql`INSERT INTO user_permissions(user_id,permission_key) VALUES (${admin.id},'people.manage')`
   await sql`DELETE FROM user_permissions WHERE user_id=${admin.id} AND permission_key='sofia.use'`
   assert.equal((await post(envelope)).status, 403)
   await sql`INSERT INTO user_permissions(user_id,permission_key) VALUES (${admin.id},'sofia.use')`
   // Dedicated Central authority may manage a real target without acquiring a
   // local role or creating a sender account; ordinary transport still cannot forge it.
   const god = { centralRole: 'god_admin', centralGrantId: '55555555-5555-4555-8555-555555555555', centralHubId: process.env.RRD_HUB_ID, senderPhone: '+' + admin.phone, action: envelope.action, data: envelope.data }
   assert.equal((await post(god)).status, 403)
   assert.equal((await post(god, process.env.SOFIA_RRD_CENTRAL_SECRET)).status, 200)
   // Authenticated sovereign identity need not have a local account or permission row.
   // Explicit synthetic transport identity, not mapped to any user's UUID.
   const sovereign = { ...god, senderPhone: '+5521999999988', data: { targetPhone: owner.phone, patch: { jobTitle: 'Gestão soberana' } } }
   const countBefore = (await sql`SELECT count(*)::int AS n FROM users`)[0].n
   assert.equal((await post(sovereign, process.env.SOFIA_RRD_CENTRAL_SECRET)).status, 200)
   assert.equal((await sql`SELECT job_title FROM users WHERE id=${owner.id}`)[0].job_title, 'Gestão soberana')
   const readback = await post({ ...sovereign, action: 'get_person_profile', data: { targetPhone: owner.phone } }, process.env.SOFIA_RRD_CENTRAL_SECRET)
   assert.equal((await readback.json()).profile.jobTitle, 'Gestão soberana')
   const [audit] = await sql`SELECT actor_user_id,metadata FROM audit_events WHERE target_id=${owner.id} ORDER BY created_at DESC LIMIT 1`
   assert.equal(audit.actor_user_id, null)
   assert.equal(audit.metadata.centralGrantId, god.centralGrantId)
   assert.equal(audit.metadata.authenticatedSenderPhone, sovereign.senderPhone)
   assert.equal((await sql`SELECT count(*)::int AS n FROM users`)[0].n, countBefore)
   assert.equal((await post(sovereign)).status, 403)
   assert.equal((await post({ ...sovereign, data: { targetPhone: owner.phone, patch: { phone: '5521999999930' } } }, process.env.SOFIA_RRD_CENTRAL_SECRET)).status, 409)
   assert.equal((await post(envelope, process.env.SOFIA_RRD_CENTRAL_SECRET)).status, 403)
   await sql`DELETE FROM users WHERE id=${owner.id}`
  })
  await t.test('audit failure rolls back profile and session revocation together', async () => {
   await sql`UPDATE users SET is_active=true WHERE id=${person.id}`
   await sql`INSERT INTO sessions(id,user_id,expires_at) VALUES ('rollback-session',${person.id},now()+interval '1 day')`
   await sql.unsafe(`ALTER TABLE audit_events ADD CONSTRAINT force_audit_failure CHECK (action <> 'person.managed_profile_updated') NOT VALID`)
   try {
    await assert.rejects(call(admin.phone, 'update_person_profile', { targetPhone: person.phone, patch: { isActive: false } }))
    assert.equal((await sql`SELECT is_active FROM users WHERE id=${person.id}`)[0].is_active, true)
    assert.equal((await sql`SELECT * FROM sessions WHERE user_id=${person.id}`).length, 1)
   } finally { await sql.unsafe('ALTER TABLE audit_events DROP CONSTRAINT force_audit_failure') }
  })
 } finally { await sql.end(); await conn?.end() }
})
