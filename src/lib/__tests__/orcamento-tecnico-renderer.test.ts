import test from 'node:test'
import assert from 'node:assert/strict'
import { renderDocumentHTML } from '../documents/pdf-generator'

test('renders the new canonical technical quote with contractor, scope, responsibility and signatures', () => {
  const html = renderDocumentHTML({ type: 'ORCAMENTO_TECNICO', data: {
    docNumber: '011/2026', issueDate: '19/08/2026', issueCity: 'Niterói', serviceTitle: 'Desentupimento de Ralos de Marquise',
    contractorName: 'WALE CONSTRUÇÕES E SERVIÇOS TÉCNICOS LTDA', contractorDocument: '26.086.779/0001-01', contractorAddress: 'Estrada Francisco da Cruz Nunes, 6666 - Piratininga - Niterói/RJ',
    contractedName: 'RR DESENTUPIDORA E DEDETIZADORA', contractedDocument: '53.102.506/0001-78', contractedContact: '21 99669-9191', object: 'Desentupimento de Ralos de Marquise.', scopeItems: ['Desentupimento completo dos ralos de marquise da obra', 'Teste de vazão após desobstrução'], responsibility: 'Todo o serviço será de responsabilidade da contratada.', totalAmount: '400,00', amountInWords: 'Quatrocentos reais', includedDescription: 'Desentupimento, remoção de resíduos, teste de vazão e limpeza final.', paymentMethod: 'Pix ou Cartão', validityDays: '7 dias', executionDeadline: 'Imediato / a combinar', warranty: '30 dias no mesmo ponto desentupido', acceptanceDate: '19/08/2026',
  } })
  assert.match(html, /ORÇAMENTO TÉCNICO Nº 011\/2026/)
  assert.match(html, /WALE CONSTRUÇÕES E SERVIÇOS TÉCNICOS LTDA/)
  assert.match(html, /CONTRATADA/)
  assert.match(html, /RESPONSABILIDADE/)
  assert.match(html, /ASSINATURAS/)
  assert.match(html, /Quatrocentos reais/)
  assert.match(html, /rr-logo\.webp/)
})
