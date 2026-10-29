import { eq, inArray, sql } from 'drizzle-orm'
import { db, attachments, auditEvents, officialDocuments } from '@/db'

export type DocumentPurgeCounts = { attachments: number }

/** Quantos anexos estão presos a este documento. */
export async function documentPurgeCounts(documentId: string): Promise<DocumentPurgeCounts> {
  if (!db) throw new Error('Banco de dados não disponível')
  const rows = await db.select({ count: sql<number>`count(*)::int` }).from(attachments).where(eq(attachments.documentId, documentId))
  return { attachments: rows[0]?.count ?? 0 }
}

/**
 * Exclusão definitiva do documento emitido.
 *
 * Ordem por causa das FKs: anexos -> solta referências de supersessão -> documento.
 * O snapshot e o PDF deixam de existir; o evento fica registrado em audit_events.
 */
export async function purgeDocumentRecord(
  documentId: string,
  options: { actorUserId?: string | null; reason?: string } = {},
): Promise<{ document: number; attachments: number }> {
  if (!db) throw new Error('Banco de dados não disponível')
  return db.transaction(async tx => {
    const removed = await tx.delete(attachments).where(eq(attachments.documentId, documentId)).returning({ id: attachments.id })

    // Documentos que declaram substituir este precisam soltar a referência (FK RESTRICT).
    const superseding = await tx.select({ id: officialDocuments.id }).from(officialDocuments).where(eq(officialDocuments.supersedesDocumentId, documentId))
    if (superseding.length) {
      await tx.update(officialDocuments).set({ supersedesDocumentId: null }).where(inArray(officialDocuments.id, superseding.map(row => row.id)))
    }

    const [deleted] = await tx.delete(officialDocuments).where(eq(officialDocuments.id, documentId)).returning({ id: officialDocuments.id })

    const removedCount = deleted ? 1 : 0
    await tx.insert(auditEvents).values({
      actorUserId: options.actorUserId ?? null,
      action: 'document.purged',
      targetType: 'official_document',
      targetId: documentId,
      metadata: { document: removedCount, attachments: removed.length, superseding: superseding.length, reason: options.reason ?? null },
    })
    return { document: removedCount, attachments: removed.length }
  })
}
