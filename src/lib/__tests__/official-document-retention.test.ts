import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), 'utf8')

test('official document removal archives the record and preserves attachments', () => {
  const route = read('src/app/api/documents/[id]/route.ts')
  assert.match(route, /db\.update\(officialDocuments\)\.set\(\{[\s\S]*?status:\s*['"]ARQUIVADO['"]/)
  assert.doesNotMatch(route, /db\.delete\(officialDocuments\)|db\.delete\(attachments\)/)
})

test('document issuance resolves only an active canonical template and snapshots its provenance', () => {
  const route = read('src/app/api/documents/emit/route.ts')
  assert.match(route, /selectSofiaDocumentTemplate\(docType\)/)
  const selector = read('src/lib/sofia-document-template.ts')
  assert.match(selector, /eq\(documentTemplates\.docType, docType\)/)
  assert.match(selector, /eq\(documentTemplates\.isActive, true\)/)
  assert.match(route, /templateId:\s*template\.id/)
  assert.match(route, /templateSourceSha256:\s*template\.sourceSha256/)
})
