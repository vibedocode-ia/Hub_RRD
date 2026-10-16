import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), 'utf8')

test('Sofia draft route delegates normalization, required minimums and optional-omission consent to the Hub contract', () => {
  const route = read('src/app/api/sofia/actions/route.ts')
  assert.match(route, /normalizeDocumentDraft\(previous, input as[^)]*\)/)
  assert.match(route, /documentDraftContract\(/)
  assert.doesNotMatch(route, /const next: Record<string, unknown> = \{ \.\.\.previous/)
  const contract = read('src/lib/sofia-document-draft.ts')
  if (/includeAddress/.test(contract)) throw new Error('contract must not invent includeAddress')
  for (const key of ['confirmedValues', 'missingRequiredFields', 'missingOptionalFields', 'optionalOmissionConsent', 'nextAction']) assert.match(contract, new RegExp(key))
  assert.match(contract, /Não informado/)
})
