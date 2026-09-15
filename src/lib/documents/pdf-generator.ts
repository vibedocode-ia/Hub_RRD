import { generateReciboHTML, generateOrdemServicoHTML, ReciboData, OrdemServicoData } from './pdf-templates';
import { generateOrcamentoHTML, OrcamentoData } from './orcamento-template';
import { generateOrcamentoTecnicoHTML, OrcamentoTecnicoData } from './orcamento-tecnico-template';

export type DocumentPayload =
  | { type: 'RECIBO_GARANTIA'; data: ReciboData }
  | { type: 'LAUDO_TECNICO'; data: OrdemServicoData }
  | { type: 'ORCAMENTO'; data: OrcamentoData }
  | { type: 'ORCAMENTO_TECNICO'; data: OrcamentoTecnicoData };

/** Converte o snapshot imutável no HTML próprio do modelo canônico. */
export function renderDocumentHTML(payload: DocumentPayload): string {
  if (payload.type === 'RECIBO_GARANTIA') return generateReciboHTML(payload.data);
  if (payload.type === 'LAUDO_TECNICO') return generateOrdemServicoHTML(payload.data);
  if (payload.type === 'ORCAMENTO_TECNICO') return generateOrcamentoTecnicoHTML(payload.data);
  return generateOrcamentoHTML(payload.data);
}
