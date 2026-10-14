const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {harness}=require('./harness.cjs');
const data={docNumber:'TESTE-000',issueDate:'14/10/2026',issueCity:'Cidade de teste',serviceTitle:'Serviço sintético de validação',contractorName:'CLIENTE SINTÉTICO\nSEM VALIDADE COMERCIAL',contractorDocument:'00.000.000/0000-00',contractorAddress:'Endereço sintético, 000 — Cidade de teste',contractedName:'RR DESENTUPIDORA E DEDETIZADORA',contractedDocument:'53.102.506/0001-78',contractedContact:'21 99669-9191',object:'Descrição sintética para avaliar o layout, não é uma ordem de serviço.',scopeItems:['Primeiro item sintético','Segundo item sintético','Terceiro item sintético','Quarto item sintético'],responsibility:'Texto sintético de responsabilidade usado exclusivamente para inspeção visual. Documento sem validade comercial.',totalAmount:'400,00',amountInWords:'Quatrocentos reais',includedDescription:'Materiais e execução sintéticos para inspeção do layout.',paymentMethod:'Teste',validityDays:'7 dias',executionDeadline:'A combinar',warranty:'Condição sintética'};
const html=harness()('src/lib/documents/orcamento-tecnico-template.ts').generateOrcamentoTecnicoHTML(data);
if(process.env.FIDELITY_OUTPUT){
 const logo=fs.readFileSync(path.resolve(__dirname,'../../public/assets/rr-logo.webp')).toString('base64');
 fs.writeFileSync(process.env.FIDELITY_OUTPUT,html.replaceAll('/assets/rr-logo.webp',`data:image/webp;base64,${logo}`));
}
test('fidelity: quote content must start below the absolute header',()=>{
 const content=Number(html.match(/\.page\{[^}]*padding:([\d.]+)mm/)[1]);
 const header=Number(html.match(/\.header\{[^}]*height:([\d.]+)mm/)[1]);
 assert.ok(content>header,`content starts ${content}mm but header ends ${header}mm`);
});
test('fidelity: synthetic text escapes without inheriting canonical customer',()=>{
 assert.ok(html.includes('CLIENTE SINTÉTICO<br>SEM VALIDADE COMERCIAL'));
 assert.ok(!html.includes('WALE'));assert.equal((html.match(/<section class="page">/g)||[]).length,2);
});
