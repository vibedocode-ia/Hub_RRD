const postgres = require('postgres');
const url = process.env.POSTGRES_RRD_URL || process.env.DATABASE_URL;
if (!url) throw new Error('POSTGRES_RRD_URL or DATABASE_URL is required');
const sql = postgres(url, { max: 1 });
const migrations = [
  { hash: 'ab2f732196ca9534975e1c1ba1f6f7ac675fffd488e29bcb60ac8f1f06e6cdb0', createdAt: 1789076207771, table: 'service_catalog' },
  { hash: '323d72b66ea9f16c7be24c80ae78a803b887275531ad95afa641b6e6d0d9dfd8', createdAt: 1789082273898, table: 'sofia_drafts' },
];
(async () => {
  try {
    await sql`CREATE SCHEMA IF NOT EXISTS drizzle`;
    await sql`CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (id SERIAL PRIMARY KEY, hash text NOT NULL, created_at bigint)`;
    for (const migration of migrations) {
      const exists = await sql`SELECT to_regclass(${`public.${migration.table}`}) IS NOT NULL AS present`;
      if (exists[0].present) {
        await sql`INSERT INTO drizzle.__drizzle_migrations (hash, created_at) SELECT ${migration.hash}, ${migration.createdAt} WHERE NOT EXISTS (SELECT 1 FROM drizzle.__drizzle_migrations WHERE hash = ${migration.hash})`;
      }
    }
    console.log('drizzle history reconciliation complete');
  } finally { await sql.end({ timeout: 5 }); }
})().catch(error => { console.error(error.message); process.exit(1); });
