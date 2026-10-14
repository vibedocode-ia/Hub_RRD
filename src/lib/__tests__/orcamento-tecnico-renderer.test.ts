import test from 'node:test'
import assert from 'node:assert/strict'
import { renderDocumentHTML } from '../documents/pdf-generator'

const data = {
  docNumber: '011/2026', issueDate: '19/08/2026', issueCity: 'Niterói', serviceTitle: 'Desentupimento de Ralos de Marquise',
  contractorName: 'WALE CONSTRUÇÕES E SERVIÇOS TÉCNICOS LTDA', contractorDocument: '26.086.779/0001-01', contractorAddress: 'Estrada Francisco da Cruz Nunes, 6666 - Piratininga - Niterói/RJ',
  contractedName: 'RR DESENTUPIDORA E DEDETIZADORA', contractedDocument: '53.102.506/0001-78', contractedContact: '21 99669-9191', object: 'Desentupimento de Ralos de Marquise.',
  scopeItems: ['Desentupimento completo dos ralos de marquise da obra', 'Remoção de resíduos, areia, cimento e detritos de obra', 'Teste de vazão após desobstrução', 'Limpeza e organização do local após o serviço'],
  responsibility: 'Todo o serviço e sua responsabilidade técnica será de inteira responsabilidade da empresa RR DESENTUPIDORA E DEDETIZADORA, deixando a contratante isenta de custos adicionais.',
  totalAmount: '400,00', amountInWords: 'Quatrocentos reais', includedDescription: 'Desentupimento completo dos ralos de marquise da obra, remoção de resíduos, areia, cimento e detritos de obra, teste de vazão e limpeza final do local.',
  paymentMethod: 'Pix ou Cartão', validityDays: '7 dias', executionDeadline: 'Imediato / a combinar', warranty: '30 dias no mesmo ponto desentupido', acceptanceDate: '19/08/2026',
}

test('technical quote stays a two-page A4 proposal with the reference hierarchy and fields', () => {
  const html = renderDocumentHTML({ type: 'ORCAMENTO_TECNICO', data })
  assert.equal((html.match(/<section class="page">/g) || []).length, 2)
  for (const heading of ['CONTRATANTE', 'CONTRATADA', 'OBJETO', 'ESCOPO TÉCNICO', 'RESPONSABILIDADE', 'VALOR DO SERVIÇO', 'CONDIÇÕES COMERCIAIS', 'ASSINATURAS']) assert.ok(html.includes(heading), `missing ${heading}`)
  for (const field of [data.docNumber, data.contractorName, data.contractorDocument, data.contractorAddress, ...data.scopeItems, data.responsibility, data.totalAmount, data.amountInWords, data.paymentMethod, data.validityDays, data.executionDeadline, data.warranty]) assert.ok(html.includes(field), `missing ${field}`)
  assert.match(html, /grid-template-columns:1fr 1fr/)
  assert.match(html, /class="signature-grid"/)
  assert.match(html, /rr-logo\.webp/)
})

test('multiline customer names remain readable in the contractor and acceptance blocks', () => {
  const html = renderDocumentHTML({ type: 'ORCAMENTO_TECNICO', data: { ...data, contractorName: 'WALE CONSTRUÇÕES E SERVIÇOS TÉCNICOS\nLTDA' } })
  assert.match(html, /WALE CONSTRUÇÕES E SERVIÇOS TÉCNICOS<br>LTDA/)
  assert.match(html, /class="signature"><b class="contractor-name">WALE CONSTRUÇÕES E SERVIÇOS TÉCNICOS<br>LTDA<\/b>/)
})
