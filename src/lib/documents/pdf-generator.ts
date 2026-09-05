import { generateReciboHTML, generateOrdemServicoHTML, ReciboData, OrdemServicoData } from './pdf-templates';

export type DocumentPayload =
  | { type: 'RECIBO_GARANTIA'; data: ReciboData }
  | { type: 'ORCAMENTO' | 'LAUDO_TECNICO'; data: OrdemServicoData };

/**
 * Converte o payload imutável congelado em HTML pronto para visualização e impressão PDF.
 */
export function renderDocumentHTML(payload: DocumentPayload): string {
  if (payload.type === 'RECIBO_GARANTIA') {
    return generateReciboHTML(payload.data);
  }
  return generateOrdemServicoHTML(payload.data);
}
