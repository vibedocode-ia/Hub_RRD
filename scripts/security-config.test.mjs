import test from 'node:test';
import assert from 'node:assert/strict';
import config from '../next.config.mjs';
test('production responses enforce basic browser protections', async () => {
  assert.equal(typeof config.headers, 'function');
  const rules = await config.headers();
  const headers = Object.fromEntries(rules.find(x => x.source === '/:path*').headers.map(h=>[h.key.toLowerCase(),h.value]));
  assert.equal(headers['x-content-type-options'], 'nosniff');
  assert.equal(headers['x-frame-options'], 'SAMEORIGIN');
  assert.match(headers['content-security-policy'], /frame-ancestors 'self'/);
  assert.match(headers['strict-transport-security'], /max-age=31536000/);
  assert.equal(config.poweredByHeader, false);
});
test('build cannot bypass TypeScript errors', () => assert.notEqual(config.typescript?.ignoreBuildErrors, true));
