import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
const files = [];
function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) walk(p);
    else if (/\.test\.(?:ts|tsx|js|mjs|cjs)$/.test(entry.name)) files.push(p);
  }
}
for (const dir of ['src', 'scripts']) walk(dir);
if (!files.length) throw new Error('No regression tests found');
const result = spawnSync(process.execPath, ['--import', 'tsx', '--test', ...files.sort()], { stdio: 'inherit', env: process.env });
process.exit(result.status ?? 1);
