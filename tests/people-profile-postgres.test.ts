import test from 'node:test'
import assert from 'node:assert/strict'
import postgres from 'postgres'

// Explicit disposable database only. Never falls back to application env or .env files.
const url = process.env.RRD_PEOPLE_TEST_DATABASE_URL
if (url && !/^postgres:\/\/postgres@127\.0\.0\.1:\d+\/rrd_people_test$/.test(url)) throw new Error('Use only the isolated rrd_people_test database')
test('people/profile safety executes against isolated PostgreSQL', { skip: !url }, async () => {
 process.env.POSTGRES_RRD_URL = url!
 process.env.DATABASE_URL = url!
 const sql = postgres(url!, { max: 1 })
 const { db, conn } = await import('../src/db')
 const { assertNoProtectedPersonLinks, assertPersonRemovalSafe } = await import('../src/lib/people-safety')
 const { executeSofiaPersonProfile } = await import('../src/lib/sofia-person-profile')
 try {
  await sql.unsafe(`
   CREATE TABLE users (id uuid primary key default gen_random_uuid(), name text not null, phone text not null unique, email text, job_title text, photo_url text, company text, city text, state text, instagram_url text, website_url text, personal_notes text, password_hash text not null, role text not null, is_active boolean not null default true, last_login_at timestamp, created_at timestamp not null default now(), updated_at timestamp not null default now());
   CREATE TABLE user_permissions (id uuid primary key default gen_random_uuid(), user_id uuid not null references users(id) on delete cascade, permission_key text not null, granted_by_id uuid references users(id), created_at timestamp default now());
   CREATE TABLE audit_events (id uuid primary key default gen_random_uuid(), actor_user_id uuid references users(id), action text not null, target_type text not null, target_id uuid, metadata jsonb default '{}', created_at timestamp default now());
   CREATE TABLE sessions (id uuid primary key default gen_random_uuid(), user_id uuid references users(id) on delete cascade);
   CREATE TABLE teams (id uuid primary key default gen_random_uuid(), participants jsonb not null default '[]');
   CREATE TABLE protected_links (id uuid primary key default gen_random_uuid(), user_id uuid references users(id) on delete set null);
  `)
  const [admin] = await sql`INSERT INTO users (name,phone,password_hash,role) VALUES ('Synthetic admin','5521999999999','synthetic-hash-not-for-login','ADMIN') RETURNING id`
  const [person] = await sql`INSERT INTO users (name,phone,password_hash,role) VALUES ('Synthetic person','5521888888888','synthetic-hash-not-for-login','LEITURA') RETURNING id`
  await sql`INSERT INTO user_permissions (user_id,permission_key) VALUES (${admin.id},'people.manage'),(${person.id},'sofia.use')`
  await assert.rejects(db.transaction(tx => assertPersonRemovalSafe(tx, admin.id)), /último administrador/)
  await assert.rejects(db.transaction(tx => assertPersonRemovalSafe(tx, admin.id, { permissions: [] })), /último administrador/)
  await db.transaction(tx => assertNoProtectedPersonLinks(tx, person.id))
  await sql`INSERT INTO protected_links (user_id) VALUES (${person.id})`
  await assert.rejects(db.transaction(tx => assertNoProtectedPersonLinks(tx, person.id)), /vínculos protegidos/)
  const before = await executeSofiaPersonProfile('get_my_profile', {}, '+5521888888888')
  assert.equal(before.status, 200)
  assert.equal(JSON.stringify(before).includes('synthetic-hash'), false)
  const updated = await executeSofiaPersonProfile('update_my_profile', { name: 'Synthetic updated', jobTitle: 'Administrador de obras' }, '+5521888888888')
  assert.equal(updated.status, 200)
  const [persisted] = await sql`SELECT name,job_title,role FROM users WHERE id=${person.id}`
  assert.deepEqual(persisted, { name: 'Synthetic updated', job_title: 'Administrador de obras', role: 'LEITURA' })
  const [audit] = await sql`SELECT metadata FROM audit_events WHERE actor_user_id=${person.id}`
  assert.deepEqual(audit.metadata.fields, ['name', 'jobTitle'])
  await sql`DELETE FROM user_permissions WHERE user_id=${person.id}`
  const revoked = await executeSofiaPersonProfile('update_my_profile', { name: 'Must not save' }, '+5521888888888')
  // Grant was revoked before the request: preflight denies with 403. The 409
  // contract is reserved for revocation between preflight and the guarded write.
  assert.equal(revoked.status, 403)
  const [unchanged] = await sql`SELECT name FROM users WHERE id=${person.id}`
  assert.equal(unchanged.name, 'Synthetic updated')
 } finally { await sql.end(); await conn?.end() }
})
