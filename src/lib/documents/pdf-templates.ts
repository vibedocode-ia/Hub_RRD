import { escapeHtml } from './escape-html';

export interface ReciboData {
  docNumber: string;
  paymentDate: string;
  paymentDateExtended: string;
  amount: string;
  amountInWords: string;
  clientName: string;
  clientDoc: string;
  serviceDescription: string;
  address: string;
  city: string;
  paymentMethod: string;
  issuedAtCity: string;
}

export interface OrdemServicoData {
  docNumber: string;
  executionDate: string;
  clientName: string;
  clientDoc: string;
  clientAddress: string;
  serviceType: string;
  serviceDescription: string;
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: string;
    subtotal: string;
  }>;
  totalAmount: string;
  paymentMethod: string;
  technicalNotes: string;
  technicianName: string;
  warrantyDays: number;
  warrantyTerms?: string;
}

const PAGE_CSS = `
  @page { size: A4 portrait; margin: 0; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; width: 210mm; min-height: 297mm; background: #fff; }
  body { font-family: 'DejaVu Sans', Arial, sans-serif; color: #242b38; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .page { position: relative; width: 595.5pt; height: 842.25pt; overflow: hidden; background-position: 0 0; background-repeat: no-repeat; background-size: 595.5pt 842.25pt; }
  .field { position: absolute; z-index: 2; margin: 0; }
  .white { background: #fff; }
  .navy { background: #053b70; }
  .muted { color: #616979; }
  strong { font-family: 'DejaVu Sans', Arial, sans-serif; font-weight: 700; }
  @media screen { body { margin: 0 auto; } .page { box-shadow: 0 0 18px rgba(15,23,42,.16); } }
`;

function docLabel(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.length === 11) return 'CPF';
  if (digits.length === 14) return 'CNPJ';
  return 'CPF/CNPJ';
}

export function generateReciboHTML(data: ReciboData): string {
  const paymentDate = escapeHtml(data.paymentDate);
  const paymentDateExtended = escapeHtml(data.paymentDateExtended);
  const amount = escapeHtml(data.amount);
  const amountInWords = escapeHtml(data.amountInWords);
  const clientName = escapeHtml(data.clientName);
  const clientDoc = escapeHtml(data.clientDoc);
  const serviceDescription = escapeHtml(data.serviceDescription);
  const address = escapeHtml(data.address);
  const city = escapeHtml(data.city);
  const paymentMethod = escapeHtml(data.paymentMethod);
  const issuedAtCity = escapeHtml(data.issuedAtCity);
  const identityLabel = docLabel(data.clientDoc);

  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Recibo de Pagamento</title>
<style>${PAGE_CSS}
  .receipt { background-image: url('/documents/templates/rr-recibo-v1.png'); }
  .r-header-company-fix { left: 145pt; top: 122pt; width: 255pt; height: 16pt; padding: 3pt 4pt; font-size: 7.8pt; line-height: 9pt; }
  .r-date { left: 426pt; top: 53pt; width: 112pt; height: 19pt; color: #fff; font-size: 11pt; line-height: 19pt; font-weight: 700; text-align: center; }
  .r-amount { left: 55pt; top: 211pt; width: 396pt; height: 50pt; color: #fff; padding: 3pt 9pt; }
  .r-amount-main { font-size: 23pt; line-height: 27pt; font-weight: 700; }
  .r-amount-words { font-size: 8.2pt; line-height: 12pt; }
  .r-declaration { left: 44pt; top: 288pt; width: 510pt; min-height: 87pt; padding: 4pt; font-size: 10.2pt; line-height: 15.7pt; text-align: left; }
  .r-table-value { left: 178pt; width: 373pt; height: 16pt; padding: 3.2pt 5pt 1pt; font-size: 8.4pt; line-height: 10pt; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
  .r-id-label { left: 48pt; top: 474pt; width: 130pt; height: 16pt; padding: 3.2pt 2pt; background: #eaf9fe; color: #111bd4; font-size: 7.2pt; line-height: 10pt; font-weight: 700; }
  .r-v1 { top: 447pt; } .r-v2 { top: 474pt; } .r-v3 { top: 501pt; } .r-v4 { top: 528pt; } .r-v5 { top: 555pt; }
  .r-note-fix { left: 49pt; top: 607pt; width: 410pt; height: 16pt; padding: 3pt; background: #fff8d8; font-size: 7pt; line-height: 9pt; }
  .r-sign-date { left: 408pt; top: 637pt; width: 153pt; height: 19pt; padding: 4pt 2pt; font-size: 8pt; line-height: 10pt; font-weight: 700; text-align: center; }
</style></head><body>
<main class="page receipt" aria-label="Recibo de Pagamento da RR Desentupidora">
  <div class="field white r-header-company-fix">CNPJ: 53.102.506/0001-78 &nbsp;|&nbsp; Licença INEA: operacional ativa</div>
  <div class="field navy r-date">${paymentDate}</div>
  <div class="field navy r-amount"><div class="r-amount-main">R$ ${amount}</div><div class="r-amount-words">(${amountInWords})</div></div>
  <div class="field white r-declaration">Declaramos, para os devidos fins, que recebemos de <strong>${clientName}</strong>, inscrito(a) no ${identityLabel} nº <strong>${clientDoc}</strong>, a quantia de <strong>R$ ${amount} (${amountInWords})</strong>, paga por meio de <strong>${paymentMethod}</strong> em <strong>${paymentDateExtended}</strong>, referente ao serviço de <strong>${serviceDescription}</strong>, realizado e concluído no endereço <strong>${address}</strong>.</div>
  <div class="field r-table-value r-v1">${clientName}</div>
  <div class="field r-id-label">${identityLabel} DO PAGADOR</div>
  <div class="field r-table-value r-v2">${clientDoc}</div>
  <div class="field r-table-value r-v3">${serviceDescription}</div>
  <div class="field r-table-value r-v4">${paymentMethod}</div>
  <div class="field r-table-value r-v5">${paymentDate} - ${city}/RJ</div>
  <div class="field r-note-fix">Este recibo comprova somente o pagamento do valor e do serviço identificados acima.</div>
  <div class="field white r-sign-date">${issuedAtCity}, ${paymentDateExtended}</div>
</main></body></html>`;
}

export function generateOrdemServicoHTML(data: OrdemServicoData): string {
  const executionDate = escapeHtml(data.executionDate);
  const clientName = escapeHtml(data.clientName);
  const clientDoc = escapeHtml(data.clientDoc);
  const clientAddress = escapeHtml(data.clientAddress);
  const serviceDescription = escapeHtml(data.serviceDescription);
  const totalAmount = escapeHtml(data.totalAmount);
  const paymentMethod = escapeHtml(data.paymentMethod);
  const technicalNotes = escapeHtml(data.technicalNotes);
  const technicianName = escapeHtml(data.technicianName);
  const warrantyDays = escapeHtml(data.warrantyDays);
  const warrantyTerms = data.warrantyTerms ? ` ${escapeHtml(data.warrantyTerms)}` : ' válida desde que não seja constatado mau uso.';
  const identityLabel = docLabel(data.clientDoc);
  const firstItem = data.items[0] || { description: data.serviceDescription, quantity: 1, unitPrice: data.totalAmount, subtotal: data.totalAmount };

  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Ordem de Serviço / Relatório Técnico</title>
<style>${PAGE_CSS}
  .service-order { background-image: url('/documents/templates/rr-os-relatorio-v1.png'); }
  .o-date { left: 425pt; top: 53pt; width: 115pt; height: 20pt; color: #fff; font-size: 11pt; line-height: 20pt; font-weight: 700; text-align: center; }
  .o-client { left: 40pt; top: 207pt; width: 520pt; height: 39pt; padding: 4pt 5pt; font-size: 7.7pt; line-height: 14pt; }
  .o-client-name { color: #063b70; font-size: 8.4pt; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .o-row { left: 36pt; top: 290pt; width: 524pt; height: 29pt; padding: 7pt 4pt; font-size: 8.1pt; line-height: 10pt; }
  .o-row span { position: absolute; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
  .o-desc { left: 4pt; width: 290pt; } .o-qty { left: 304pt; width: 28pt; text-align: center; } .o-unit { left: 357pt; width: 68pt; text-align: right; } .o-subtotal { right: 4pt; width: 78pt; text-align: right; }
  .o-total { left: 487pt; top: 326pt; width: 73pt; height: 24pt; padding: 5pt 3pt; font-size: 10pt; line-height: 12pt; font-weight: 700; color: #063b70; text-align: right; }
  .o-payment-top { left: 420pt; top: 359pt; width: 143pt; height: 18pt; padding: 4pt 0; font-size: 7.2pt; line-height: 9pt; color: #616979; text-align: right; }
  .o-report { left: 38pt; top: 407pt; width: 524pt; height: 60pt; padding: 5pt 4pt; font-size: 7.8pt; line-height: 13pt; }
  .o-report strong { font-weight: 700; }
  .o-compliance { left: 49pt; top: 508pt; width: 508pt; height: 61pt; padding: 4pt 0 4pt 8pt; font-size: 7.4pt; line-height: 13pt; }
  .o-tech { left: 93pt; top: 696pt; width: 140pt; height: 27pt; padding: 4pt; font-size: 6.6pt; line-height: 8.3pt; text-align: center; }
  .o-client-sign { left: 320pt; top: 696pt; width: 240pt; height: 27pt; padding: 4pt; font-size: 6.6pt; line-height: 8.3pt; text-align: center; }
  .sig-name { display:block; font-weight:700; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
</style></head><body>
<main class="page service-order" aria-label="Ordem de Serviço e Relatório Técnico da RR Desentupidora">
  <div class="field navy o-date">${executionDate}</div>
  <div class="field white o-client"><div class="o-client-name">${clientName}</div><div>${identityLabel}: ${clientDoc} &nbsp;|&nbsp; ${clientAddress}</div></div>
  <div class="field white o-row"><span class="o-desc">${escapeHtml(firstItem.description)}</span><span class="o-qty">${escapeHtml(firstItem.quantity)}</span><span class="o-unit">R$ ${escapeHtml(firstItem.unitPrice)}</span><span class="o-subtotal">R$ ${escapeHtml(firstItem.subtotal)}</span></div>
  <div class="field white o-total">R$ ${totalAmount}</div>
  <div class="field white o-payment-top">Forma de pagamento informada: ${paymentMethod}</div>
  <div class="field white o-report"><div><strong>Serviço executado:</strong> ${serviceDescription}.</div><div><strong>Observações técnicas do atendimento:</strong> ${technicalNotes}</div></div>
  <div class="field white o-compliance"><div>Empresa licenciada pelo INEA para transporte e descarte de resíduos.</div><div>Equipe técnica certificada em NR-33 (Espaço Confinado) e NR-35 (Trabalho em Altura).</div><div>Garantia de ${warrantyDays} dias,${warrantyTerms}</div><div>Forma de pagamento: ${paymentMethod}.</div></div>
  <div class="field white o-tech"><span class="sig-name">${technicianName}</span><span>Responsável Técnico</span></div>
  <div class="field white o-client-sign"><span class="sig-name">${clientName}</span><span>Ciência e aceite do serviço</span></div>
</main></body></html>`;
}
