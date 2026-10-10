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

test('accepts repeated normalized placements and legacy JSON fields', () => {
  const fields = [{ key: 'clientName', label: 'Cliente', type: 'text', required: true, placements: [
    { page: 0, x: 0.1, y: 0.2, width: 0.3, height: 0.1, fontSize: 12, color: '#112233' },
    { page: 2, x: 0, y: 0, width: 1, height: 1 },
  ] }]
  for (const value of [fields, JSON.stringify(fields)]) {
    const result = parseDocumentTemplateInput({ name: 'Modelo', docType: 'ORCAMENTO', version: 'RR_TEST_V1', fields: value })
    assert.equal(result.ok, true)
    if (result.ok) assert.deepEqual(result.data.fields, fields)
  }
})

test('accepts explicit mask background and rejects invalid placement geometry', () => {
  const base = { page: 0, x: 0.1, y: 0.1, width: 0.2, height: 0.1, background: '#003366', color: '#ffffff' }
  const parse = (p: object) => parseDocumentTemplateInput({ name: 'Modelo', docType: 'ORCAMENTO', version: 'RR_TEST_V1', fields: [{ key: 'number', label: 'Número', type: 'text', required: true, placements: [p] }] })
  assert.equal(parse(base).ok, true)
  for (const invalid of [{ page: -1 }, { page: 0.2 }, { x: -0.1 }, { width: 0 }, { y: 0.95 }, { height: 2 }, { color: 'red' }, { background: '#123' }, { fontSize: 0 }]) {
    assert.equal(parse({ ...base, ...invalid }).ok, false, JSON.stringify(invalid))
  }
})

test('rejects arbitrary template field types and unsafe keys', () => {
  for (const fields of [[{ key: '__proto__', label: 'X', type: 'text', required: true }], [{ key: 'value', label: 'X', type: 'html', required: true }]]) {
    assert.equal(parseDocumentTemplateInput({ name: 'Modelo', docType: 'ORCAMENTO', version: 'RR_TEST_V1', fields }).ok, false)
  }
})
