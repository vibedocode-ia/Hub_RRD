import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const source = (path: string) => readFileSync(path, 'utf8')
const api = () => source('src/app/api/leads/[id]/route.ts')
const page = () => source('src/app/portal/leads/[id]/page.tsx')
const detail = () => source('src/app/portal/leads/[id]/LeadDetailClient.tsx')

test('lead detail API selects official documents by leadId and returns only a safe summary', () => {
  assert.match(api(), /from\(officialDocuments\)\.where\(eq\(officialDocuments\.leadId, id\)\)/)
  assert.match(api(), /officialDocuments:\s*officialDocs/)
  assert.doesNotMatch(api(), /db\.select\(\)\.from\(officialDocuments\)/)
})

test('lead portal fetches issued official documents by leadId and sends them to detail', () => {
  assert.match(page(), /from\(officialDocuments\)\.where\(eq\(officialDocuments\.leadId, id\)\)/)
  assert.match(page(), /officialDocuments=\{JSON\.parse\(JSON\.stringify\(officialDocs\.map/);
  assert.doesNotMatch(page(), /db\.select\(\)\.from\(officialDocuments\)/)
})

test('lead detail displays preview link without creating an approval or conversion action for documents', () => {
  assert.match(detail(), /officialDocuments\.map\(/)
  assert.match(detail(), /href=\{doc\.previewUrl\}/)
  assert.match(detail(), /Documentos oficiais do Lead/)
})

test('normal lead deletion refuses retained official documents before any deletion', () => {
  const code = api()
  const guard = code.indexOf('officialDocuments.leadId, id)', code.indexOf('export async function DELETE'))
  const deletion = code.indexOf('db.transaction(', code.indexOf('export async function DELETE'))
  assert.ok(guard > 0 && guard < deletion, 'official document guard must run before deletes')
  assert.match(code.slice(guard, deletion), /status: 409/)
  assert.match(code.slice(guard, deletion), /documento oficial/i)
})
