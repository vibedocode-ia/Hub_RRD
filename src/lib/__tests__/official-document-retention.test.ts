import { archiveOfficialDocument } from '@/lib/official-document-lifecycle'
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), 'utf8')
const lifecycle = read('src/lib/official-document-lifecycle.ts')

test('official-document archive implementation reuses transactional shared lifecycle', () => {
  assert.match(lifecycle, /db\.transaction/)
  assert.match(lifecycle, /for\('update'\)/)
  assert.match(lifecycle, /status: DOC_STATUS\.ARQUIVADO/)
  assert.match(lifecycle, /document\.archived/)
  assert.match(lifecycle, /actorUserId/)
})

test('archive endpoint delegates recipient-bound documents to the shared lifecycle', () => {
  const route = read('src/app/api/documents/[id]/route.ts')
  assert.match(route, /archiveOfficialDocument/)
  assert.doesNotMatch(route.slice(route.indexOf('export async function DELETE')), /db\.update\(officialDocuments\)/)
})

test('official document removal archives the record and preserves attachments', () => {
  const route = read('src/app/api/documents/[id]/route.ts')
  assert.doesNotMatch(route, /db\.update\(officialDocuments\)/)
  assert.match(lifecycle, /status: DOC_STATUS\.ARQUIVADO/)
  assert.doesNotMatch(route, /db\.delete\(officialDocuments\)|db\.delete\(attachments\)/)
})

test('document issuance uses active registered template through transactional issuer; legacy route does not claim emission', () => {
  const legacy = read('src/app/api/documents/emit/route.ts')
  const issuer = read('src/lib/sofia-issue-draft.ts')
  const selector = read('src/lib/sofia-document-template.ts')
  assert.match(legacy, /nenhum documento foi emitido/)
  assert.doesNotMatch(legacy, /db\.insert\(officialDocuments\)/)
  assert.match(selector, /eq\(documentTemplates\.docType, docType\)/)
  assert.match(selector, /eq\(documentTemplates\.isActive, true\)/)
  assert.match(issuer, /selectSofiaDocumentTemplate\(docType as DocType/)
  assert.match(issuer, /templateId: selected\.id/)
  assert.match(issuer, /templateSourceSha256: selected\.sourceSha256/)
})
