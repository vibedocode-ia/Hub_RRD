// Real React UI + sandboxed Chromium; HTTP PDF endpoint responses are controlled fixtures.
import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { chromium } from 'playwright-core'
import { resolve } from 'node:path'
const result = await build({
  stdin: { contents: `import React from 'react'; import {createRoot} from 'react-dom/client'; import {PrinterButton} from './src/app/portal/documentos/preview/[id]/PrinterButton'; createRoot(document.getElementById('root')).render(<PrinterButton documentId="proof-id" canIssue={window.location.search === "?issue=1"}/>);`, resolveDir: process.cwd(), loader: 'tsx' },
  bundle: true, write: false, platform: 'browser', format: 'iife', jsx: 'automatic',
  plugins: [{ name: 'next-link-only', setup(b) { b.onResolve({ filter: /^next\/link$/ }, () => ({ path: 'link', namespace: 'fixture' })); b.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({ contents: `import React from 'react'; export default function Link(p){return React.createElement('a',p,p.children)}`, resolveDir: process.cwd() })) } }],
})
assert.notEqual(process.getuid?.(), 0)
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE_PATH || '/usr/bin/chromium', chromiumSandbox: true })
try {
  const page = await browser.newPage({ acceptDownloads: true, viewport: { width: 375, height: 812 } })
  const errors = []; page.on('pageerror', e => errors.push(e.message))
  let mode = 'conflict', pending, calls = []
  await page.route('http://rrd-ui.test/**', async route => {
    const request = route.request()
    if (request.url().endsWith('/api/documents/proof-id/pdf')) {
      calls.push(request.method())
      if (mode === 'conflict') return route.fulfill({ status: 409, contentType: 'application/json', body: '{}' })
      if (mode === 'unavailable') return route.fulfill({ status: 503, contentType: 'application/json', body: '{}' })
      if (mode === 'missing-readonly' || (mode === 'success' && calls.length === 1)) return route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ code: 'PDF_NOT_GENERATED' }) })
      if (request.method() === 'POST') { await new Promise(resolve => { pending = resolve }); return route.fulfill({ status: 201, contentType: 'application/json', body: '{}' }) }
      return route.fulfill({ status: 200, contentType: 'application/pdf', body: '%PDF-ui-download-proof' })
    }
    await route.fulfill({ contentType: 'text/html', body: '<div id="root"></div><iframe id="rrd-document-frame"></iframe>' })
  })
  await page.goto('http://rrd-ui.test/?issue=1')
  await page.addScriptTag({ content: result.outputFiles[0].text })
  await page.getByRole('button', { name: 'Gerar / baixar PDF oficial' }).click()
  await page.getByRole('alert').filter({ hasText: /anexo legado.*não será substituído/ }).waitFor()
  assert.deepEqual(calls, ['GET'])
  mode = 'unavailable'
  await page.getByRole('button', { name: 'Tentar novamente' }).click()
  await page.getByRole('alert').filter({ hasText: /Não foi possível/ }).waitFor()
  mode = 'success'; calls = []
  const generationRequest = page.waitForRequest(r => r.method() === 'POST')
  await page.getByRole('button', { name: 'Tentar novamente' }).click()
  await page.waitForFunction(() => document.querySelector('button[aria-busy="true"]')?.disabled)
  await page.getByRole('button', { name: 'Preparando PDF…' }).evaluate(b => { b.click(); b.click() })
  await generationRequest
  assert.deepEqual(calls, ['GET', 'POST'])
  const downloadPromise = page.waitForEvent('download'); pending()
  const download = await downloadPromise
  assert.equal(download.suggestedFilename(), 'documento-proof-id.pdf')
  await page.getByText('Download solicitado.', { exact: false }).waitFor()
  assert.deepEqual(calls, ['GET', 'POST', 'GET'])
  const generatedCalls = [...calls]
  assert.equal(await page.getByRole('alert').count(), 0)
  assert.match(await page.locator('[aria-live]').innerText(), /não envia o documento/)
  await page.evaluate(() => { const frame = document.querySelector('iframe'); window.printProof = 0; frame.contentWindow.print = () => { window.printProof++ } })
  await page.getByRole('button', { name: 'Imprimir / Salvar PDF' }).click()
  assert.equal(await page.evaluate(() => window.printProof), 1)
  mode = 'readonly'; calls = []
  await page.goto('http://rrd-ui.test/')
  await page.addScriptTag({ content: result.outputFiles[0].text })
  const readDownload = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Gerar / baixar PDF oficial' }).click()
  await readDownload
  await page.getByText('Download solicitado.', { exact: false }).waitFor()
  assert.deepEqual(calls, ['GET'], 'read-only existing PDF never calls issue')
  mode = 'missing-readonly'; calls = []
  await page.getByRole('button', { name: 'Gerar / baixar PDF oficial' }).click()
  await page.getByRole('alert').filter({ hasText: /permissão de emissão/ }).waitFor()
  assert.deepEqual(calls, ['GET'], 'read-only missing PDF never attempts generation')
  assert.deepEqual(errors, [])
  console.log(JSON.stringify({ uiReactReal: true, chromiumSandbox: true, uid: process.getuid(), viewport: 375, conflict409: true, retry503: true, singlePendingRequest: true, getPostGet: generatedCalls, readOnlyGetOnly: true, downloadFilename: download.suggestedFilename(), honestNoSend: true, optionalPrint: true, pageErrors: errors }))
} finally { await browser.close() }
