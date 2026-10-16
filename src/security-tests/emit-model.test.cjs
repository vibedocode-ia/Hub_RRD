const {test}=require('node:test');
const assert=require('node:assert/strict');
const {harness,nr}=require('./harness.cjs');
const row={serviceRequest:{id:'req-1',serviceType:'DESENTUPIMENTO DE CAIXA DE GORDURA',problemReported:'Limpeza de caixa de gordura',totalAmount:'400,00',paymentMethod:'Pix',status:'EM_EXECUCAO'},cli:{id:'cli-1',name:'CLIENTE SINTÉTICO',document:'00.000.000/0000-00'},addr:{street:'Rua Sintética',number:'0',neighborhood:'Bairro',city:'Niterói',state:'RJ',zipCode:'00000-000'}};
function build(registered){
 const inserts=[];
 const db={
  select:()=>({from:()=>({innerJoin:()=>({leftJoin:()=>({where:()=>({limit:()=>Promise.resolve([{req:row.serviceRequest,cli:row.cli,addr:row.addr}])})})})})}),
  insert:()=>({values:v=>{inserts.push(v);return {returning:()=>Promise.resolve([{id:'doc-1',...v}])}}}),
  update:()=>({set:()=>({where:()=>Promise.resolve([])})}),
 };
 const dbModule={db,serviceRequests:{id:'serviceRequests',archivedAt:'archived_at'},clients:{id:'clients'},clientAddresses:{id:'clientAddresses'},officialDocuments:{id:'officialDocuments'},documentTemplates:{id:'documentTemplates'},proposals:{id:'proposals'},auditEvents:{id:'auditEvents'},DOC_STATUS:{EMITIDO:'EMITIDO'}};
 const auth={requireLocalPermission:async()=>({access:{id:'user-1'}})};
 const template={selectSofiaDocumentTemplate:async()=>({id:'tpl-1',version:'V1',docType:'ORCAMENTO_TECNICO',sourceSha256:'sha',sourcePdfBase64:'pdf',fieldSchema:{fields:[]}})};
 const renderer={renderRegisteredTemplate:async()=>{registered.count++;return {ok:true,html:'<html>modelo registrado</html>',pages:1,bytes:10,fieldSchemaSnapshot:[],fieldValuesSnapshot:{}}}};
 const route=harness({'@/db':dbModule,'../../../../db':dbModule,'next/server':nr,'@/lib/require-local-permission':auth,'../../../../lib/require-local-permission':auth,'@/lib/sofia-document-template':template,'../../../../lib/sofia-document-template':template,'@/lib/documents/registered-template':renderer,'../../../../lib/documents/registered-template':renderer,'../../../../lib/documents/money-to-words':{moneyToWords:()=>'Quatrocentos reais'}})('src/app/api/documents/emit/route.ts');
 return {route,inserts};
}
test('legacy request-bound route refuses direct issuance without the transactional, server-bound draft and lead recipient context',async()=>{
 const registered={count:0};
 const {route,inserts}=build(registered);
 const res=await route.POST({json:async()=>({serviceRequestId:'req-1',docType:'ORCAMENTO_TECNICO',amount:'400,00',paymentMethod:'Pix'})});
 assert.equal(res.status,422);
 assert.equal(registered.count,0,'legacy route cannot emit outside the transactional issuer');
 assert.equal(inserts.length,0,'legacy route cannot persist a partial document');
 assert.equal(res.body.error,'Informe os cinco dados mínimos do documento.');
});
test('the transactional Sofia issuer, not the legacy request-bound route, renders the registered model',async()=>{
 const legacy=require('node:fs').readFileSync(require('node:path').join(__dirname,'../../src/app/api/documents/emit/route.ts'),'utf8');
 const issuer=require('node:fs').readFileSync(require('node:path').join(__dirname,'../../src/lib/sofia-issue-draft.ts'),'utf8');
 assert.match(legacy,/Use o fluxo autorizado de rascunhos da Sofia/);
 assert.match(issuer,/renderRegisteredTemplate\(selected/);
 assert.match(issuer,/tx\.insert\(officialDocuments\)/);
 assert.match(issuer,/tx\.insert\(sofiaEvents\)/);
});
