import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), 'utf8')

test('Sofia draft review requires its own permission and a complete document identity before conversion', () => {
  const route = read('src/app/api/sofia/drafts/[id]/confirm/route.ts')
  const page = read('src/app/portal/sofia-drafts/page.tsx')
  const contract = read('src/lib/sofia-actions.ts')
  assert.match(route, /requireLocalPermission\('sofia\.drafts\.review'\)/)
  assert.match(route, /customerDocument/)
  assert.match(route, /sofiaDrafts/)
  assert.match(route, /serviceRequestId/)
  assert.match(route, /SOFIA_DRAFT_STATUS\.CONVERTED/)
  assert.match(route, /auditEvents/)
  assert.match(page, /requireLocalPermission\('sofia\.drafts\.review'\)/)
  assert.match(page, /from\(sofiaDrafts\)/)
  assert.match(contract, /customerDocument/)
  assert.match(contract, /CPF ou CNPJ/)
})

test('legacy document PATCH cannot bypass the protected delivery endpoint', () => {
  const legacy = read('src/app/api/documents/[id]/route.ts')
  assert.match(legacy, /Documento oficial é imutável/)
  assert.doesNotMatch(legacy, /status: body\.status/)
  assert.doesNotMatch(legacy, /sentAt:/)
})

test('official PDF is immutable, idempotent by hash, and is the only attachment that can unlock delivery', () => {
  const attachment = read('src/app/api/documents/[id]/attachment/route.ts')
  const delivery = read('src/app/api/documents/[id]/delivery/route.ts')
  const migration = read('src/db/migrations/0019_official_document_pdf_immutable.sql')
  assert.match(attachment, /DOC_STATUS\.EMITIDO/)
  assert.match(attachment, /OFFICIAL_DOCUMENT_PDF/)
  assert.match(attachment, /alreadyAttached/)
  assert.match(attachment, /sha256 === sha256/)
  assert.match(attachment, /%PDF-/)
  assert.match(attachment, /documents\.read/)
  assert.match(migration, /CREATE UNIQUE INDEX/)
  assert.match(migration, /OFFICIAL_DOCUMENT_PDF/)
  assert.match(delivery, /OFFICIAL_DOCUMENT_PDF/)
  assert.match(delivery, /mimeType, 'application\/pdf'/)
  assert.match(delivery, /createHash\('sha256'\)/)
  assert.match(delivery, /pdfStoragePath/)
  assert.match(delivery, /status: DOC_STATUS\.ENVIADO/)
  assert.match(delivery, /auditEvents/)
})
