import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), 'utf8')

test('document delete still archives by default', () => {
  const route = read('src/app/api/documents/[id]/route.ts')
  assert.match(route, /const hard = truthy\(query\.get\('hard'\)\)/)
  assert.match(route, /archiveOfficialDocument\(id, authorized\.access\.id/)
  assert.match(route, /success: true, archived: true/)
})

test('document hard delete is explicit and delegates to the purge helper', () => {
  const route = read('src/app/api/documents/[id]/route.ts')
  assert.match(route, /documentPurgeCounts/)
  assert.match(route, /purgeDocumentRecord/)
  assert.doesNotMatch(route, /db\.delete\(/)
})

test('document purge removes attachments before the snapshot and clears supersession', () => {
  const purge = read('src/lib/document-purge.ts')
  const attachmentsFirst = purge.indexOf('tx.delete(attachments)') < purge.indexOf('tx.delete(officialDocuments)')
  assert.ok(attachmentsFirst, 'anexos devem sair antes do documento')
  assert.match(purge, /supersedesDocumentId: null/)
  assert.match(purge, /action: 'document\.purged'/)
})
