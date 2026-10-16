import test from 'node:test'
import assert from 'node:assert/strict'
import { draftReviewVersion } from '../sofia-draft-review-version'
import { conflictingDocumentAliases } from '../sofia-document-draft'

test('review binds effective template selection, schema/defaults and actual source', () => {
  const payload = { amount: '350,50' }
  const template = { id: 'one', version: 'V1', fieldSchema: [{ key: 'paymentMethod', defaultValue: 'PIX' }], sourceSha256: 'hash', sourcePdfBase64: 'source' }
  const version = draftReviewVersion(payload, template)
  for (const patch of [{ id: 'two' }, { fieldSchema: [] }, { sourceSha256: 'changed' }, { sourcePdfBase64: 'changed' }]) assert.notEqual(draftReviewVersion(payload, { ...template, ...patch }), version)
})
test('aliases compare money, date and identity semantically without mutating payload', () => {
  for (const value of ['350.50', 350.5, '350,50']) {
    const payload = { amount: '350,50', documentDate: '2026-10-15', customerDocument: '529.982.247-25', documentFields: { totalAmount: value, issueDate: '15/10/2026', clientDoc: '52998224725' } }
    const before = JSON.stringify(payload)
    assert.deepEqual(conflictingDocumentAliases(payload), [])
    assert.equal(JSON.stringify(payload), before)
  }
  assert.deepEqual(conflictingDocumentAliases({ amount: '350,50', documentFields: { totalAmount: '999,00' } }), ['totalAmount'])
})
