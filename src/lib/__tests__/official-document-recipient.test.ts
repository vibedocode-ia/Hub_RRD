import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const read = (file: string) => readFileSync(file, 'utf8')
const migration = read('src/db/migrations/0022_official_documents_lead_recipient.sql')
const schema = read('src/db/schema.ts')
const journal = JSON.parse(read('src/db/migrations/meta/_journal.json')) as {
  entries: { idx: number; tag: string }[]
}

test('recipient lead OU cliente: migration 0022 é aditiva e não apaga linhas', () => {
  assert.match(migration, /ADD COLUMN IF NOT EXISTS "lead_id" uuid/)
  assert.match(migration, /ADD COLUMN IF NOT EXISTS "supersedes_document_id" uuid/)
  // service_request_id passa a ser OPCIONAL: apenas DROP NOT NULL, nada destrutivo.
  assert.match(migration, /ALTER COLUMN "service_request_id" DROP NOT NULL/)
  assert.match(migration, /ALTER COLUMN "client_id" DROP NOT NULL/)
  assert.doesNotMatch(migration, /DROP TABLE|DROP COLUMN|DELETE FROM|UPDATE "official_documents"/)
  assert.doesNotMatch(migration, /SET NOT NULL/)
})

test('XOR de destinatário é garantido por CHECK no banco', () => {
  assert.match(migration, /ADD CONSTRAINT "official_documents_lead_or_client_recipient_check"/)
  assert.match(migration, /CHECK \(\("lead_id" IS NULL\) <> \("client_id" IS NULL\)\)/)
  assert.match(schema, /check\('official_documents_lead_or_client_recipient_check'/)
  assert.match(schema, /\(\$\{table\.leadId\} is null\) <> \(\$\{table\.clientId\} is null\)/)
})

test('supersedes preserva o documento original (FK auto-referente, original congelado)', () => {
  assert.match(migration, /FOREIGN KEY \("supersedes_document_id"\) REFERENCES "official_documents"\("id"\) ON DELETE restrict ON UPDATE no action/)
  assert.match(schema, /supersedesDocumentId: uuid\('supersedes_document_id'\)\.references\(\(\): AnyPgColumn => officialDocuments\.id/)
  // Revisão nunca sobrescreve o original: o fluxo apenas aponta para frente.
  assert.doesNotMatch(migration, /UPDATE "official_documents" SET "supersedes_document_id"/)
})

test('lead_proposals espelha o link para o documento oficial', () => {
  assert.match(migration, /ALTER TABLE "lead_proposals" ADD COLUMN IF NOT EXISTS "official_document_id" uuid/)
  assert.match(schema, /officialDocumentId: uuid\('official_document_id'\)\.references\(\(\) => officialDocuments\.id/)
})

test('nenhuma tabela paralela de CRM e criada', () => {
  assert.doesNotMatch(migration, /CREATE TABLE/)
  assert.doesNotMatch(schema, /pgTable\('lead_official_documents'/)
})

test('journal registra a migration 0022 de forma sequencial', () => {
  const matching = journal.entries.filter(entry => entry.tag === '0022_official_documents_lead_recipient')
  assert.equal(matching.length, 1)
  assert.equal(matching[0].idx, 22)
  assert.deepEqual(
    journal.entries.map((entry) => entry.idx),
    Array.from({ length: journal.entries.length }, (_, index) => index),
  )
})
