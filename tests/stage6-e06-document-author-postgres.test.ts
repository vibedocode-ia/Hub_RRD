import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import postgres from 'postgres'
const url = process.env.RRD_AUTHOR_TEST_DATABASE_URL
if (!url || !/^postgres:\/\/postgres@127\.0\.0\.1:\d+\/rrd_author_test$/.test(url)) throw new Error('Disposable database required')
test('prepared authorship migration preserves legacy and separates sovereign identity', async () => {
 const sql = postgres(url, { max: 1 })
 try {
  await sql.unsafe(`CREATE TABLE sofia_drafts(id uuid primary key default gen_random_uuid(),central_contact_id uuid NOT NULL,central_client_id uuid NOT NULL,central_hub_id uuid NOT NULL,central_role text NOT NULL,sender_phone text NOT NULL);
  CREATE TABLE official_documents(id uuid primary key); CREATE TABLE proposals(id uuid primary key); CREATE TABLE lead_proposals(id uuid primary key);`)
  const [legacy] = await sql`INSERT INTO sofia_drafts(central_contact_id,central_client_id,central_hub_id,central_role,sender_phone) VALUES (gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),'hub_owner','+5521999999901') RETURNING *`
  await sql.unsafe(await readFile(new URL('../docs/migrations/stage6-e06-central-document-authorship.sql', import.meta.url), 'utf8'))
  const [after] = await sql`SELECT * FROM sofia_drafts WHERE id=${legacy.id}`
  for (const [key,value] of Object.entries(legacy)) assert.equal(after[key],value)
  assert.equal(after.author_kind,'legacy'); assert.equal(after.central_grant_id,null)
  const [author] = await sql`INSERT INTO sofia_drafts(author_kind,central_grant_id,central_hub_id,central_role,sender_phone) VALUES ('central_sovereign',gen_random_uuid(),gen_random_uuid(),'god_admin','+5521999999902') RETURNING *`
  assert.equal(author.central_contact_id,null); assert.equal(author.central_client_id,null)
  await assert.rejects(sql`INSERT INTO sofia_drafts(author_kind,central_grant_id,central_hub_id,central_role,sender_phone) VALUES ('central_sovereign',gen_random_uuid(),gen_random_uuid(),'hub_owner','+5521999999902')`, /sofia_drafts_author_check/)
  await assert.rejects(sql`INSERT INTO sofia_drafts(central_hub_id,central_role,sender_phone) VALUES (gen_random_uuid(),'hub_owner','+5521999999902')`, /sofia_drafts_author_check/)
  process.env.POSTGRES_RRD_URL=url; process.env.DATABASE_URL=url
  const {drizzle} = await import('drizzle-orm/postgres-js')
  const {sofiaDrafts} = await import('../src/db/schema')
  const {draftOwnership} = await import('../src/lib/sofia-document-author')
  const db=drizzle(sql)
  const identity={senderPhone:author.sender_phone,centralHubId:author.central_hub_id,centralRole:'god_admin',centralGrantId:author.central_grant_id}
  const read = (input: typeof identity) => db.select({id:sofiaDrafts.id}).from(sofiaDrafts).where(draftOwnership(input))
  assert.equal((await read(identity)).length,1)
  assert.equal((await read({...identity,centralGrantId:legacy.central_contact_id})).length,0)
  assert.equal((await read({...identity,centralHubId:legacy.central_hub_id})).length,0)
  assert.equal((await read({...identity,centralGrantId:undefined as unknown as string})).length,0)
 } finally { await sql.end() }
})
