import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const source = (path: string) => readFileSync(`src/app/${path}`, 'utf8')
const item = source('api/documents/[id]/route.ts')
const attachment = source('api/documents/[id]/attachment/route.ts')
const delivery = source('api/documents/[id]/delivery/route.ts')
const portal = source('portal/documentos/page.tsx')
const actions = source('api/sofia/actions/route.ts')
const lifecycle = readFileSync('src/lib/official-document-lifecycle.ts', 'utf8')
const list = actions.slice(actions.indexOf("if (action === 'list_documents')"), actions.indexOf('const replay =', actions.indexOf("if (action === 'list_documents')")))

test('requestless documents can be archived without allowing archived linked requests', () => {
  assert.match(item, /eligibleRequest/)
  assert.match(lifecycle, /serviceRequests\.archivedAt/)
  assert.match(lifecycle, /\.update\(officialDocuments\)/)
  assert.doesNotMatch(item, /\.delete\(officialDocuments\)/)
})

test('requestless documents accept immutable PDF while linked archived requests remain blocked', () => {
  assert.match(attachment, /isNull\(officialDocuments\.serviceRequestId\)/)
  assert.match(attachment, /serviceRequests\.archivedAt/)
  assert.match(attachment, /file\.type !== 'application\/pdf'/)
  assert.match(attachment, /metadata\?\.sha256 === sha256/)
  assert.match(attachment, /serviceRequestId: document\.serviceRequestId/)
})

test('all delivery fails closed without transport, including requestless and archived documents', () => {
  assert.match(delivery, /requireLocalPermission\('documents.send'\)/)
  assert.match(delivery, /DOCUMENT_TRANSPORT_NOT_CONFIGURED/)
  assert.match(delivery, /status: 503/)
  assert.doesNotMatch(delivery, /\.update\(|\.insert\(|sentAt:|DOC_STATUS\.ENVIADO/)
})

test('portal lists typed recipient name for both lead and client without phone leakage', () => {
  assert.match(portal, /leftJoin\(clients/)
  assert.match(portal, /leftJoin\(leads/)
  assert.match(portal, /recipientType/)
  assert.match(portal, /recipientName/)
  assert.doesNotMatch(portal, /clients\.phone|leads\.phone|clientPhone/)
})

test('Sofia list_documents returns typed names for either recipient without private contact fields', () => {
  assert.match(list, /leftJoin\(clients/)
  assert.match(list, /leftJoin\(leads/)
  assert.match(list, /recipientType/)
  assert.match(list, /recipientName/)
  assert.match(list, /leadId: officialDocuments\.leadId/)
  assert.doesNotMatch(list, /\.phone|\.email|\.document\b/)
})
