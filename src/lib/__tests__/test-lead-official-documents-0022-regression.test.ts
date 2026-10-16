import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import { eq, sql } from 'drizzle-orm'
import ts from 'typescript'
import * as lifecycle from '../test-lead-lifecycle'
import { leadAddresses, leads } from '../../db/schema'
import {
  TEST_LEAD_COUNTED_CHILD_TABLES,
  TEST_LEAD_DELETABLE_CHILD_TABLES,
  classifyTestLeadCatalogReferences,
  type TestLeadCatalogReference,
} from '../test-lead-lifecycle'

const officialReference: TestLeadCatalogReference = {
  parentTable: 'leads', childTable: 'official_documents', childColumn: 'lead_id',
  childColumnNotNull: false, columnCount: 1, onDelete: 'restrict',
}
const routeSource = () => readFileSync('src/app/api/internal/test-leads/[id]/route.ts', 'utf8')

// Evaluate the actual route expression, not a parallel implementation of its sum.
const routeDocumentCount = (counted: Map<string, number>): number => {
  const expression = routeSource().match(/const documentCount = ([^\n]+)/)?.[1]
  assert.ok(expression, 'route documentCount expression must exist')
  return new Function('counted', `return ${expression}`)(counted)
}

test('0022: route sums legacy and official documents, including official-only links', () => {
  assert.equal(routeDocumentCount(new Map([['leads:official_documents', 2]])), 2)
  assert.equal(routeDocumentCount(new Map([['leads:lead_documents', 3], ['leads:official_documents', 2]])), 5)
  assert.equal(routeDocumentCount(new Map()), 0)
})

test('0022: official_documents.lead_id is a counted blocker, never disposable', () => {
  assert.ok((TEST_LEAD_COUNTED_CHILD_TABLES as readonly string[]).includes('official_documents'))
  assert.deepEqual(classifyTestLeadCatalogReferences([officialReference]).unclassified, [])
  assert.deepEqual(TEST_LEAD_DELETABLE_CHILD_TABLES, ['lead_addresses'])
  const route = routeSource()
  assert.deepEqual([...route.matchAll(/\.delete\((\w+)\)/g)].map(match => match[1]), ['leadAddresses', 'leads'])
})

test('0022: malformed and unknown references remain fail-closed', () => {
  for (const patch of [
    { childTable: 'unrecognized_documents' }, { childColumn: 'other_lead_id' },
    { parentTable: 'other_parent' }, { columnCount: 2 }, { columnCount: 0 },
    { onDelete: 'unknown' as const },
  ]) {
    assert.equal(classifyTestLeadCatalogReferences([{ ...officialReference, ...patch }]).unclassifiedReferenceCount, 1)
  }
  assert.match(routeSource(), /relation.childSchema === 'public' && relation.parentColumn === 'id' \? relation.columnCount : 0/)
})

// Opt-in: uses only the named disposable container, never application .env.
// Executes the actual route transaction callback, not a duplicate purge algorithm.
// HTTP authentication/validation are outside this harness and are not mocked.
test('0022 PostgreSQL: real route transaction retains documents and fails closed', {
  skip: process.env.RRD_0022_PG_TEST !== '1', timeout: 120_000,
}, async (t) => {
  const container = JSON.parse(execFileSync('docker', ['inspect', 'rrd-tdd-pg'], { encoding: 'utf8' }))[0]
  assert.ok(container.NetworkSettings.Ports['5432/tcp'].some((b: { HostPort: string }) => b.HostPort === '55432'))
  const values = Object.fromEntries(container.Config.Env.map((entry: string) => {
    const i = entry.indexOf('='); return [entry.slice(0, i), entry.slice(i + 1)]
  }))
  const options = { host: '127.0.0.1', port: 55432, username: values.POSTGRES_USER || 'postgres',
    password: values.POSTGRES_PASSWORD, max: 1, onnotice: () => {} }
  const admin = postgres({ ...options, database: values.POSTGRES_DB || values.POSTGRES_USER || 'postgres' })
  const database = `rrd_0022_test_${randomUUID().replaceAll('-', '')}`
  let client: ReturnType<typeof postgres> | undefined
  try {
    await admin.unsafe(`create database "${database}"`)
    client = postgres({ ...options, database })
    const pg = client
    const journal = JSON.parse(readFileSync('src/db/migrations/meta/_journal.json', 'utf8'))
    for (const entry of journal.entries.filter((entry: { idx: number }) => entry.idx <= 22)) {
      await pg.unsafe(readFileSync(`src/db/migrations/${entry.tag}.sql`, 'utf8'))
    }
    t.diagnostic('Isolated rrd_*test* DB: migrations through 0022 applied on rrd-tdd-pg:55432')
    const db = drizzle(pg)
    const callback = routeSource().match(/async \(tx\): Promise<TestLeadPurgeOutcome> => \{([\s\S]*?)\n      \},\n    \)/)?.[1]
    assert.ok(callback, 'actual DELETE transaction callback must be extractable')
    const compiled = ts.transpileModule(`const run = async (tx) => {${callback}\n};`, {
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None },
    }).outputText
    const purge = async (id: string, testRunId: string) => {
      const bindings = { ...lifecycle, sql, eq, leads, leadAddresses, id, testRunId }
      const run = new Function('bindings', `const {${Object.keys(bindings).join(',')}} = bindings; ${compiled}; return run;`)(bindings)
      return db.transaction(run) as Promise<{ outcome: string; blockers: string[] }>
    }
    const createLead = async () => {
      const id = randomUUID(), run = randomUUID()
      await pg`insert into leads(id,name,phone,normalized_phone,test_run_id) values(${id},'SYNTHETIC','TEST:0022',${id},${run})`
      await pg`insert into lead_addresses(lead_id) values(${id})`
      return { id, run }
    }
    const catalog = await pg`select c.confdeltype, array_length(c.conkey,1) as columns,
      a.attname from pg_constraint c join pg_attribute a on a.attrelid=c.conrelid and a.attnum=c.conkey[1]
      where c.conrelid='public.official_documents'::regclass and c.confrelid='public.leads'::regclass`
    assert.deepEqual(catalog.map(row => ({ ...row })), [{ confdeltype: 'r', columns: 1, attname: 'lead_id' }])
    const empty = await createLead()
    assert.equal((await purge(empty.id, empty.run)).outcome, 'purged')
    assert.equal((await pg`select id from leads where id=${empty.id}`).length, 0)
    assert.equal((await pg`select id from lead_addresses where lead_id=${empty.id}`).length, 0)
    t.diagnostic('Zero documents: FK present, actual transaction purges lead/address')
    const linked = await createLead()
    await pg`insert into official_documents(lead_id,doc_type,doc_number,total_value,document_payload_snapshot)
      values(${linked.id},'ORCAMENTO',${randomUUID()},1,'{}'::jsonb)`
    const before = await pg`select row_to_json(d) as row from official_documents d order by id`
    const blocked = await purge(linked.id, linked.run)
    assert.equal(blocked.outcome, 'blocked')
    assert.ok(blocked.blockers.includes('documents-linked'))
    assert.ok(!blocked.blockers.includes('unclassified-references-linked'))
    assert.deepEqual(await pg`select row_to_json(d) as row from official_documents d order by id`, before)
    assert.equal((await pg`select id from leads where id=${linked.id}`).length, 1)
    assert.equal((await pg`select id from lead_addresses where lead_id=${linked.id}`).length, 1)
    t.diagnostic('Official-only link: documents-linked; document/lead/address unchanged')
    const unrelated = await createLead()
    assert.equal((await purge(unrelated.id, unrelated.run)).outcome, 'purged')
    assert.deepEqual(await pg`select row_to_json(d) as row from official_documents d order by id`, before)
    t.diagnostic('Document on another lead does not block an empty target')
    const guarded = await createLead()
    const assertGuarded = async () => {
      const result = await purge(guarded.id, guarded.run)
      assert.equal(result.outcome, 'blocked')
      assert.ok(result.blockers.includes('unclassified-references-linked'))
      assert.equal((await pg`select id from leads where id=${guarded.id}`).length, 1)
      assert.equal((await pg`select id from lead_addresses where lead_id=${guarded.id}`).length, 1)
    }
    await pg`create table unknown_dependency(lead_id uuid references leads(id) on delete cascade)`
    await assertGuarded()
    await pg`drop table unknown_dependency`
    await pg`create schema wrong_schema`
    await pg`create table wrong_schema.official_documents(lead_id uuid references public.leads(id))`
    await assertGuarded()
    await pg`drop schema wrong_schema cascade`
    await pg`alter table official_documents add column wrong_lead_id uuid references leads(id)`
    await assertGuarded()
    await pg`alter table official_documents drop column wrong_lead_id`
    await pg`alter table leads add constraint regression_composite_target unique(id,test_run_id)`
    await pg`alter table official_documents add column test_run_id uuid`
    await pg`alter table official_documents add constraint regression_composite_fk foreign key(lead_id,test_run_id) references leads(id,test_run_id)`
    await assertGuarded()
    await pg`alter table official_documents drop constraint regression_composite_fk`
    await pg`alter table leads add constraint regression_wrong_parent_target unique(test_run_id)`
    await pg`alter table official_documents add column other_id uuid references leads(test_run_id)`
    await assertGuarded()
    await pg`alter table official_documents drop column other_id`
    assert.equal((await purge(guarded.id, guarded.run)).outcome, 'purged')
    // Added nullable test-only column changes the row shape, not document data.
    await pg`alter table official_documents drop column test_run_id`
    assert.deepEqual(await pg`select row_to_json(d) as row from official_documents d order by id`, before)
    t.diagnostic('Empty unknown/composite/wrong-schema/wrong-child/wrong-parent-column FKs fail-closed; documents retained')
  } finally {
    if (client) await client.end()
    await admin.unsafe(`drop database if exists "${database}" with (force)`)
    assert.equal((await admin`select datname from pg_database where datname=${database}`).length, 0)
    await admin.end()
  }
})
