import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { draftReviewVersion } from '../sofia-draft-review-version'

const read = (path: string) => readFileSync(path, 'utf8')
test('portal confirmation binds displayed reviewed values and explicitly issues, never claims delivery', () => {
  const button = read('src/app/portal/sofia-drafts/ConfirmDraftButton.tsx')
  const page = read('src/app/portal/sofia-drafts/page.tsx')
  assert.match(button, /reviewVersion/)
  assert.match(button, /Confirmar e emitir documento/)
  assert.match(button, /não envia.*WhatsApp/)
  assert.match(button, /router\.push\(data\.previewUrl\)/)
  assert.match(button, /confirmation: 'CONFIRMO', reviewVersion/)
  assert.match(page, /reviewPortalDraft\(draft\.id, draft\.draftPayload/)
  assert.match(page, /reviewVersion=\{review\?\.reviewVersion/)
  assert.match(page, /review\.effectiveValues/)
  assert.match(page, /review\.templateId/)
  assert.match(page, /review\.templateVersion/)
  assert.match(page, /Valores efetivos do modelo/)
  assert.match(page, /review\.error/)
  assert.match(page, /JSON\.stringify\(draft\.draftPayload, null, 2\)/)
  assert.match(page, /eq\(sofiaDrafts\.centralHubId, hubId\)/)
})
test('review version is key-order independent and changes for every nested reviewed value', () => {
  assert.equal(draftReviewVersion({ amount: '1', address: { city: 'A', number: '2' } }), draftReviewVersion({ address: { number: '2', city: 'A' }, amount: '1' }))
  assert.notEqual(draftReviewVersion({ amount: '1' }), draftReviewVersion({ amount: '2' }))
  assert.notEqual(draftReviewVersion({ optionalFieldConsent: { city: 'Não informado' } }), draftReviewVersion({ optionalFieldConsent: {} }))
})
