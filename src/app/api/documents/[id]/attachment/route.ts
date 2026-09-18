import { createHash } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { and, eq, isNull } from 'drizzle-orm'
import { attachments, auditEvents, db, DOC_STATUS, officialDocuments, serviceRequests } from '@/db'
import { requireLocalPermission } from '@/lib/require-local-permission'

type Params = { params: Promise<{ id: string }> }
const MAX_BYTES = 10 * 1024 * 1024
const OFFICIAL_PDF = 'OFFICIAL_DOCUMENT_PDF'

type PdfMetadata = { base64?: string; filename?: string; sha256?: string }

export async function POST(req: NextRequest, { params }: Params) {
  const authorized = await requireLocalPermission('documents.send')
  if (!authorized) return NextResponse.json({ error: 'Permissão insuficiente para anexar PDF.' }, { status: 403 })
  if (!db) return NextResponse.json({ error: 'Banco de dados indisponível.' }, { status: 503 })
  const { id } = await params
  const form = await req.formData().catch(() => null); const file = form?.get('file')
  if (!(file instanceof File) || file.type !== 'application/pdf' || file.size < 5 || file.size > MAX_BYTES) return NextResponse.json({ error: 'Envie um PDF válido de até 10 MB.' }, { status: 422 })
  const bytes = Buffer.from(await file.arrayBuffer())
  if (!bytes.subarray(0, 5).equals(Buffer.from('%PDF-'))) return NextResponse.json({ error: 'PDF inválido.' }, { status: 422 })
  const sha256 = createHash('sha256').update(bytes).digest('hex')
  const filename = file.name.replace(/[^a-zA-Z0-9._ -]/g, '_').slice(0, 160) || 'documento-oficial.pdf'

  try {
    const result = await db.transaction(async tx => {
      const [document] = await tx.select({ id: officialDocuments.id, serviceRequestId: officialDocuments.serviceRequestId, status: officialDocuments.status, pdfStoragePath: officialDocuments.pdfStoragePath }).from(officialDocuments).innerJoin(serviceRequests, eq(officialDocuments.serviceRequestId, serviceRequests.id)).where(and(eq(officialDocuments.id, id), isNull(serviceRequests.archivedAt))).limit(1)
      if (!document) return { error: 'Documento não encontrado ou chamado arquivado.', status: 404 }
      if (document.status !== DOC_STATUS.EMITIDO) return { error: 'Somente um documento emitido e ainda não entregue pode receber seu PDF oficial.', status: 409 }
      const [existing] = await tx.select({ id: attachments.id, metadata: attachments.metadata }).from(attachments).where(and(eq(attachments.documentId, id), eq(attachments.fileType, OFFICIAL_PDF))).limit(1)
      if (existing) {
        const metadata = existing.metadata as PdfMetadata | null
        return metadata?.sha256 === sha256
          ? { attachmentId: existing.id, storagePath: document.pdfStoragePath, sha256, alreadyAttached: true }
          : { error: 'O PDF oficial já foi anexado e não pode ser substituído.', status: 409 }
      }
      const storagePath = `/api/documents/${id}/attachment`
      const [created] = await tx.insert(attachments).values({ documentId: id, serviceRequestId: document.serviceRequestId, fileType: OFFICIAL_PDF, storagePath, fileSize: bytes.length, mimeType: 'application/pdf', metadata: { filename, sha256, base64: bytes.toString('base64') } }).returning()
      const [linked] = await tx.update(officialDocuments).set({ pdfStoragePath: storagePath, updatedAt: new Date() }).where(and(eq(officialDocuments.id, id), eq(officialDocuments.status, DOC_STATUS.EMITIDO), isNull(officialDocuments.pdfStoragePath))).returning({ id: officialDocuments.id })
      if (!linked) throw new Error('PDF_ALREADY_LINKED')
      await tx.insert(auditEvents).values({ actorUserId: authorized.access.id, action: 'document.pdf_attached', targetType: 'official_document', targetId: id, metadata: { attachmentId: created.id, sha256, bytes: bytes.length } })
      return { attachmentId: created.id, storagePath, sha256, alreadyAttached: false }
    })
    if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status })
    return NextResponse.json({ success: true, ...result }, { status: result.alreadyAttached ? 200 : 201 })
  } catch (error) {
    const message = error instanceof Error && error.message === 'PDF_ALREADY_LINKED' ? 'O PDF oficial já foi vinculado e não pode ser alterado.' : 'Não foi possível anexar o PDF oficial.'
    return NextResponse.json({ error: message }, { status: 409 })
  }
}

export async function GET(_req: NextRequest, { params }: Params) {
  const authorized = await requireLocalPermission('documents.read')
  if (!authorized) return NextResponse.json({ error: 'Permissão insuficiente para acessar PDF.' }, { status: 403 })
  if (!db) return NextResponse.json({ error: 'Banco de dados indisponível.' }, { status: 503 })
  const { id } = await params
  const [attachment] = await db.select().from(attachments).where(and(eq(attachments.documentId, id), eq(attachments.fileType, OFFICIAL_PDF))).limit(1)
  const metadata = attachment?.metadata as PdfMetadata | null
  if (!attachment || attachment.mimeType !== 'application/pdf' || !metadata?.base64 || !metadata.sha256) return NextResponse.json({ error: 'PDF oficial não anexado.' }, { status: 404 })
  const bytes = Buffer.from(metadata.base64, 'base64')
  if (createHash('sha256').update(bytes).digest('hex') !== metadata.sha256) return NextResponse.json({ error: 'Integridade do PDF não confirmada.' }, { status: 409 })
  return new NextResponse(bytes, { headers: { 'content-type': 'application/pdf', 'content-disposition': `attachment; filename="${metadata.filename || 'documento-oficial.pdf'}"`, 'cache-control': 'private, no-store' } })
}
