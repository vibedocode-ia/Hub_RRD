import test from 'node:test'
import assert from 'node:assert/strict'
import { prepareOfficialPdfDownload } from '../official-pdf-download'
const pdf = () => new Response('%PDF-proof', { headers: { 'content-type': 'application/pdf' } })
const absent = () => Response.json({ code: 'PDF_NOT_GENERATED' }, { status: 404 })

test('read-only user downloads existing PDF via GET only, without issue permission', async () => {
  const methods: string[] = []
  const blob = await prepareOfficialPdfDownload('abc', async (_url, options) => { methods.push(String(options.method)); return pdf() })
  assert.equal(await blob.text(), '%PDF-proof')
  assert.deepEqual(methods, ['GET'])
})

test('generates only an explicitly missing PDF with issue permission, then downloads fixed endpoint', async () => {
  const calls: { url: string; options: RequestInit }[] = []
  const blob = await prepareOfficialPdfDownload('abc', async (url, options) => {
    calls.push({ url, options })
    if (calls.length === 1) return absent()
    return options.method === 'POST' ? Response.json({ storagePath: 'https://evil.invalid' }, { status: 201 }) : pdf()
  }, true)
  assert.equal(await blob.text(), '%PDF-proof')
  assert.deepEqual(calls.map(c => c.url), Array(3).fill('/api/documents/abc/pdf'))
  assert.deepEqual(calls.map(c => c.options.method), ['GET', 'POST', 'GET'])
  assert.ok(calls.every(c => c.options.credentials === 'same-origin' && c.options.cache === 'no-store' && !c.options.body))
})

test('missing PDF without issue permission and generic 404 never cause POST', async () => {
  for (const [response, canIssue] of [[absent(), false], [Response.json({ error: 'Documento não encontrado' }, { status: 404 }), true]] as const) {
    let calls = 0
    await assert.rejects(prepareOfficialPdfDownload('abc', async () => { calls++; return response }, canIssue))
    assert.equal(calls, 1)
  }
})

test('409 legacy conflict is explicit and never downloads/replaces attachment', async () => {
  let calls = 0
  await assert.rejects(prepareOfficialPdfDownload('abc', async () => { calls++; return Response.json({ error: 'PDF legado existente' }, { status: 409 }) }), /anexo legado.*não será substituído/i)
  assert.equal(calls, 1)
})

test('authorization, unavailable runtime, and non-PDF download fail honestly and allow a fresh retry', async () => {
  for (const status of [403, 503]) await assert.rejects(prepareOfficialPdfDownload('abc', async () => new Response('', { status })))
  await assert.rejects(prepareOfficialPdfDownload('abc', async () => new Response('<html>login</html>', { headers: { 'content-type': 'text/html' } })), /PDF inválido/)
  assert.equal(await (await prepareOfficialPdfDownload('abc', async () => pdf())).text(), '%PDF-proof')
})
