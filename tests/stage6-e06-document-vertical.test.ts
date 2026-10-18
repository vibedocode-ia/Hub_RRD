import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash, randomUUID } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import postgres from 'postgres'
import { execFileSync } from 'node:child_process'
import { build } from 'esbuild'
import { chromium } from 'playwright-core'
import { createRequire } from 'node:module'
const url=process.env.RRD_DOCUMENT_TEST_DATABASE_URL
if (!url || !/^postgres:\/\/postgres@127\.0\.0\.1:\d+\/rrd_document_test$/.test(url)) throw new Error('Disposable database required')
process.env.POSTGRES_RRD_URL=url; process.env.DATABASE_URL=url
const minimalPdf = (() => {
  const objects = ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R] /Count 1 >>', '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << >> /Contents 4 0 R >>', '<< /Length 0 >>\nstream\nendstream']
  let body = '%PDF-1.4\n'
  const offsets = [0]
  objects.forEach((obj, index) => { offsets.push(body.length); body += `${index + 1} 0 obj\n${obj}\nendobj\n` })
  const start = body.length
  body += `xref\n0 5\n0000000000 65535 f \n${offsets.slice(1).map(n => `${String(n).padStart(10, '0')} 00000 n \n`).join('')}trailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n${start}\n%%EOF\n`
  return Buffer.from(body).toString('base64')
})()


test('POST real Central: create, update, reconfirm, canonical issue, readback, PDF and replay ownership', async()=>{
 const sql=postgres(url!,{max:1}); let conn:any
 try {
  await sql.unsafe('DROP SCHEMA public CASCADE; DROP SCHEMA IF EXISTS drizzle CASCADE; CREATE SCHEMA public')
  execFileSync('npx',['drizzle-kit','migrate'],{env:process.env,stdio:'pipe'})
  await sql.unsafe(readFileSync('docs/migrations/stage6-e06-central-document-authorship.sql','utf8'))
  const database=await import('../src/db'); conn=database.conn
  const {db, documentTemplates, leads}=database
  const hub=randomUUID(),grant=randomUUID(),senderPhone='+5521999999901'
  process.env.RRD_HUB_ID=hub; process.env.SOFIA_HUB_SECRET='disposable-ordinary';process.env.SOFIA_RRD_CENTRAL_SECRET='disposable-central'
  const envelope={centralHubId:hub,centralGrantId:grant,centralRole:'god_admin',senderPhone}
  const bundle=await build({entryPoints:['src/app/api/sofia/actions/route.ts'],bundle:true,write:false,platform:'node',format:'cjs',packages:'external',logLevel:'silent',define:{'import.meta.url':JSON.stringify(import.meta.url)}})
  const mod={exports:{} as any}; new Function('require','module','exports',bundle.outputFiles[0].text)(createRequire(import.meta.url),mod,mod.exports)
  const call=async(action:string,fields:any={},key=randomUUID(),identity:any={},token=process.env.SOFIA_RRD_CENTRAL_SECRET)=>{
   const response=await mod.exports.POST(new Request('http://localhost/api/sofia/actions',{method:'POST',headers:{authorization:'Bearer '+token,'idempotency-key':key,'content-type':'application/json'},body:JSON.stringify({...envelope,...identity,action,conversationSummary:'Confirmação documental explícita de teste',...fields})}))
   return {status:response.status,body:await response.json()}
  }
  const [template]=await db.insert(documentTemplates).values({slug:'e06-vertical',name:'E06',docType:'ORCAMENTO',version:'V1',fieldSchema:[{key:'contractorName',label:'Cliente',type:'text',required:true,placements:[{page:0,x:0.1,y:0.1,width:0.7,height:0.08}]},{key:'totalAmount',label:'Valor',type:'text',required:true,placements:[{page:0,x:0.1,y:0.2,width:0.7,height:0.08}]}],sourcePdfBase64:minimalPdf,sourceFilename:'test.pdf',sourceSha256:createHash('sha256').update(Buffer.from(minimalPdf,'base64')).digest('hex')}).returning()
  const [lead]=await db.insert(leads).values({name:'Ana Exemplo',phone:'5521999999902',normalizedPhone:'5521999999902',document:'52998224725',normalizedDocument:'52998224725'}).returning()
  const consent=Object.fromEntries(['customer.phone','address.street','address.number','address.neighborhood','address.city','address.complement','address.referencePoint','service.paymentMethod','service.priority'].map(k=>[k,'Não informado']))
  const createKey=randomUUID()
  let result=await call('create_service_draft',{leadId:lead.id,customerName:lead.name,customerDocument:'52998224725',amount:'350,50',documentDate:'2026-10-15',problemReported:'Limpeza da caixa',optionalFieldConsent:consent,templateId:template.id},createKey)
  assert.equal(result.status,201,JSON.stringify(result));const draftId=result.body.draftId;const oldReview=result.body.review.reviewVersion
  assert.equal((await call('create_service_draft',{},createKey,{centralGrantId:randomUUID()})).status,409)
  assert.equal((await call('update_service_draft',{draftId,amount:'400'},randomUUID(),{centralGrantId:randomUUID()})).status,409)
  assert.equal((await call('update_service_draft',{draftId},randomUUID(),{centralHubId:randomUUID()})).status,403)
  assert.equal((await call('update_service_draft',{draftId},randomUUID(),{senderPhone:'+5521999999903'})).status,409)
  const updateKey=randomUUID();result=await call('update_service_draft',{draftId,amount:'400'},updateKey)
  assert.equal(result.status,200,JSON.stringify(result)); const reviewVersion=result.body.review.reviewVersion; assert.notEqual(reviewVersion,oldReview)
  assert.equal((await call('update_service_draft',{draftId,amount:'400'},updateKey,{centralGrantId:randomUUID()})).status,409)
  assert.equal((await call('issue_service_draft',{draftId,reviewVersion:oldReview,confirmed:true})).status,409)
  assert.equal((await call('issue_service_draft',{draftId,reviewVersion})).status,403)
  assert.equal((await call('issue_service_draft',{draftId,reviewVersion,confirmed:true,amount:'1'})).status,422)
  const issueKey=randomUUID();result=await call('issue_service_draft',{draftId,reviewVersion,confirmed:true},issueKey)
  assert.equal(result.status,201,JSON.stringify(result)); const documentId=result.body.documentId
  const [doc]=await sql`SELECT * FROM official_documents WHERE id=${documentId}`
  const [draft]=await sql`SELECT * FROM sofia_drafts WHERE id=${draftId}`
  assert.equal(doc.total_value,'400.00');assert.equal(doc.created_by_id,null);assert.equal(doc.external_author.grantId,grant);assert.equal(doc.html_snapshot,result.body.htmlSnapshot)
  assert.equal(draft.status,'CONVERTED');assert.equal(draft.reviewed_by_id,null);assert.equal(draft.central_contact_id,null);assert.equal(draft.central_client_id,null)
  const [proposal]=await sql`SELECT * FROM lead_proposals WHERE official_document_id=${documentId}`; assert.deepEqual(proposal.external_author,doc.external_author);assert.equal(proposal.created_by_id,null)
  const audits=await sql`SELECT * FROM audit_events WHERE target_id=${draftId}`; assert.equal(audits.length,1);assert.equal(audits[0].actor_user_id,null);assert.deepEqual(audits[0].metadata.externalAuthor,doc.external_author)
  assert.equal((await sql`SELECT * FROM users`).length,0)
  result=await call('issue_service_draft',{draftId,reviewVersion,confirmed:true},issueKey);assert.equal(result.status,200,JSON.stringify(result));assert.equal(result.body.documentId,documentId)
  assert.equal((await call('issue_service_draft',{draftId,reviewVersion,confirmed:true},issueKey,{centralGrantId:randomUUID()})).status,409)
  assert.equal((await call('update_service_draft',{draftId,amount:'999'})).status,409)
  assert.deepEqual((await sql`SELECT * FROM official_documents WHERE id=${documentId}`)[0],doc)
  assert.match(doc.html_snapshot,/data:image\/png;base64/)
  assert.match(doc.html_snapshot,/Ana Exemplo/)
  assert.match(doc.html_snapshot,/400,00/)
  writeFileSync('/root/.hermes/cache/scratch/e06-issued.html',doc.html_snapshot)
  const browser=await chromium.launch({executablePath:process.env.CHROME_BIN || '/usr/bin/google-chrome',headless:true,args:['--no-sandbox']})
  try {
   const page=await browser.newPage();await page.setContent(doc.html_snapshot,{waitUntil:'load'});await page.evaluate(()=>document.fonts.ready)
   const pdf=await page.pdf({path:'/root/.hermes/cache/scratch/e06-issued.pdf',format:'A4',printBackground:true,preferCSSPageSize:true})
   assert.equal(pdf.subarray(0,5).toString(),'%PDF-');assert.ok(pdf.length>1000)
   const pdfjs=await import('pdfjs-dist/legacy/build/pdf.mjs');const parsed=await pdfjs.getDocument({data:new Uint8Array(pdf)}).promise
   assert.equal(parsed.numPages,1);const content=await (await parsed.getPage(1)).getTextContent();const text=content.items.map((v:any)=>v.str || '').join(' ');assert.match(text,/Ana Exemplo/);assert.match(text,/400,00/);await parsed.destroy()
   console.log('Final PDF PASS:',pdf.length,'bytes; 1 page; customer and amount extracted')
  } finally {await browser.close()}

  console.log('Canonical renderer PASS; HTML snapshot bytes',Buffer.byteLength(doc.html_snapshot),'document',documentId)
 } finally {await conn?.end(); await sql.end()}
})
