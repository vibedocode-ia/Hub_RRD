import test from 'node:test'
import assert from 'node:assert/strict'
import { parseDocumentTemplateInput } from '../document-template-contract'

test('accepts a closed editable budget template definition', () => {
  const result = parseDocumentTemplateInput({
    name: 'Orçamento Técnico', docType: 'ORCAMENTO', version: 'RR_ORCAMENTO_V1',
    fields: [{ key: 'contractor', label: 'Contratante', type: 'text', required: true }, { key: 'totalValue', label: 'Valor total', type: 'currency', required: true }],
  })
  assert.equal(result.ok, true)
})

test('rejects arbitrary template field types and unsafe keys', () => {
  for (const fields of [[{ key: '__proto__', label: 'X', type: 'text', required: true }], [{ key: 'value', label: 'X', type: 'html', required: true }]]) {
    assert.equal(parseDocumentTemplateInput({ name: 'Modelo', docType: 'ORCAMENTO', version: 'RR_TEST_V1', fields }).ok, false)
  }
})
