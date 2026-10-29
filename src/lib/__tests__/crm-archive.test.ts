import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), 'utf8')

test('CRM delete endpoint still archives by default (preserves history)', () => {
  const route = read('src/app/api/crm/[id]/route.ts')
  assert.match(route, /const hard = truthy\(query\.get\('hard'\)\)/)
  assert.match(route, /db\.update\(clients\)\.set\(\{\s*isActive:\s*false/)
  assert.match(route, /success: true, archived: true/)
})

test('CRM hard delete is explicit and delegates the cascade to the purge helper', () => {
  const route = read('src/app/api/crm/[id]/route.ts')
  assert.match(route, /clientPurgeCounts/)
  assert.match(route, /clientPurgeHasHistory/)
  assert.match(route, /purgeClientRecords/)
  // A rota nunca apaga direto: a ordem das FKs vive em um único lugar.
  assert.doesNotMatch(route, /db\.delete\(/)
})

test('purge helper removes dependents in FK-safe order', () => {
  const purge = read('src/lib/client-purge.ts')
  const attachmentsBeforeDocuments = purge.indexOf('inArray(attachments.documentId, docIds)') < purge.indexOf('tx.delete(officialDocuments)')
  const requestsReleaseSofia = purge.indexOf('tx.update(sofiaDrafts)') < purge.indexOf('tx.delete(serviceRequests)')
  assert.ok(attachmentsBeforeDocuments, 'anexos devem sair antes dos documentos')
  assert.ok(requestsReleaseSofia, 'sofia_drafts/sofia_events devem soltar o chamado antes de apagá-lo')
  assert.match(purge, /supersedesDocumentId: null/)
  assert.match(purge, /tx\.delete\(clients\)/)
  assert.match(purge, /action: 'client\.purged'/)
})
