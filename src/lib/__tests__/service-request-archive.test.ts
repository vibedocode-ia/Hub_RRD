import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'

const read = (file: string) => readFileSync(path.join(process.cwd(), file), 'utf8')

test('service request deletion is a non-destructive archive that preserves documents and attachments', () => {
  const schema = read('src/db/schema.ts')
  const migration = read('src/db/migrations/0018_service_request_archive.sql')
  const route = read('src/app/api/chamados/[id]/route.ts')

  assert.match(schema, /archivedAt: timestamp\('archived_at'\)/)
  assert.match(migration, /ADD COLUMN IF NOT EXISTS "archived_at"/)
  assert.match(route, /and\(eq\(serviceRequests\.id, id\), isNull\(serviceRequests\.archivedAt\)\)/)
  assert.match(route, /metadata: \{ previousStatus: existing\.status \}/)
  assert.match(route, /already_archived/)
  assert.doesNotMatch(route, /status: 'CANCELADO'|cancelReason: 'Arquivado administrativamente/)
  assert.doesNotMatch(route, /db\.delete\(officialDocuments\)|db\.delete\(attachments\)|db\.delete\(serviceRequests\)|db\.delete\(sofiaEvents\)/)
})
