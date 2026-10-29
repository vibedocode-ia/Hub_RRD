import { eq, inArray, sql } from 'drizzle-orm'
import { db, attachments, auditEvents, clients, officialDocuments, proposals, serviceRequests, sofiaDrafts, sofiaEvents } from '@/db'

export type ClientPurgeCounts = {
  documents: number
  serviceRequests: number
  proposals: number
  attachments: number
}

export type ClientPurgeRemoved = ClientPurgeCounts & { client: number }

/** Quanto histórico está preso a este cliente. Usado para bloquear exclusão sem confirmação. */
export async function clientPurgeCounts(clientId: string): Promise<ClientPurgeCounts> {
  if (!db) throw new Error('Banco de dados não disponível')
  const [documents, requests, proposalRows, attachmentRows] = await Promise.all([
    db.select({ count: sql<number>`count(*)::int` }).from(officialDocuments).where(eq(officialDocuments.clientId, clientId)),
    db.select({ count: sql<number>`count(*)::int` }).from(serviceRequests).where(eq(serviceRequests.clientId, clientId)),
    db.select({ count: sql<number>`count(*)::int` }).from(proposals).where(eq(proposals.clientId, clientId)),
    db.select({ count: sql<number>`count(*)::int` }).from(attachments).where(eq(attachments.clientId, clientId)),
  ])
  return {
    documents: documents[0]?.count ?? 0,
    serviceRequests: requests[0]?.count ?? 0,
    proposals: proposalRows[0]?.count ?? 0,
    attachments: attachmentRows[0]?.count ?? 0,
  }
}

export function clientPurgeHasHistory(counts: ClientPurgeCounts) {
  return counts.documents + counts.serviceRequests + counts.proposals + counts.attachments > 0
}

/**
 * Exclusão definitiva do cliente e de tudo que pertence a ele no Hub.
 *
 * Ordem obrigatória por causa das FKs:
 * anexos -> documentos (limpa supersedes) -> propostas -> sofia (solta chamado) -> chamados -> cliente.
 * Endereços caem por CASCADE; contatos, agenda e financeiro ficam com client_id NULL.
 */
export async function purgeClientRecords(
  clientId: string,
  options: { actorUserId?: string | null; reason?: string } = {},
): Promise<ClientPurgeRemoved> {
  if (!db) throw new Error('Banco de dados não disponível')
  return db.transaction(async tx => {
    const docs = await tx.select({ id: officialDocuments.id }).from(officialDocuments).where(eq(officialDocuments.clientId, clientId))
    const requests = await tx.select({ id: serviceRequests.id }).from(serviceRequests).where(eq(serviceRequests.clientId, clientId))
    const docIds = docs.map(row => row.id)
    const requestIds = requests.map(row => row.id)

    let removedAttachments = 0

    if (docIds.length) {
      const byDocument = await tx.delete(attachments).where(inArray(attachments.documentId, docIds)).returning({ id: attachments.id })
      removedAttachments += byDocument.length
      await tx.update(officialDocuments).set({ supersedesDocumentId: null }).where(inArray(officialDocuments.supersedesDocumentId, docIds))
      await tx.delete(officialDocuments).where(eq(officialDocuments.clientId, clientId))
    }

    if (requestIds.length) {
      const byRequest = await tx.delete(attachments).where(inArray(attachments.serviceRequestId, requestIds)).returning({ id: attachments.id })
      removedAttachments += byRequest.length
      await tx.update(sofiaDrafts).set({ serviceRequestId: null }).where(inArray(sofiaDrafts.serviceRequestId, requestIds))
      await tx.update(sofiaEvents).set({ createdRequestId: null }).where(inArray(sofiaEvents.createdRequestId, requestIds))
      await tx.delete(serviceRequests).where(eq(serviceRequests.clientId, clientId))
    }

    const byClient = await tx.delete(attachments).where(eq(attachments.clientId, clientId)).returning({ id: attachments.id })
    removedAttachments += byClient.length

    const removedProposals = await tx.delete(proposals).where(eq(proposals.clientId, clientId)).returning({ id: proposals.id })
    const [removedClient] = await tx.delete(clients).where(eq(clients.id, clientId)).returning({ id: clients.id })

    const removed: ClientPurgeRemoved = {
      client: removedClient ? 1 : 0,
      documents: docIds.length,
      serviceRequests: requestIds.length,
      proposals: removedProposals.length,
      attachments: removedAttachments,
    }

    await tx.insert(auditEvents).values({
      actorUserId: options.actorUserId ?? null,
      action: 'client.purged',
      targetType: 'client',
      targetId: clientId,
      metadata: { ...removed, reason: options.reason ?? null },
    })

    return removed
  })
}
