import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), 'utf8')

test('Sofia portal review requires its own permission and document minimums without conversion side effects', () => {
  const route = read('src/app/api/sofia/drafts/[id]/confirm/route.ts')
  const page = read('src/app/portal/sofia-drafts/page.tsx')
  const contract = read('src/lib/sofia-actions.ts')
  assert.match(route, /requireLocalPermission\('sofia\.drafts\.review'\)/)
  const issuer = read('src/lib/sofia-issue-draft.ts')
  assert.match(route, /access\.permissions\.includes\('documents\.issue'\)/)
  assert.match(route, /actorUserId: authorized\.access\.id/)
  assert.match(route, /issuePortalDraftDocument/)
  assert.match(route, /body\.confirmation !== 'CONFIRMO'/)
  assert.match(issuer, /requiredDocumentDraftFields/)
  assert.match(issuer, /eq\(sofiaDrafts\.centralHubId, hubId!\)/)
  assert.match(issuer, /SOFIA_DRAFT_STATUS\.PENDING_REVIEW/)
  assert.doesNotMatch(route, /tx\.insert\(clients\)|tx\.insert\(clientAddresses\)|tx\.insert\(serviceRequests\)/)
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

test('official PDF is immutable and idempotent; attachment integrity does not prove delivery', () => {
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
  assert.match(delivery, /DOCUMENT_TRANSPORT_NOT_CONFIGURED/)
  assert.match(delivery, /status: 503/)
  assert.doesNotMatch(delivery, /sentAt:|DOC_STATUS\.ENVIADO|delivery_confirmed|success: true/)
  const issuer = read('src/lib/sofia-issue-draft.ts')
  assert.doesNotMatch(issuer, /status: 'SENT'|sentAt:/)
  assert.equal((issuer.match(/status: 'DRAFT'/g) || []).length, 4)
})
