import { createHash } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { and, eq, isNull, or, sql } from 'drizzle-orm'
import { attachments, auditEvents, db, DOC_STATUS, documentTemplates, officialDocuments, serviceRequests } from '@/db'
import { requireLocalPermission } from '@/lib/require-local-permission'
import { renderOfficialPdf } from '@/lib/official-pdf-render'

export const runtime = 'nodejs'
export const maxDuration = 30
type Params = { params: Promise<{ id: string }> }
const hash = (value: string | Buffer) => createHash('sha256').update(value).digest('hex')
const eligibleRequest = or(isNull(officialDocuments.serviceRequestId), sql`exists (select 1 from ${serviceRequests} where ${serviceRequests.id} = ${officialDocuments.serviceRequestId} and ${serviceRequests.archivedAt} is null)`)
const generator = 'rrd-frozen-html-chromium-v1'
class PdfError extends Error { constructor(public status: number, message: string, public code?: string) { super(message) } }
function verifyAttachment(attachment: typeof attachments.$inferSelect, document: typeof officialDocuments.$inferSelect) {
  const metadata = attachment.metadata as Record<string, unknown> | null
  const payload = document.documentPayloadSnapshot as Record<string, unknown>
  if (!metadata || metadata.generator !== generator) throw new PdfError(409, 'PDF legado existente; geração automática não substitui nem reclassifica anexos.')
  const bytes = Buffer.from(String(metadata.base64 ?? ''), 'base64')
  if (attachment.mimeType !== 'application/pdf' || metadata.documentId !== document.id || metadata.htmlSha256 !== hash(document.htmlSnapshot ?? '') || metadata.templateSourceSha256 !== payload.templateSourceSha256 || metadata.sha256 !== hash(bytes) || !bytes.subarray(0, 5).equals(Buffer.from('%PDF-'))) throw new PdfError(409, 'Integridade ou origem do PDF não confirmada.')
  return { metadata, bytes }
}
async function handle(req: NextRequest, params: Params, generate: boolean) {
  const authorized = await requireLocalPermission(generate ? 'documents.issue' : 'documents.read')
  if (!authorized) return NextResponse.json({ error: 'Permissão insuficiente.' }, { status: 403 })
  if (!db) return NextResponse.json({ error: 'Banco de dados indisponível.' }, { status: 503 })
  const { id } = await params.params
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) return NextResponse.json({ error: 'Documento inválido.' }, { status: 422 })
  if (generate && req.body !== null) return NextResponse.json({ error: 'Este endpoint não aceita HTML, URL, PDF ou parâmetros do cliente.' }, { status: 422 })
  try {
    const result = await db.transaction(async tx => {
      // The lock serializes generation and freezes eligibility through persistence.
      const [document] = await tx.select().from(officialDocuments).where(and(eq(officialDocuments.id, id), eligibleRequest)).for('update').limit(1)
      if (!document || document.status === DOC_STATUS.ARQUIVADO) throw new PdfError(404, 'Documento não encontrado ou arquivado.')
      const [existing] = await tx.select().from(attachments).where(and(eq(attachments.documentId, id), eq(attachments.fileType, 'OFFICIAL_DOCUMENT_PDF'))).limit(1)
      if (existing) {
        const verified = verifyAttachment(existing, document)
        return { attachmentId: existing.id, ...verified, alreadyAttached: true }
      }
      if (!generate) throw new PdfError(404, 'PDF automático ainda não gerado.', 'PDF_NOT_GENERATED')
      if (document.status !== DOC_STATUS.EMITIDO || document.pdfStoragePath) throw new PdfError(409, 'Documento não elegível para geração automática.')
      const payload = document.documentPayloadSnapshot as Record<string, unknown>
      if (typeof payload.templateId !== 'string' || !/^[0-9a-f-]{36}$/i.test(payload.templateId) || !/^[0-9a-f]{64}$/.test(String(payload.templateSourceSha256))) throw new PdfError(422, 'Snapshot sem origem canônica comprovada.')
      const [template] = await tx.select().from(documentTemplates).where(eq(documentTemplates.id, payload.templateId)).limit(1)
      if (!template || template.sourceSha256 !== payload.templateSourceSha256 || hash(Buffer.from(template.sourcePdfBase64, 'base64')) !== template.sourceSha256) throw new PdfError(409, 'Integridade do modelo canônico não confirmada.')
      if (!document.htmlSnapshot) throw new PdfError(422, 'Snapshot congelado indisponível.')
      const bytes = await renderOfficialPdf(document.htmlSnapshot)
      const metadata = { generator, documentId: id, filename: `documento-${id}.pdf`, sha256: hash(bytes), htmlSha256: hash(document.htmlSnapshot), templateId: template.id, templateSourceSha256: template.sourceSha256, base64: bytes.toString('base64') }
      const storagePath = `/api/documents/${id}/pdf`
      const [created] = await tx.insert(attachments).values({ documentId: id, serviceRequestId: document.serviceRequestId, fileType: 'OFFICIAL_DOCUMENT_PDF', storagePath, fileSize: bytes.length, mimeType: 'application/pdf', metadata }).returning({ id: attachments.id })
      await tx.update(officialDocuments).set({ pdfStoragePath: storagePath, updatedAt: new Date() }).where(eq(officialDocuments.id, id))
      await tx.insert(auditEvents).values({ actorUserId: authorized.access.id, action: 'document.pdf_generated', targetType: 'official_document', targetId: id, metadata: { generator, attachmentId: created.id, sha256: metadata.sha256, htmlSha256: metadata.htmlSha256, templateSourceSha256: template.sourceSha256, bytes: bytes.length } })
      return { attachmentId: created.id, metadata, bytes, alreadyAttached: false }
    })
    if (!generate) return new NextResponse(new Uint8Array(result.bytes), { headers: { 'content-type': 'application/pdf', 'content-disposition': `attachment; filename="documento-${id}.pdf"`, 'cache-control': 'private, no-store', 'x-content-type-options': 'nosniff', 'x-pdf-sha256': String(result.metadata.sha256) } })
    return NextResponse.json({ success: true, attachmentId: result.attachmentId, alreadyAttached: result.alreadyAttached, sha256: result.metadata.sha256, htmlSha256: result.metadata.htmlSha256, templateSourceSha256: result.metadata.templateSourceSha256, storagePath: `/api/documents/${id}/pdf` }, { status: result.alreadyAttached ? 200 : 201 })
  } catch (error) {
    if (error instanceof PdfError) return NextResponse.json({ error: error.message, ...(error.code ? { code: error.code } : {}) }, { status: error.status })
    const unsafe = error instanceof Error && /^PDF_(SNAPSHOT|PAGE|OUTPUT)/.test(error.message)
    return NextResponse.json({ error: unsafe ? 'Snapshot ou PDF fora da política segura.' : 'Runtime PDF seguro indisponível; nenhuma alteração persistida.' }, { status: unsafe ? 422 : 503 })
  }
}
export async function POST(req: NextRequest, params: Params) { return handle(req, params, true) }
export async function GET(req: NextRequest, params: Params) { return handle(req, params, false) }
