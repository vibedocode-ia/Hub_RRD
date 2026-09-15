import { escapeHtml } from './escape-html'

export interface OrcamentoTecnicoData {
  docNumber: string
  issueDate: string
  issueCity: string
  serviceTitle: string
  contractorName: string
  contractorDocument: string
  contractorAddress: string
  contractedName: string
  contractedDocument: string
  contractedContact: string
  object: string
  scopeItems: string[]
  responsibility: string
  totalAmount: string
  amountInWords: string
  includedDescription: string
  paymentMethod: string
  validityDays: string
  executionDeadline: string
  warranty: string
  acceptanceDate?: string
}

const esc = (value: unknown) => escapeHtml(String(value ?? ''))
const text = (value: string) => esc(value).replace(/\n/g, '<br>')
const list = (items: string[]) => items.map((item) => `<li>${text(item)}</li>`).join('')

export function generateOrcamentoTecnicoHTML(data: OrcamentoTecnicoData): string {
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Orçamento Técnico ${esc(data.docNumber)}</title><style>
@page{size:A4;margin:0}*{box-sizing:border-box}html,body{margin:0;background:#fff;color:#14283f;font-family:Arial,Helvetica,sans-serif}.page{position:relative;width:210mm;height:297mm;overflow:hidden;background:#fff;page-break-after:always;padding:31mm 15mm 23mm}.page:last-child{page-break-after:auto}.header{position:absolute;inset:0 0 auto;height:38mm;background:#062b52;color:#fff;padding:8mm 15mm 6mm 24mm;border-bottom:1mm solid #19b8d1}.header:before{content:"";position:absolute;left:0;top:0;width:6mm;height:100%;background:#1ab8d0}.brand{display:flex;align-items:center;gap:5mm}.logo{width:30mm;height:16mm;object-fit:contain;background:#fff;border-radius:3mm;padding:2mm}.brand-name{font-size:15pt;font-weight:800;letter-spacing:.5px}.header h1{margin:2mm 0 0;font-size:13pt;letter-spacing:.2px}.header p{margin:1.5mm 0 0;font-size:8.5pt;color:#c6f5fb}.card{border:1px solid #b9d7e5;background:#f4f8fa;border-radius:4mm;padding:5mm 6mm;margin-bottom:5mm}.label{font-size:7.5pt;font-weight:800;letter-spacing:.8px;color:#0b537e;text-transform:uppercase;margin-bottom:2mm}.value{font-size:9.5pt;line-height:1.4;color:#172d45}.strong{font-weight:800}.section-title{display:flex;align-items:center;gap:3mm;margin:5mm 0 2.5mm;color:#0c385b;font-size:11pt;font-weight:800;text-transform:uppercase}.section-number{display:flex;align-items:center;justify-content:center;width:8mm;height:8mm;border-radius:50%;background:#18b8d0;color:#fff;font-size:10pt;font-weight:900}.two-col{display:grid;grid-template-columns:1fr 1fr;gap:5mm}.scope{min-height:40mm}.scope ul{margin:0;padding-left:5mm}.scope li{padding:1.2mm 0 1.2mm 1mm;font-size:9pt;line-height:1.35}.scope li::marker{color:#13aec9}.responsibility{min-height:29mm}.footer{position:absolute;left:0;right:0;bottom:0;height:17mm;background:#062b52;border-top:1mm solid #19b8d1;color:#fff;padding:3.5mm 15mm;display:flex;justify-content:space-between;align-items:center;font-size:7pt}.footer strong{font-size:10pt;display:block}.footer-right{text-align:right}.page-label{position:absolute;right:15mm;bottom:19mm;font-size:7pt;color:#66809a}.amount{display:grid;grid-template-columns:1fr 1fr;gap:4mm;background:#062b52;color:#fff;border-radius:4mm;padding:6mm;margin-bottom:4mm}.amount .label{color:#8ee8f1}.amount .value{color:#fff;font-size:16pt;font-weight:900}.included{background:#f4f8fa;border:1px solid #b9d7e5;border-radius:3mm;padding:4mm 5mm;font-size:8.5pt;line-height:1.4}.commercial{background:#eaf8fb;border-color:#75cadb}.commercial .row{display:grid;grid-template-columns:45mm 1fr;gap:3mm;padding:1.5mm 0;border-bottom:1px solid #c7eaf0;font-size:8.5pt}.commercial .row:last-child{border-bottom:0}.commercial b{color:#0b537e}.signatures{margin-top:7mm}.signature-grid{display:grid;grid-template-columns:1fr 1fr;gap:12mm;margin-top:12mm}.signature{border-top:1px solid #234560;padding-top:3mm;min-height:19mm;font-size:8pt;line-height:1.35}.signature b{display:block;font-size:8.5pt}.date{text-align:center;margin-top:8mm;font-size:9pt}.muted{color:#557088;font-size:8pt}
</style></head><body>
<section class="page"><header class="header"><div class="brand"><img class="logo" src="/assets/rr-logo.webp" alt="RR Desentupidora"><div><div class="brand-name">RR DESENTUPIDORA</div><h1>ORÇAMENTO TÉCNICO Nº ${esc(data.docNumber)}</h1><p>${esc(data.serviceTitle)}</p></div></div></header>
<div class="card"><div class="label">CONTRATANTE</div><div class="value strong">${text(data.contractorName)}</div><div class="value">CNPJ: ${esc(data.contractorDocument)}</div><div class="value">${text(data.contractorAddress)}</div></div>
<div class="card"><div class="label">CONTRATADA</div><div class="value strong">${esc(data.contractedName)}</div><div class="value">CNPJ: ${esc(data.contractedDocument)} · Contato: ${esc(data.contractedContact)}</div></div>
<div class="section-title"><span class="section-number">1</span>OBJETO</div><div class="card"><div class="value">${text(data.object)}</div></div>
<div class="section-title"><span class="section-number">2</span>ESCOPO TÉCNICO</div><div class="card scope"><ul>${list(data.scopeItems)}</ul></div>
<div class="section-title"><span class="section-number">3</span>RESPONSABILIDADE</div><div class="card responsibility"><div class="value">${text(data.responsibility)}</div></div>
<div class="page-label">Página 1</div><footer class="footer"><div><strong>RR DESENTUPIDORA</strong>Atendimento 24h · WhatsApp: (21) 99669-9191 · CNPJ: 53.102.506/0001-78</div><div class="footer-right">${esc(data.issueCity)}<br>Niterói · São Gonçalo · Maricá</div></footer></section>
<section class="page"><header class="header"><div class="brand"><img class="logo" src="/assets/rr-logo.webp" alt="RR Desentupidora"><div><div class="brand-name">RR DESENTUPIDORA</div><h1>ORÇAMENTO TÉCNICO Nº ${esc(data.docNumber)}</h1><p>${esc(data.serviceTitle)}</p></div></div></header>
<div class="section-title"><span class="section-number">4</span>VALOR DO SERVIÇO</div><div class="amount"><div><div class="label">Investimento total</div><div class="value">R$ ${esc(data.totalAmount)}</div></div><div><div class="label">Valor total</div><div class="value">R$ ${esc(data.totalAmount)}</div></div></div><div class="included"><b>Valor contempla:</b> ${text(data.includedDescription)}<br><span class="muted">Valor por extenso: ${esc(data.amountInWords)}</span></div>
<div class="two-col"><div><div class="section-title"><span class="section-number">5</span>CONDIÇÕES COMERCIAIS</div><div class="card commercial"><div class="row"><b>Forma de pagamento:</b><span>${esc(data.paymentMethod)}</span></div><div class="row"><b>Validade da proposta:</b><span>${esc(data.validityDays)}</span></div><div class="row"><b>Prazo de execução:</b><span>${esc(data.executionDeadline)}</span></div><div class="row"><b>Garantia:</b><span>${esc(data.warranty)}</span></div></div></div><div><div class="section-title"><span class="section-number">6</span>ASSINATURAS</div><div class="signature-grid" style="display:block;margin-top:10mm"><div class="signature"><b>${esc(data.contractedName)}</b>CNPJ: ${esc(data.contractedDocument)}</div><div class="signature" style="margin-top:12mm"><b>${esc(data.contractorName)}</b>CNPJ: ${esc(data.contractorDocument)} · Aceite</div></div></div></div>
<div class="date">${esc(data.issueCity)}, ${esc(data.acceptanceDate || data.issueDate)}<br><span class="muted">Data de aceite: ______________________________</span></div><div class="page-label">Página 2</div><footer class="footer"><div><strong>RR DESENTUPIDORA</strong>Atendimento 24h · WhatsApp: (21) 99669-9191 · CNPJ: 53.102.506/0001-78</div><div class="footer-right">${esc(data.issueCity)}<br>Niterói · São Gonçalo · Maricá</div></footer></section></body></html>`
}
