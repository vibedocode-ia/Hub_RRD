import { test } from 'node:test'
import assert from 'node:assert/strict'
import { resolveTemplateValues } from '../documents/template-values'

test('o valor cadastrado totalValue recebe o valor confirmado do orçamento', () => {
  assert.equal(resolveTemplateValues({ totalAmount: '480,50' }).totalValue, '480,50')
})
test('valores explícitos não são sobrescritos por alias', () => {
  assert.equal(resolveTemplateValues({ totalAmount: '480,50' }, { totalValue: '500,00' }).totalValue, '500,00')
})
test('campo ausente nunca recebe valor ou garantia de exemplo', () => {
  const values = resolveTemplateValues({ contractor: 'Cliente de teste' })
  assert.equal(values.amount, undefined)
  assert.equal(values.guarantees, undefined)
  assert.equal(values.contractorName, 'Cliente de teste')
})
test('o preenchimento não altera dados originais', () => {
  const data = { clientDoc: 'Documento confirmado', serviceDescription: 'Serviço confirmado' }
  const values = resolveTemplateValues(data)
  assert.equal(values.contractorDocument, data.clientDoc)
  assert.deepEqual(data, { clientDoc: 'Documento confirmado', serviceDescription: 'Serviço confirmado' })
})
