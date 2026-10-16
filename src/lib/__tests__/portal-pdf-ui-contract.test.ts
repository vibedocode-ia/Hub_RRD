import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
const root = 'src/app/portal/documentos/preview/[id]/'
test('preview wires document id into automatic download, preserves print, exposes responsive honest states', () => {
  const button = readFileSync(root + 'PrinterButton.tsx', 'utf8')
  const page = readFileSync(root + 'page.tsx', 'utf8')
  const readGuard = page.indexOf("await requireLocalPermission('documents.read')")
  assert.ok(readGuard >= 0 && readGuard < page.indexOf('const docs = await db'), 'documents.read must guard query')
  assert.match(page, /if \(!authorized\) return notFound\(\)/)
  assert.match(page, /<PrinterButton documentId=\{doc.id\} canIssue=\{canIssue\}/)
  assert.match(page, /const canIssue = Boolean\(await requireLocalPermission\('documents.issue'\)\)/)
  assert.match(button, /prepareOfficialPdfDownload\(documentId, undefined, canIssue\)/)
  assert.match(button, /disabled=\{busy\}/)
  assert.match(button, /role="alert"/)
  assert.match(button, /aria-live="polite"/)
  assert.match(button, /Tentar novamente/)
  assert.match(button, /não envia.*documento/i)
  assert.match(button, /contentWindow\?\.print\(\)/)
  assert.match(button, /flex-wrap/)
  assert.doesNotMatch(button, /\/delivery|sentAt|ENVIADO|whatsapp:\/\//)
})
