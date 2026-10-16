import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (path: string) => readFileSync(path, 'utf8')
const confirm = 'src/app/api/sofia/drafts/[id]/confirm/route.ts'
const emit = 'src/app/api/documents/emit/route.ts'

test('legacy draft confirmation cannot fabricate CRM or claim issuance without a document', () => {
  const route = read(confirm)
  for (const table of ['clients', 'clientAddresses', 'serviceRequests', 'officialDocuments']) assert.doesNotMatch(route, new RegExp(`\\.insert\\(${table}\\)`))
  assert.doesNotMatch(route, /totalAmount: ['"]0\.00['"]|SOF-\$\{|status: SOFIA_DRAFT_STATUS\.CONVERTED/)
  assert.match(route, /issuePortalDraftDocument/)
  assert.match(route, /actorUserId: authorized\.access\.id/)
  assert.match(route, /if \(!issued\.ok\) return NextResponse\.json/)
  assert.match(route, /documentId: issued\.result\.documentId/)
  assert.match(route, /previewUrl:/)
  assert.match(route, /status: issued\.alreadyProcessed \? 200 : 201/)
})

test('legacy emit cannot force address or payment on document-only issues and retains registered PDF rendering', () => {
  const route = read(emit)
  assert.doesNotMatch(route, /if \(!cli\.document \|\| !addr\)/)
  assert.doesNotMatch(route, /if \(!resolvedPayment\)/)
  assert.doesNotMatch(route, /new Date\(\).*toLocaleDateString\('pt-BR'\)/)
  assert.match(route, /selectSofiaDocumentTemplate\(docType/)
  assert.match(route, /nenhum documento foi emitido/)
})

test('draft portal never promises fabricated service request or payment prerequisite', () => {
  const button = read('src/app/portal/sofia-drafts/ConfirmDraftButton.tsx')
  assert.doesNotMatch(button, /criar o chamado para emissão|Agora preencha valor e forma de pagamento para emitir/)
  assert.match(button, /Confirmar e emitir documento/)
  assert.match(button, /Não cria cadastro ou chamado e não envia PDF/)
  assert.match(button, /reviewVersion/)
  assert.match(button, /if \(!res\.ok\) throw new Error/)
})
