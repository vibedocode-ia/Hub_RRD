import { and, eq, isNull, or, sql } from 'drizzle-orm'
import { auditEvents, db, DOC_STATUS, officialDocuments, serviceRequests } from '@/db'

const hasActiveRequest = sql`exists (select 1 from ${serviceRequests} where ${serviceRequests.id} = ${officialDocuments.serviceRequestId} and ${serviceRequests.archivedAt} is null)`
const eligibleDocument = or(isNull(officialDocuments.serviceRequestId), hasActiveRequest)

type ArchiveResult =
  | { ok: true; document: { id: string; docNumber: string; status: string } }
  | { ok: false; status: number; error: string }

type SupersedeInput = { docType: string; docNumber: string; totalValue: string; amountInWords: string; paymentMethod: string; hasWarranty: boolean; warrantyDays: number | null; documentPayloadSnapshot: Record<string, unknown>; htmlSnapshot: string; createdById: string }
type SupersedeResult = { ok: true; document: { id: string; docNumber: string; status: string; supersedesDocumentId: string | null } } | { ok: false; status: number; error: string }

/** Create a replacement as a new immutable record; original and attachments remain intact. */
export async function supersedeOfficialDocument(documentId: string, actorUserId: string, replacement: SupersedeInput): Promise<SupersedeResult> {
  if (!db) return { ok: false, status: 503, error: 'Banco de dados indisponível.' }
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(documentId)) return { ok: false, status: 422, error: 'Documento inválido.' }
  return db.transaction(async tx => {
    const [original] = await tx.select().from(officialDocuments).where(eq(officialDocuments.id, documentId)).for('update').limit(1)
    if (!original || original.status === DOC_STATUS.ARQUIVADO) return { ok: false as const, status: 404, error: 'Documento original não disponível para revisão.' }
    if (replacement.docType !== original.docType) return { ok: false as const, status: 422, error: 'A revisão deve preservar o tipo do documento.' }
    const [created] = await tx.insert(officialDocuments).values({
      docType: original.docType, docNumber: replacement.docNumber,
      leadId: original.leadId, clientId: original.clientId, serviceRequestId: original.serviceRequestId,
      supersedesDocumentId: original.id, templateVersion: original.templateVersion,
      totalValue: replacement.totalValue, amountInWords: replacement.amountInWords,
      paymentMethod: replacement.paymentMethod, hasWarranty: replacement.hasWarranty, warrantyDays: replacement.warrantyDays,
      documentPayloadSnapshot: replacement.documentPayloadSnapshot, htmlSnapshot: replacement.htmlSnapshot,
      status: DOC_STATUS.EMITIDO, issuedAt: new Date(), createdById: replacement.createdById,
    }).returning({ id: officialDocuments.id, docNumber: officialDocuments.docNumber, status: officialDocuments.status, supersedesDocumentId: officialDocuments.supersedesDocumentId })
    await tx.insert(auditEvents).values({ actorUserId, action: 'document.superseded', targetType: 'official_document', targetId: created.id, metadata: { supersedesDocumentId: original.id } })
    return { ok: true as const, document: created }
  })
}

/** Archive is a lifecycle transition only; the frozen payload and PDF are never rewritten or deleted. */
export async function archiveOfficialDocument(documentId: string, actorUserId: string, idempotencyKey: string): Promise<ArchiveResult> {
  if (!db) return { ok: false, status: 503, error: 'Banco de dados indisponível.' }
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(documentId)) return { ok: false, status: 422, error: 'Documento inválido.' }
  return db.transaction(async tx => {
    const [document] = await tx.select({ id: officialDocuments.id, docNumber: officialDocuments.docNumber, status: officialDocuments.status })
      .from(officialDocuments).where(and(eq(officialDocuments.id, documentId), eligibleDocument)).for('update').limit(1)
    if (!document) return { ok: false as const, status: 404, error: 'Documento não encontrado ou chamado arquivado.' }
    if (document.status === DOC_STATUS.ARQUIVADO) return { ok: true as const, document }
    const [updated] = await tx.update(officialDocuments).set({ status: DOC_STATUS.ARQUIVADO, updatedAt: new Date() })
      .where(and(eq(officialDocuments.id, documentId), eligibleDocument, eq(officialDocuments.status, document.status)))
      .returning({ id: officialDocuments.id, docNumber: officialDocuments.docNumber, status: officialDocuments.status })
    if (!updated) return { ok: false as const, status: 409, error: 'Documento mudou durante o arquivamento; tente novamente.' }
    await tx.insert(auditEvents).values({ actorUserId, action: 'document.archived', targetType: 'official_document', targetId: documentId, metadata: { actorUserId, idempotencyKey } })
    return { ok: true as const, document: updated }
  })
}
