import test from 'node:test'
import assert from 'node:assert/strict'
import { renderDocumentHTML } from '../documents/pdf-generator'

test('renders orçamento as its own two-page template instead of a laudo', () => {
  const html = renderDocumentHTML({ type: 'ORCAMENTO', data: { docNumber: 'ORC-2026-0001', issueDate: '12/09/2026', contractor: '[TESTE SOFIA] Cliente', object: 'Desentupimento', serviceScope: '<script>não executar</script>', totalAmount: '500,00', paymentMethod: 'Pix', validityDays: '15 dias', executionDeadline: 'A combinar', guarantees: '30 dias' } } as any)
  assert.match(html, /rr-orcamento-v1-page-1\.png/)
  assert.match(html, /rr-orcamento-v1-page-2\.png/)
  assert.match(html, /ORC-2026-0001/)
  assert.doesNotMatch(html, /<script>não executar<\/script>/)
  assert.doesNotMatch(html, /Ordem de Serviço e Relatório Técnico/)
})
