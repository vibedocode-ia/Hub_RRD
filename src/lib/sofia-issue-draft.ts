import { and, eq, isNull } from 'drizzle-orm'
import {
  db, clients, clientAddresses, serviceRequests, sofiaDrafts, sofiaEvents,
  officialDocuments, documentTemplates, auditEvents, proposals,
  SOFIA_DRAFT_STATUS, DOC_STATUS, users, userPermissions,
} from '@/db'
import { resolveDocumentIdentity } from '@/lib/document-identity'
import { renderDocumentHTML } from '@/lib/documents/pdf-generator'
import { moneyToWords } from '@/lib/documents/money-to-words'

const text = (value: unknown, max: number) => typeof value === 'string' ? value.trim().slice(0, max) : ''
const digits = (value: unknown) => typeof value === 'string' ? value.replace(/\D/g, '') : ''

export type IssueDraftInput = {
  draftId: string
  senderPhone: string
  centralHubId: string
  centralContactId: string
  centralClientId: string
  centralRole: string
  docType: 'ORCAMENTO' | 'ORCAMENTO_TECNICO' | 'RECIBO_GARANTIA' | 'LAUDO_TECNICO'
  amount?: string
  paymentMethod?: string
  correlationId: string
}

export type IssueDraftResult =
  | { ok: true; result: { draftId: string; documentId: string; docNumber: string; docType: string; customerName: string; totalValue: string; htmlSnapshot: string } }
  | { ok: false; status: number; error: string }

/**
 * Confirms a PENDING_REVIEW Sofia draft (creates client + address + service
 * request) and immediately issues the official document, returning its HTML
 * snapshot. Enforces that the sending operator holds both the draft-review and
 * document-issue permissions locally; never trusts a role chosen in text.
 */
export async function issueDraftDocument(input: IssueDraftInput): Promise<IssueDraftResult> {
  if (!db) return { ok: false, status: 503, error: 'Banco de dados indisponível.' }
  const phone = digits(input.senderPhone)
  if (!/^\d{10,15}$/.test(phone)) return { ok: false, status: 403, error: 'Operador inválido para emissão.' }

  const [operator] = await db
    .select({ id: users.id, name: users.name })
    .from(users)
    .where(and(eq(users.phone, phone), eq(users.isActive, true)))
    .limit(1)
  if (!operator) return { ok: false, status: 403, error: 'Operador sem vínculo ativo para emitir.' }
  const perms = await db.select({ key: userPermissions.permissionKey }).from(userPermissions).where(eq(userPermissions.userId, operator.id))
  const held = new Set(perms.map((p) => p.key))
  if (!held.has('sofia.drafts.review') || !held.has('documents.issue')) {
    return { ok: false, status: 403, error: 'Permissão insuficiente para emitir documentos.' }
  }

  const [draft] = await db.select().from(sofiaDrafts).where(and(
    eq(sofiaDrafts.id, input.draftId),
    eq(sofiaDrafts.senderPhone, input.senderPhone),
    eq(sofiaDrafts.centralHubId, input.centralHubId),
    eq(sofiaDrafts.centralContactId, input.centralContactId),
    eq(sofiaDrafts.centralClientId, input.centralClientId),
    eq(sofiaDrafts.centralRole, input.centralRole),
    eq(sofiaDrafts.status, SOFIA_DRAFT_STATUS.PENDING_REVIEW),
  )).limit(1)
  if (!draft) return { ok: false, status: 409, error: 'Rascunho não disponível para emissão.' }

  const payload = draft.draftPayload as Record<string, any>
  const customerName = text(payload.customerName, 160)
  const customerPhone = text(payload.customerPhone, 32) || draft.senderPhone
  const address = payload.address || {}
  const street = text(address.street, 180)
  const number = text(address.number, 32)
  const neighborhood = text(address.neighborhood, 120)
  const problemReported = text(payload.problemReported, 2000)
  const documentIdentity = resolveDocumentIdentity(text(payload.customerDocument, 32))
  if (!customerName || !documentIdentity || !street || !number || !neighborhood || !problemReported) {
    return { ok: false, status: 422, error: 'O rascunho ainda precisa de dados antes da emissão.' }
  }

  const [template] = await db.select().from(documentTemplates).where(and(eq(documentTemplates.docType, input.docType), eq(documentTemplates.isActive, true))).limit(1)
  if (!template) return { ok: false, status: 422, error: 'Não há modelo ativo para este tipo de documento.' }

  const rawAmount = String(input.amount ?? payload.totalAmount ?? '').trim()
  const numericAmount = Number(rawAmount.replace(/\s/g, '').replace(/\./g, '').replace(',', '.'))
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) return { ok: false, status: 400, error: 'Informe um valor válido antes de emitir o documento.' }

  const formattedAmount = numericAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const amountText = moneyToWords(numericAmount)
  const fullAddress = [
    `${street}, ${number}`,
    address.complement,
    `${neighborhood}, ${text(address.city, 120) || 'Niterói'}/RJ`,
    address.zipCode ? `CEP ${address.zipCode}` : null,
  ].filter(Boolean).join(' - ')
  const resolvedPayment = String(input.paymentMethod ?? payload.paymentMethod ?? '').trim() || 'A combinar'
  const now = new Date()
  const formattedDate = now.toLocaleDateString('pt-BR')
  const year = now.getFullYear()
  const suffix = Math.floor(1000 + Math.random() * 9000)
  const docNumber = input.docType === 'RECIBO_GARANTIA' ? `REC-${year}-${suffix}` : input.docType === 'LAUDO_TECNICO' ? `OS-${year}-${suffix}` : input.docType === 'ORCAMENTO_TECNICO' ? `ORCT-${year}-${suffix}` : `ORC-${year}-${suffix}`

  const documentPayload = input.docType === 'RECIBO_GARANTIA'
    ? { type: 'RECIBO_GARANTIA' as const, data: { docNumber, paymentDate: formattedDate, paymentDateExtended: formattedDate, amount: formattedAmount, amountInWords: amountText, clientName: customerName, clientDoc: documentIdentity.document, serviceDescription: problemReported, address: fullAddress, city: 'Niterói', paymentMethod: resolvedPayment, issuedAtCity: 'Niterói/RJ' } }
    : input.docType === 'LAUDO_TECNICO'
      ? { type: 'LAUDO_TECNICO' as const, data: { docNumber, executionDate: formattedDate, clientName: customerName, clientDoc: documentIdentity.document, clientAddress: fullAddress, serviceType: payload.serviceType || 'DESENTUPIMENTO', serviceDescription: problemReported, items: [{ description: problemReported, quantity: 1, unitPrice: formattedAmount, subtotal: formattedAmount }], totalAmount: formattedAmount, paymentMethod: resolvedPayment, technicalNotes: '', technicianName: 'LEONARDO SANTOS', warrantyDays: 30, warrantyTerms: '' } }
      : input.docType === 'ORCAMENTO_TECNICO'
        ? { type: 'ORCAMENTO_TECNICO' as const, data: { docNumber, issueDate: formattedDate, issueCity: 'Niterói', serviceTitle: payload.serviceType || 'DESENTUPIMENTO', contractorName: customerName, contractorDocument: documentIdentity.document, contractorAddress: fullAddress, contractedName: 'RR DESENTUPIDORA E DEDETIZADORA', contractedDocument: '53.102.506/0001-78', contractedContact: '21 99669-9191', object: payload.serviceType || 'DESENTUPIMENTO', scopeItems: problemReported.split(/\n|•|-/).map((i) => i.trim()).filter(Boolean), responsibility: 'Todo o serviço e sua responsabilidade técnica será de inteira responsabilidade da empresa RR DESENTUPIDORA E DEDETIZADORA, deixando a contratante isenta de custos adicionais.', totalAmount: formattedAmount, amountInWords: amountText, includedDescription: problemReported, paymentMethod: resolvedPayment, validityDays: '7 dias', executionDeadline: 'Imediato / a combinar', warranty: '30 dias no mesmo ponto desentupido' } }
        : { type: 'ORCAMENTO' as const, data: { docNumber, issueDate: formattedDate, contractor: customerName, object: payload.serviceType || 'DESENTUPIMENTO', serviceScope: problemReported, totalAmount: formattedAmount, paymentMethod: resolvedPayment, validityDays: '15 dias', executionDeadline: 'A combinar', guarantees: '' } }
  const htmlSnapshot = renderDocumentHTML(documentPayload as any)

  const result = await db.transaction(async (tx) => {
    const [client] = await tx.insert(clients).values({ name: customerName, phone: customerPhone, normalizedPhone: customerPhone.replace(/\D/g, ''), type: documentIdentity.type, document: documentIdentity.document }).returning()
    const [clientAddress] = await tx.insert(clientAddresses).values({ clientId: client.id, street, number, neighborhood, city: text(address.city, 120) || 'Niterói', state: 'RJ', complement: text(address.complement, 120) || null, referencePoint: text(address.referencePoint, 200) || null, isMain: true }).returning()
    const [request] = await tx.insert(serviceRequests).values({ code: `SOF-${year}-${draft.id.slice(0, 8)}`, clientId: client.id, addressId: clientAddress.id, sourceChannel: 'SOFIA_WHATSAPP', leadStatus: 'NOVO', priority: payload.priority || 'NORMAL', serviceType: payload.serviceType || 'DESENTUPIMENTO', problemReported, status: input.docType === 'RECIBO_GARANTIA' ? 'CONCLUIDO' : 'PENDING_REVIEW', totalAmount: numericAmount.toFixed(2), paymentMethod: resolvedPayment }).returning()

    const [documentRecord] = await tx.insert(officialDocuments).values({
      docType: input.docType, docNumber, serviceRequestId: request.id, clientId: client.id,
      templateVersion: template.version, totalValue: numericAmount.toFixed(2), amountInWords: amountText,
      paymentMethod: resolvedPayment, hasWarranty: true, warrantyDays: 30, warrantyTerms: null, technicalNotes: null,
      documentPayloadSnapshot: { ...documentPayload, templateId: template.id, templateVersion: template.version },
      htmlSnapshot, status: DOC_STATUS.EMITIDO, issuedAt: now, createdById: operator.id,
    }).returning()

    if (input.docType === 'ORCAMENTO' || input.docType === 'ORCAMENTO_TECNICO') {
      const [proposal] = await tx.insert(proposals).values({ clientId: client.id, serviceRequestId: request.id, officialDocumentId: documentRecord.id, title: `${input.docType === 'ORCAMENTO_TECNICO' ? 'Orçamento Técnico' : 'Orçamento'} — ${payload.serviceType || 'DESENTUPIMENTO'}`, description: problemReported, totalValue: numericAmount.toFixed(2), status: 'SENT', sentAt: now, createdById: operator.id }).returning()
      await tx.insert(auditEvents).values({ actorUserId: operator.id, action: 'proposal.created_from_document', targetType: 'proposal', targetId: proposal.id, metadata: { documentId: documentRecord.id, docType: input.docType } })
    }

    const [updated] = await tx.update(sofiaDrafts).set({ status: SOFIA_DRAFT_STATUS.CONVERTED, serviceRequestId: request.id, reviewedById: operator.id, reviewedAt: now, convertedAt: now, updatedAt: now }).where(and(eq(sofiaDrafts.id, draft.id), eq(sofiaDrafts.status, SOFIA_DRAFT_STATUS.PENDING_REVIEW), isNull(sofiaDrafts.serviceRequestId))).returning()
    if (!updated) throw new Error('DRAFT_ALREADY_CONVERTED')
    await tx.insert(sofiaEvents).values({ senderPhone: input.senderPhone, idempotencyKey: input.correlationId, rawPayload: { action: 'issue_service_draft', draftId: draft.id, docType: input.docType, documentId: documentRecord.id }, intentDetected: draft.intent, status: 'PROCESSED' })
    await tx.insert(auditEvents).values({ actorUserId: operator.id, action: 'sofia_draft.confirmed_and_issued', targetType: 'sofia_draft', targetId: draft.id, metadata: { serviceRequestId: request.id, documentId: documentRecord.id, docType: input.docType } })
    return { documentRecord }
  })

  return {
    ok: true,
    result: {
      draftId: draft.id,
      documentId: result.documentRecord.id,
      docNumber: result.documentRecord.docNumber,
      docType: input.docType,
      customerName,
      totalValue: numericAmount.toFixed(2),
      htmlSnapshot,
    },
  }
}
