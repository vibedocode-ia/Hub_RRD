import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const IGNORED_DIRS = new Set(['node_modules', '.next', '.git', '.guided-ui-build', '.guided-ui-build-api']);
const connectionString = process.env.POSTGRES_RRD_URL || process.env.DATABASE_URL || '';
const guidedDatabaseUrl = connectionString || process.env.RRD_GUIDED_TEST_DATABASE_URL || '';
const allowDbLess = process.env.RRD_ISSUER_DISPOSABLE_DB === '1' && !guidedDatabaseUrl;

if (guidedDatabaseUrl) {
  const parsed = new URL(guidedDatabaseUrl)
  if (!/^rrd_[a-z0-9_]*test(?:_[a-z0-9_]+)?$/i.test(parsed.pathname.replace(/^\//, '')) || !['127.0.0.1', 'localhost'].includes(parsed.hostname) || process.env.RRD_ISSUER_DISPOSABLE_DB !== '1') {
    throw new Error('test:security permite banco apenas com RRD_ISSUER_DISPOSABLE_DB=1, host local e nome rrd_*test*')
  }
  process.env.RRD_GUIDED_TEST_DATABASE_URL = guidedDatabaseUrl
}

const files = [];
function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory() && (IGNORED_DIRS.has(entry.name) || entry.name === 'node_modules')) continue;
    const p = join(dir, entry.name);
    if (entry.isDirectory()) walk(p);
    else if (/\.test\.(?:ts|tsx|js|mjs|cjs)$/.test(entry.name)) files.push(p);
  }
}
for (const dir of ['src', 'scripts']) walk(dir);
if (!files.length) throw new Error('No regression tests found');
const result = spawnSync(process.execPath, ['--import', 'tsx', '--test', ...files.sort()], { stdio: 'inherit', env: { ...process.env, RRD_GUIDED_TEST_DATABASE_URL: guidedDatabaseUrl, RRD_ALLOW_DBLESS_SECURITY: allowDbLess ? '1' : '0' } });
process.exit(result.status ?? 1);
