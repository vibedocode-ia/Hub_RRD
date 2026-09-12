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
  assert.match(route, /and\(eq\(documentTemplates\.docType, docType\), eq\(documentTemplates\.isActive, true\)\)/)
  assert.match(route, /templateId:\s*template\.id/)
  assert.match(route, /templateSourceSha256:\s*template\.sourceSha256/)
})
