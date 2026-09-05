export interface ReciboData {
  docNumber: string;
  paymentDate: string; // Ex: '15/04/2026'
  paymentDateExtended: string; // Ex: '15 de abril de 2026'
  amount: string; // Ex: '300,00'
  amountInWords: string; // Ex: 'trezentos reais'
  clientName: string;
  clientDoc: string; // CPF ou CNPJ
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

import { escapeHtml } from './escape-html';

export function generateReciboHTML(data: ReciboData): string {
  const docNumber = escapeHtml(data.docNumber);
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

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Recibo de Pagamento - ${docNumber}</title>
  <style>
    @page { size: A4; margin: 0; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      color: #0f172a;
      background: #ffffff;
      padding: 40px;
      font-size: 13px;
      line-height: 1.5;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #0284c7;
      padding-bottom: 16px;
      margin-bottom: 24px;
    }
    .brand-title {
      font-size: 20px;
      font-weight: 800;
      color: #0284c7;
      letter-spacing: -0.5px;
    }
    .brand-sub {
      font-size: 11px;
      color: #475569;
      margin-top: 4px;
    }
    .header-tag {
      text-align: right;
    }
    .tag-title {
      font-size: 11px;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
    }
    .tag-date {
      font-size: 16px;
      font-weight: 800;
      color: #0f172a;
    }
    .doc-title {
      text-align: center;
      font-size: 22px;
      font-weight: 900;
      color: #0f172a;
      letter-spacing: 1px;
      margin-bottom: 4px;
    }
    .doc-subtitle {
      text-align: center;
      font-size: 12px;
      color: #64748b;
      margin-bottom: 24px;
    }
    .amount-card {
      background: #f0f9ff;
      border: 1px solid #bae6fd;
      border-radius: 8px;
      padding: 20px;
      text-align: center;
      margin-bottom: 24px;
    }
    .amount-value {
      font-size: 32px;
      font-weight: 900;
      color: #0369a1;
    }
    .amount-words {
      font-size: 13px;
      font-weight: 600;
      color: #334155;
      margin-top: 4px;
    }
    .declaration-box {
      background: #f8fafc;
      border-left: 4px solid #0284c7;
      padding: 16px 20px;
      margin-bottom: 24px;
      border-radius: 0 8px 8px 0;
      font-size: 13px;
      color: #334155;
      line-height: 1.6;
    }
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-bottom: 24px;
    }
    .info-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 12px 16px;
    }
    .info-label {
      font-size: 10px;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
      margin-bottom: 2px;
    }
    .info-val {
      font-size: 13px;
      font-weight: 700;
      color: #0f172a;
    }
    .full-card {
      grid-column: span 2;
    }
    .signature-section {
      margin-top: 40px;
      padding-top: 24px;
      border-top: 1px dashed #cbd5e1;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }
    .sig-block {
      text-align: center;
      width: 260px;
    }
    .sig-line {
      border-top: 1px solid #0f172a;
      margin-bottom: 8px;
    }
    .sig-company {
      font-size: 11px;
      font-weight: 800;
      color: #0f172a;
    }
    .sig-role {
      font-size: 10px;
      color: #64748b;
    }
    .footer-note {
      font-size: 10px;
      color: #94a3b8;
      margin-top: 40px;
      text-align: center;
      border-top: 1px solid #f1f5f9;
      padding-top: 12px;
    }
    @media print {
      body { padding: 20px; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand-title">RR DESENTUPIDORA E DEDETIZADORA LTDA</div>
      <div class="brand-sub">CNPJ: 53.102.506/0001-78 | Licença INEA: operacional ativa</div>
      <div class="brand-sub">Rua Santos Moreira, 40, Casa 103 - Santa Rosa, Niterói/RJ</div>
      <div class="brand-sub">(21) 99669-9191 | (21) 99442-3968 | atendimento@rrdesentupidora.com.br</div>
    </div>
    <div class="header-tag">
      <div class="tag-title">DATA DO PAGAMENTO</div>
      <div class="tag-date">${paymentDate}</div>
      <div style="font-size: 11px; color: #64748b; margin-top: 4px;">Nº ${docNumber}</div>
    </div>
  </div>

  <div class="doc-title">RECIBO DE PAGAMENTO</div>
  <div class="doc-subtitle">Comprovação de recebimento e quitação do valor descrito</div>

  <div class="amount-card">
    <div class="amount-value">R$ ${amount}</div>
    <div class="amount-words">(${amountInWords})</div>
  </div>

  <div class="declaration-box">
    Declaramos, para os devidos fins, que recebemos de <strong>${clientName}</strong>, inscrito(a) no CPF/CNPJ nº <strong>${clientDoc}</strong>, a quantia de <strong>R$ ${amount} (${amountInWords})</strong>, paga por meio de <strong>${paymentMethod}</strong> em <strong>${paymentDateExtended}</strong>, referente ao serviço de <strong>${serviceDescription}</strong>, realizado no endereço <strong>${address}</strong>.<br><br>
    Pelo recebimento acima, damos plena e irrevogável quitação exclusivamente quanto ao valor e ao serviço descritos neste recibo.
  </div>

  <div class="info-grid">
    <div class="info-card">
      <div class="info-label">PAGADOR</div>
      <div class="info-val">${clientName}</div>
    </div>
    <div class="info-card">
      <div class="info-label">CNPJ/CPF DO PAGADOR</div>
      <div class="info-val">${clientDoc}</div>
    </div>
    <div class="info-card full-card">
      <div class="info-label">SERVIÇO QUITADO</div>
      <div class="info-val">${serviceDescription}</div>
    </div>
    <div class="info-card">
      <div class="info-label">FORMA DE PAGAMENTO</div>
      <div class="info-val">${paymentMethod}</div>
    </div>
    <div class="info-card">
      <div class="info-label">DATA E LOCAL</div>
      <div class="info-val">${paymentDate} - ${city}/RJ</div>
    </div>
  </div>

  <div class="signature-section">
    <div>
      <div style="font-size: 11px; color: #475569;">${issuedAtCity}, ${paymentDateExtended}</div>
    </div>
    <div class="sig-block">
      <div class="sig-line"></div>
      <div class="sig-company">RR DESENTUPIDORA E DEDETIZADORA LTDA</div>
      <div class="sig-role">CNPJ: 53.102.506/0001-78</div>
      <div class="sig-role">Assinatura do representante autorizado</div>
    </div>
  </div>

  <div class="footer-note">
    Este recibo comprova somente o pagamento do valor e do serviço identificados acima. Não substitui documento fiscal quando sua emissão for legalmente exigida.<br>
    <strong>RR DESENTUPIDORA E DEDETIZADORA LTDA • CNPJ 53.102.506/0001-78</strong>
  </div>
</body>
</html>`;
}

export function generateOrdemServicoHTML(data: OrdemServicoData): string {
  const docNumber = escapeHtml(data.docNumber);
  const executionDate = escapeHtml(data.executionDate);
  const clientName = escapeHtml(data.clientName);
  const clientDoc = escapeHtml(data.clientDoc);
  const clientAddress = escapeHtml(data.clientAddress);
  const serviceDescription = escapeHtml(data.serviceDescription);
  const totalAmount = escapeHtml(data.totalAmount);
  const paymentMethod = escapeHtml(data.paymentMethod);
  const technicalNotes = escapeHtml(data.technicalNotes || 'Serviço executado com sucesso e inspecionado junto ao cliente.');
  const technicianName = escapeHtml(data.technicianName || 'LEONARDO SANTOS');
  const warrantyDays = escapeHtml(data.warrantyDays);
  const warrantyTerms = data.warrantyTerms ? escapeHtml(data.warrantyTerms) : '';

  const itemsHTML = data.items
    .map(
      (item) => `
    <tr>
      <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">${escapeHtml(item.description)}</td>
      <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: center;">${escapeHtml(item.quantity)}</td>
      <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right;">R$ ${escapeHtml(item.unitPrice)}</td>
      <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 700;">R$ ${escapeHtml(item.subtotal)}</td>
    </tr>
  `
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Ordem de Serviço / Laudo Técnico - ${docNumber}</title>
  <style>
    @page { size: A4; margin: 0; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      color: #0f172a;
      background: #ffffff;
      padding: 40px;
      font-size: 13px;
      line-height: 1.5;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #0284c7;
      padding-bottom: 16px;
      margin-bottom: 24px;
    }
    .brand-title {
      font-size: 20px;
      font-weight: 800;
      color: #0284c7;
      letter-spacing: -0.5px;
    }
    .brand-sub {
      font-size: 11px;
      color: #475569;
      margin-top: 4px;
    }
    .header-tag {
      text-align: right;
    }
    .tag-title {
      font-size: 11px;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
    }
    .tag-date {
      font-size: 16px;
      font-weight: 800;
      color: #0f172a;
    }
    .doc-title-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }
    .doc-title {
      font-size: 22px;
      font-weight: 900;
      color: #0f172a;
    }
    .doc-badge {
      background: #e0f2fe;
      color: #0369a1;
      font-size: 11px;
      font-weight: 700;
      padding: 4px 12px;
      border-radius: 12px;
      text-transform: uppercase;
    }
    .client-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 24px;
    }
    .section-title {
      font-size: 11px;
      font-weight: 800;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
    }
    .client-name {
      font-size: 15px;
      font-weight: 800;
      color: #0f172a;
    }
    .client-meta {
      font-size: 12px;
      color: #475569;
      margin-top: 4px;
    }
    table.items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    table.items-table th {
      background: #f1f5f9;
      color: #475569;
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      padding: 10px;
      text-align: left;
      border-bottom: 2px solid #cbd5e1;
    }
    .table-total {
      display: flex;
      justify-content: flex-end;
      align-items: center;
      gap: 16px;
      font-size: 16px;
      font-weight: 800;
      padding: 12px 16px;
      background: #f8fafc;
      border-radius: 6px;
      margin-bottom: 24px;
    }
    .tech-report-box {
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 24px;
    }
    .compliance-box {
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 32px;
    }
    .compliance-item {
      font-size: 12px;
      color: #166534;
      margin-bottom: 4px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .signatures {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 40px;
      margin-top: 40px;
      padding-top: 20px;
    }
    .sig-col {
      text-align: center;
    }
    .sig-line {
      border-top: 1px solid #0f172a;
      margin-bottom: 8px;
    }
    .sig-name {
      font-size: 12px;
      font-weight: 800;
      color: #0f172a;
    }
    .sig-sub {
      font-size: 10px;
      color: #64748b;
    }
    .footer-note {
      font-size: 10px;
      color: #94a3b8;
      margin-top: 40px;
      text-align: center;
      border-top: 1px solid #f1f5f9;
      padding-top: 12px;
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand-title">RR DESENTUPIDORA E DEDETIZADORA LTDA</div>
      <div class="brand-sub">CNPJ: 53.102.506/0001-78 | Licença INEA: operacional ativa</div>
      <div class="brand-sub">Rua Santos Moreira, 40, Casa 103 - Santa Rosa, Niterói/RJ</div>
      <div class="brand-sub">(21) 99669-9191 | (21) 99442-3968 | atendimento@rrdesentupidora.com.br</div>
    </div>
    <div class="header-tag">
      <div class="tag-title">DATA DA EXECUÇÃO</div>
      <div class="tag-date">${executionDate}</div>
      <div style="font-size: 11px; color: #64748b; margin-top: 4px;">Nº ${docNumber}</div>
    </div>
  </div>

  <div class="doc-title-row">
    <div class="doc-title">ORDEM DE SERVIÇO / RELATÓRIO TÉCNICO</div>
    <div class="doc-badge">Atendimento Concluído</div>
  </div>

  <div class="client-card">
    <div class="section-title">DADOS DO CLIENTE</div>
    <div class="client-name">${clientName}</div>
    <div class="client-meta">CNPJ/CPF: ${clientDoc} | ${clientAddress}</div>
  </div>

  <div class="section-title">ITENS DO SERVIÇO</div>
  <table class="items-table">
    <thead>
      <tr>
        <th>Descrição do Serviço</th>
        <th style="text-align: center;">Qtd</th>
        <th style="text-align: right;">Unitário</th>
        <th style="text-align: right;">Subtotal</th>
      </tr>
    </thead>
    <tbody>
      ${itemsHTML}
    </tbody>
  </table>

  <div class="table-total">
    <span style="font-size: 12px; font-weight: 600; color: #475569;">Forma de pagamento informada: ${paymentMethod}</span>
    <span>TOTAL: R$ ${totalAmount}</span>
  </div>

  <div class="tech-report-box">
    <div class="section-title">LAUDO TÉCNICO / CONSTATAÇÕES</div>
    <div style="font-size: 13px; font-weight: 700; color: #0f172a; margin-bottom: 6px;">Serviço executado: ${serviceDescription}</div>
    <div style="font-size: 12px; color: #334155; white-space: pre-wrap;">${technicalNotes}</div>
  </div>

  <div class="compliance-box">
    <div class="section-title" style="color: #15803d;">CONFORMIDADE TÉCNICA E SEGURANÇA</div>
    <div class="compliance-item">✓ Empresa licenciada pelo INEA para transporte e descarte ecológico de resíduos.</div>
    <div class="compliance-item">✓ Equipe técnica certificada em NR-33 (Espaço Confinado) e NR-35 (Trabalho em Altura).</div>
    <div class="compliance-item">✓ Garantia de ${warrantyDays} dias, válida desde que não seja constatado mau uso${warrantyTerms ? ` (${warrantyTerms})` : ''}.</div>
    <div class="compliance-item">✓ Forma de pagamento: ${paymentMethod}.</div>
  </div>

  <div class="signatures">
    <div class="sig-col">
      <div class="sig-line"></div>
      <div class="sig-name">${technicianName}</div>
      <div class="sig-sub">Responsável Técnico (RR Desentupidora)</div>
    </div>
    <div class="sig-col">
      <div class="sig-line"></div>
      <div class="sig-name">${clientName}</div>
      <div class="sig-sub">Ciência e aceite do serviço executado</div>
    </div>
  </div>

  <div class="footer-note">
    <strong>RR DESENTUPIDORA E DEDETIZADORA LTDA • CNPJ 53.102.506/0001-78</strong>
  </div>
</body>
</html>`;
}
