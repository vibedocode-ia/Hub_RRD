import { createHash } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { and, eq, isNull } from 'drizzle-orm'
import { attachments, auditEvents, db, DOC_STATUS, officialDocuments, serviceRequests } from '@/db'
import { requireLocalPermission } from '@/lib/require-local-permission'

type Params = { params: Promise<{ id: string }> }
type PdfMetadata = { base64?: string; sha256?: string }
const OFFICIAL_PDF = 'OFFICIAL_DOCUMENT_PDF'

export async function POST(_req: NextRequest, { params }: Params) {
  const authorized = await requireLocalPermission('documents.send')
  if (!authorized) return NextResponse.json({ error: 'Permissão insuficiente para entregar documentos.' }, { status: 403 })
  if (!db) return NextResponse.json({ error: 'Banco de dados indisponível.' }, { status: 503 })
  const { id } = await params
  const [document] = await db.select().from(officialDocuments).innerJoin(serviceRequests, eq(officialDocuments.serviceRequestId, serviceRequests.id)).where(and(eq(officialDocuments.id, id), eq(officialDocuments.status, DOC_STATUS.EMITIDO), isNull(serviceRequests.archivedAt))).limit(1)
  if (!document) return NextResponse.json({ error: 'Documento emitido não encontrado ou chamado arquivado.' }, { status: 404 })
  const [attachment] = await db.select().from(attachments).where(and(eq(attachments.documentId, id), eq(attachments.fileType, OFFICIAL_PDF), eq(attachments.mimeType, 'application/pdf'), eq(attachments.storagePath, document.official_documents.pdfStoragePath || ''))).limit(1)
  const metadata = attachment?.metadata as PdfMetadata | null
  const bytes = metadata?.base64 ? Buffer.from(metadata.base64, 'base64') : null
  if (!attachment || !bytes || !metadata?.sha256 || createHash('sha256').update(bytes).digest('hex') !== metadata.sha256) return NextResponse.json({ error: 'O PDF oficial íntegro ainda não foi anexado; a entrega não pode ser confirmada.' }, { status: 409 })
  const [updated] = await db.update(officialDocuments).set({ status: DOC_STATUS.ENVIADO, sentAt: new Date(), updatedAt: new Date() }).where(and(eq(officialDocuments.id, id), eq(officialDocuments.status, DOC_STATUS.EMITIDO), eq(officialDocuments.pdfStoragePath, attachment.storagePath))).returning({ id: officialDocuments.id })
  if (!updated) return NextResponse.json({ error: 'Documento não está disponível para entrega.' }, { status: 409 })
  await db.insert(auditEvents).values({ actorUserId: authorized.access.id, action: 'document.delivery_confirmed', targetType: 'official_document', targetId: id, metadata: { attachmentId: attachment.id, sha256: metadata.sha256 } })
  return NextResponse.json({ success: true, documentId: id, status: DOC_STATUS.ENVIADO, attachmentId: attachment.id })
}
