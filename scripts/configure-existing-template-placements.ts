import { readFile, mkdir, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { isDeepStrictEqual } from 'node:util'
import { and,eq } from 'drizzle-orm'
import { db,documentTemplates,auditEvents } from '../src/db'
import { normalizeTemplateFields } from '../src/lib/document-template-contract'

async function main(){
 if(!db) throw new Error('Banco indisponível.')
 const mapping = JSON.parse(await readFile(new URL('./existing-template-placements.json',import.meta.url),'utf8')) as Record<string,unknown>
 const candidates: Array<{row: typeof documentTemplates.$inferSelect; fields: ReturnType<typeof normalizeTemplateFields>}> = []
 for(const [version,fields] of Object.entries(mapping)){
  const parsed=normalizeTemplateFields(fields)
  const rows=await db.select().from(documentTemplates).where(and(eq(documentTemplates.version,version),eq(documentTemplates.isActive,true)))
  if(rows.length!==1) throw new Error('Cada versão deve corresponder a um único modelo ativo.')
  const row=rows[0]
  const sha=createHash('sha256').update(Buffer.from(row.sourcePdfBase64,'base64')).digest('hex')
  if(sha!==row.sourceSha256) throw new Error('A integridade da fonte não foi confirmada.')
  const original=normalizeTemplateFields(row.fieldSchema)
  for(const field of original){
   const next=parsed.find(item=>item.key===field.key)
   if(!next||next.type!==field.type||next.label!==field.label||next.required!==field.required||next.defaultValue!==field.defaultValue) throw new Error('Configuração não preserva contrato original dos campos.')
  }
  candidates.push({row,fields:parsed})
 }
 if(!process.argv.includes('--apply')) {console.log(JSON.stringify({verified:true,models:candidates.length,applied:false}));return}
 const directory='/root/.hermes/security-backups'
 await mkdir(directory,{recursive:true,mode:0o700})
 const backup=`${directory}/rrd-template-mapping-${new Date().toISOString().replace(/[:.]/g,'-')}.json`
 await writeFile(backup,JSON.stringify(candidates.map(({row})=>({id:row.id,version:row.version,sourceSha256:row.sourceSha256,fieldSchema:row.fieldSchema,updatedAt:row.updatedAt}))),{mode:0o600,flag:'wx'})
 await db.transaction(async tx=>{
  for(const {row,fields} of candidates){
   const [fresh]=await tx.select().from(documentTemplates).where(eq(documentTemplates.id,row.id)).for('update')
   if(!fresh||fresh.sourceSha256!==row.sourceSha256||!isDeepStrictEqual(fresh.fieldSchema,row.fieldSchema))throw new Error('Modelo foi modificado durante a configuração.')
   await tx.update(documentTemplates).set({fieldSchema:fields,updatedAt:new Date()}).where(eq(documentTemplates.id,row.id))
   await tx.insert(auditEvents).values({action:'document_template.mapped_existing_source',targetType:'document_template',targetId:row.id,metadata:{sourceSha256:row.sourceSha256,version:row.version,fields:fields.length}})
  }
 })
 for(const {row,fields} of candidates){
  const [fresh]=await db.select().from(documentTemplates).where(eq(documentTemplates.id,row.id))
  if(!isDeepStrictEqual(fresh.fieldSchema,fields)||fresh.sourceSha256!==row.sourceSha256||fresh.sourcePdfBase64!==row.sourcePdfBase64)throw new Error('Readback de modelo divergiu.')
 }
 console.log(JSON.stringify({verified:true,models:candidates.length,applied:true,backup}))
}
main().then(()=>process.exit(0)).catch((error)=>{ const message = error instanceof Error && /^(Banco indisponível|Cada versão|A integridade|Configuração não preserva|Modelo foi modificado|Readback de modelo)/.test(error.message) ? error.message : `${error?.name || 'Erro'} ${error?.code || error?.cause?.code || ''}`; console.error('Configuração não concluída: '+message);process.exit(1)})
