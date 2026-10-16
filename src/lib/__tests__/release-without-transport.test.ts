import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { build } from 'esbuild'

const deliveryPath = 'src/app/api/documents/[id]/delivery/route.ts'
test('release retains 0022 recipient migration but excludes WhatsApp schema/journal/UI', () => {
  const schema = readFileSync('src/db/schema.ts', 'utf8')
  assert.match(schema, /official_documents_lead_or_client_recipient_check/)
  assert.doesNotMatch(schema, /rrdWaControl|rrdWaRpcNonces|rrd_wa_/)
  const journal = JSON.parse(readFileSync('src/db/migrations/meta/_journal.json', 'utf8'))
  assert.ok(journal.entries.some((entry: { tag: string }) => entry.tag.startsWith('0022_')))
  assert.ok(!journal.entries.some((entry: { tag: string }) => entry.tag.startsWith('0023_')))
  const button = readFileSync('src/app/portal/documentos/preview/[id]/PrinterButton.tsx', 'utf8')
  assert.doesNotMatch(button, /RrWhatsAppDelivery/)
  assert.match(button, /prepareOfficialPdfDownload/)
  assert.match(button, /contentWindow\?\.print/)
})
test('delivery is fail-closed even when transport flag is enabled, with no write dependencies', async () => {
  const source = readFileSync(deliveryPath, 'utf8')
  assert.doesNotMatch(source, /rr-whatsapp|@\/db|\/delivery|export.*HEAD/)
  for (const permitted of [false, true]) {
    const result = await build({ entryPoints: [deliveryPath], bundle: true, platform: 'node', format: 'cjs', write: false,
      plugins: [{ name: 'permission-only', setup(b) {
        b.onResolve({ filter: /^@\/lib\/require-local-permission$/ }, () => ({ path: 'permission', namespace: 'isolated' }))
        b.onLoad({ filter: /.*/, namespace: 'isolated' }, () => ({ contents: `export async function requireLocalPermission(key) { if (key !== 'documents.send') throw Error('wrong permission'); return ${permitted}; }` }))
        b.onResolve({ filter: /^next\/server$/ }, () => ({ path: 'next', namespace: 'next-mock' }))
        b.onLoad({ filter: /.*/, namespace: 'next-mock' }, () => ({ contents: 'export const NextResponse = { json: (body, init) => Response.json(body, init) }' }))
      }}] })
    const mod = { exports: {} as { POST?: Function; GET?: Function } }
    new Function('module', 'exports', result.outputFiles[0].text)(mod, mod.exports)
    const old = process.env.RRD_WHATSAPP_ENABLED
    try {
      process.env.RRD_WHATSAPP_ENABLED = '1'
      for (const method of ['POST', 'GET'] as const) {
        assert.equal(typeof mod.exports[method], 'function')
        const response = await mod.exports[method]!(new Request('http://localhost/delivery', { method }), { params: Promise.resolve({ id: 'irrelevant' }) })
        assert.equal(response.status, permitted ? 503 : 403)
        const body = await response.json()
        if (permitted) assert.equal(body.code, 'DOCUMENT_TRANSPORT_NOT_CONFIGURED')
        assert.equal(body.success, undefined)
      }
    } finally { if (old === undefined) delete process.env.RRD_WHATSAPP_ENABLED; else process.env.RRD_WHATSAPP_ENABLED = old }
  }
})
