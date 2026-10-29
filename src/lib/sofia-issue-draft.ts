import { and, eq, or, sql } from 'drizzle-orm'
import { draftOwnership, type CentralDocumentAuthor } from '@/lib/sofia-document-author'
import { draftReviewVersion } from '@/lib/sofia-draft-review-version'
import {
  db, clients, leads, sofiaDrafts, sofiaEvents, officialDocuments, auditEvents,
  proposals, leadProposals, SOFIA_DRAFT_STATUS, DOC_STATUS, users, userPermissions,
} from '@/db'
import { resolveDocumentIdentity } from '@/lib/document-identity'
import { supersedeOfficialDocument } from '@/lib/official-document-lifecycle'
import { documentDraftContract, requiredDocumentDraftFields, conflictingDocumentAliases, missingDataAcknowledged } from '@/lib/sofia-document-draft'
import { renderRegisteredTemplate } from '@/lib/documents/registered-template'
import { selectSofiaDocumentTemplate, unknownDocumentFields } from '@/lib/sofia-document-template'
import { moneyToWords } from '@/lib/documents/money-to-words'
import { normalizeTemplateFields } from '@/lib/document-template-contract'
import { resolveTemplateValues } from '@/lib/documents/template-values'

const text = (value: unknown, max = 2000) => typeof value === 'string' ? value.trim().slice(0, max) : ''
const digits = (value: unknown) => text(value, 32).replace(/\D/g, '')
const record = (value: unknown): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
const uuid = (value: unknown) => typeof value === 'string' && /^[\da-f]{8}-[\da-f]{4}-[1-8][\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i.test(value)
type DocType = 'ORCAMENTO' | 'ORCAMENTO_TECNICO' | 'RECIBO_GARANTIA' | 'LAUDO_TECNICO'
const docTypes: DocType[] = ['ORCAMENTO', 'ORCAMENTO_TECNICO', 'RECIBO_GARANTIA', 'LAUDO_TECNICO']

export type IssueDraftInput = {
  draftId: string
  senderPhone: string
  centralHubId: string
  centralContactId?: string
  centralClientId?: string
  centralGrantId?: string
  reviewVersion?: string
  confirmed?: true
  centralRole: string
  docType?: DocType
  amount?: string
  paymentMethod?: string
  templateId?: string
  documentFields?: Record<string, string>
  supersedesDocumentId?: string
  correlationId: string
}

export type IssueDraftResult =
  | { ok: true; alreadyProcessed?: boolean; result: { draftId: string; documentId: string; docNumber: string; docType: string; customerName: string; totalValue: string; htmlSnapshot: string } }
  | { ok: false; status: number; error: string; pendingFields?: Array<{key:string;label:string}> }

type Candidate = { id: string; name: string; normalizedPhone?: string | null; document?: string | null; normalizedDocument?: string | null; convertedClientId?: string | null; isActive?: boolean }
type Recipient = { kind: 'lead' | 'client'; id: string }

/** ID references are only usable alongside the confirmed identity; ambiguous identity fails closed. */
export function resolveIssueRecipient(payload: Record<string, unknown>, leadRows: Candidate[], clientRows: Candidate[]): Recipient | null {
  const leadId = payload.leadId
  const clientId = payload.clientId
  if ((leadId !== undefined && !uuid(leadId)) || (clientId !== undefined && !uuid(clientId)) || (leadId && clientId)) return null
  const identity = resolveDocumentIdentity(text(payload.customerDocument, 32))
  const name = text(payload.customerName, 160).toLocaleLowerCase('pt-BR')
  if (!identity || !name) return null
  const phone = digits(payload.customerPhone)
  const matches = [
    ...leadRows.filter(row => !row.convertedClientId).map(row => ({ kind: 'lead' as const, row })),
    ...clientRows.filter(row => row.isActive !== false).map(row => ({ kind: 'client' as const, row })),
  ].filter(({ kind, row }) => {
    if (text(row.name, 160).toLocaleLowerCase('pt-BR') !== name) return false
    const rowDocument = kind === 'lead' ? row.normalizedDocument || row.document : row.document
    if (digits(rowDocument) !== digits(identity.document)) return false
    if (phone && digits(row.normalizedPhone) !== phone) return false
    if (leadId && (kind !== 'lead' || row.id !== leadId)) return false
    if (clientId && (kind !== 'client' || row.id !== clientId)) return false
    return true
  })
  return matches.length === 1 ? { kind: matches[0].kind, id: matches[0].row.id } : null
}

/** Marcador único para dados ausentes: nunca inventa conteúdo, apenas declara a ausência. */
export const MISSING_DATA_PLACEHOLDER = 'Não informado'

/** Validate the five document minimums before building anything that can be persisted. */
export function prepareIssueDraft(payload: Record<string, unknown>, changes: { amount?: string; paymentMethod?: string }) {
  const next: Record<string, unknown> = { ...payload }
  const acknowledged = missingDataAcknowledged(next)
  // Consentimento explícito: dados ausentes são emitidos como "Não informado"/valor zerado.
  if (acknowledged) {
    if (!text(next.customerName, 160)) next.customerName = MISSING_DATA_PLACEHOLDER
    if (!text(next.customerDocument, 32)) next.customerDocument = MISSING_DATA_PLACEHOLDER
    if (!text(next.amount, 32)) next.amount = '0,00'
    if (!text(next.documentDate, 10)) next.documentDate = new Date().toISOString().slice(0, 10)
    if (!text(next.problemReported)) next.problemReported = MISSING_DATA_PLACEHOLDER
  }
  const missing = acknowledged ? [] : requiredDocumentDraftFields(next)
  const contract = documentDraftContract(next)
  if (changes.amount !== undefined || changes.paymentMethod !== undefined || missing.length || contract.nextAction !== 'review_draft') return { ok: false as const, missing: [...missing, ...contract.unconsentedOptionalFields.map(item => ({ field: item.field, label: item.label, requiredFor: 'document_issue' }))] }
  const identity = resolveDocumentIdentity(text(next.customerDocument, 32)) ?? (acknowledged ? { document: text(next.customerDocument, 32), type: 'PF' as const } : null)
  if (!identity) return { ok: false as const, missing: [{ field: 'customer.document', label: 'CPF ou CNPJ válido', requiredFor: 'document_issue' }] }
  const rawAmount = text(next.amount, 32).replace(/^R\$\s*/, '')
  const numericAmount = Number(rawAmount.includes(',') || /^\d{1,3}(?:\.\d{3})+$/.test(rawAmount) ? rawAmount.replace(/\./g, '').replace(',', '.') : rawAmount)
  const amount = numericAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const date = text(next.documentDate, 10).split('-').reverse().join('/')
  const name = text(next.customerName, 160)
  const scope = text(next.problemReported)
  const address = record(next.address)
  const location = [
    [text(address.street, 180), text(address.number, 32)].filter(Boolean).join(', '),
    text(address.complement, 120), text(address.neighborhood, 120),
    [text(address.city, 120), text(address.state, 2)].filter(Boolean).join('/'),
    text(address.zipCode, 16) ? `CEP ${text(address.zipCode, 16)}` : '',
  ].filter(Boolean).join(' - ')
  const paymentMethod = text(next.paymentMethod, 60)
  const serviceType = text(next.serviceType, 120)
  const confirmed = record(next.documentFields)
  const warranty = text(confirmed.warranty || next.warranty, 500)
  const warrantyDays = Number(next.warrantyDays)
  const amountInWords = moneyToWords(numericAmount)
  const optional = (key: string, value: unknown) => text(value) ? { [key]: value } : {}
  const documentPayloadFor = (docType: DocType, docNumber: string): { type: DocType; data: Record<string, unknown> } => {
    if (docType === 'RECIBO_GARANTIA') return { type: docType, data: {
      docNumber, paymentDate: date, paymentDateExtended: date, amount, amountInWords,
      clientName: name, clientDoc: identity.document, serviceDescription: scope,
      ...optional('address', location), ...optional('city', address.city), ...optional('issuedAtCity', [text(address.city), text(address.state)].filter(Boolean).join('/')),
      ...optional('paymentMethod', paymentMethod),
    } }
    if (docType === 'LAUDO_TECNICO') return { type: docType, data: {
      docNumber, executionDate: date, clientName: name, clientDoc: identity.document,
      ...optional('clientAddress', location), ...optional('serviceType', serviceType), serviceDescription: scope,
      items: [{ description: scope, quantity: 1, unitPrice: amount, subtotal: amount }], totalAmount: amount,
      ...optional('paymentMethod', paymentMethod), ...(Number.isInteger(warrantyDays) && warrantyDays > 0 ? { warrantyDays } : {}),
      ...optional('warrantyTerms', next.warrantyTerms), ...optional('technicalNotes', next.technicalNotes), ...optional('technicianName', next.technicianName),
    } }
    if (docType === 'ORCAMENTO_TECNICO') return { type: docType, data: {
      docNumber, issueDate: date, ...optional('issueCity', address.city), ...optional('serviceTitle', serviceType),
      contractorName: name, contractorDocument: identity.document, ...optional('contractorAddress', location),
      contractedName: 'RR DESENTUPIDORA E DEDETIZADORA', contractedDocument: '53.102.506/0001-78', contractedContact: '21 99669-9191',
      ...optional('object', serviceType), scopeItems: scope.split(/\n|•/).map(item => item.trim()).filter(Boolean),
      totalAmount: amount, amountInWords, includedDescription: scope, ...optional('paymentMethod', paymentMethod), ...optional('warranty', warranty),
      ...optional('responsibility', next.responsibility), ...optional('validityDays', next.validityDays), ...optional('executionDeadline', next.executionDeadline),
    } }
    return { type: docType, data: {
      docNumber, issueDate: date, contractor: name, ...optional('object', serviceType), serviceScope: scope,
      totalAmount: amount, ...optional('paymentMethod', paymentMethod), ...optional('guarantees', next.guarantees),
      ...optional('validityDays', next.validityDays), ...optional('executionDeadline', next.executionDeadline),
    } }
  }
  return { ok: true as const, payload: next, date, customerName: name, totalValue: numericAmount.toFixed(2), amountInWords, paymentMethod, warrantyDays: Number.isInteger(warrantyDays) && warrantyDays > 0 ? warrantyDays : null, documentPayloadFor }
}

function issueDocumentNumber(docType: string, date: string, draftId: string) {
  const prefix = docType === 'RECIBO_GARANTIA' ? 'REC' : docType === 'LAUDO_TECNICO' ? 'OS' : docType === 'ORCAMENTO_TECNICO' ? 'ORCT' : 'ORC'
  return `${prefix}-${date.slice(-4)}-${draftId.replace(/-/g, '').toUpperCase()}`
}

/** Server-owned effective review; uses the issuance renderer, never a second renderer. */
export async function reviewPortalDraft(draftId: string, payload: Record<string, unknown>) {
  const docType = payload.docType ?? 'ORCAMENTO'
  if (!docTypes.includes(docType as DocType)) return null
  const template = await selectSofiaDocumentTemplate(docType as DocType, text(payload.templateId) || undefined)
  if (!template) return null
  const prepared = prepareIssueDraft(payload, {})
  const rendered = prepared.ok ? await renderRegisteredTemplate(template, prepared.documentPayloadFor(docType as DocType, issueDocumentNumber(docType as string, prepared.date, draftId)).data, record(payload.documentFields)) : null
  return { reviewVersion: draftReviewVersion(payload, template), templateId: template.id, templateVersion: template.version, sourceSha256: template.sourceSha256, fieldSchema: normalizeTemplateFields(template.fieldSchema), effectiveValues: rendered?.ok ? rendered.fieldValuesSnapshot : {}, error: rendered && !rendered.ok ? rendered.error.message : null }
}

/** No CRM creation: an issued document references exactly one existing recipient. */
export async function issueDraftDocument(input: IssueDraftInput, externalAuthor?: CentralDocumentAuthor): Promise<IssueDraftResult> {
  return issueBoundDraftDocument(input, undefined, externalAuthor)
}

type PortalActor = { id: string; reviewVersion: string }

/** Local reviewers act for this Hub, not as the WhatsApp conversation's sender.
 * Hub scope is deployment-owned, never copied from the request or selected draft. */
export async function issuePortalDraftDocument(input: { draftId: string; actorUserId: string; reviewVersion: string }): Promise<IssueDraftResult> {
  if (!db) return { ok: false, status: 503, error: 'Banco de dados indisponível.' }
  const hubId = process.env.RRD_HUB_ID
  if (!uuid(hubId)) return { ok: false, status: 503, error: 'Identidade do Hub não configurada.' }
  if (!uuid(input.draftId) || !uuid(input.actorUserId)) return { ok: false, status: 422, error: 'Identificador inválido.' }
  const [draft] = await db.select().from(sofiaDrafts).where(and(eq(sofiaDrafts.id, input.draftId), eq(sofiaDrafts.centralHubId, hubId!))).limit(1)
  if (!draft) return { ok: false, status: 409, error: 'Rascunho não disponível neste Hub.' }
  // Central authorship must use its authenticated issuer lane, never a local reviewer alias.
  if (draft.authorKind !== 'legacy' || !draft.centralContactId || !draft.centralClientId) return { ok: false, status: 409, error: 'Autoria Central requer emissor autenticado próprio.' }
  return issueBoundDraftDocument({ draftId: draft.id, senderPhone: draft.senderPhone, centralHubId: hubId!, centralContactId: draft.centralContactId, centralClientId: draft.centralClientId, centralRole: draft.centralRole, correlationId: `portal-issue:${draft.id}:${input.actorUserId}:${input.reviewVersion}` }, { id: input.actorUserId, reviewVersion: input.reviewVersion })
}

async function issueBoundDraftDocument(input: IssueDraftInput, portalActor?: PortalActor, externalAuthor?: CentralDocumentAuthor): Promise<IssueDraftResult> {
  if (!db) return { ok: false, status: 503, error: 'Banco de dados indisponível.' }
  const phone = digits(input.senderPhone)
  if (!portalActor && !/^\d{10,15}$/.test(phone)) return { ok: false, status: 403, error: 'Operador inválido para emissão.' }
  if (input.centralRole === 'god_admin' && (!externalAuthor || externalAuthor.kind !== 'central_sovereign' || externalAuthor.grantId !== input.centralGrantId || externalAuthor.hubId !== input.centralHubId || externalAuthor.senderPhone !== input.senderPhone || input.confirmed !== true || !input.reviewVersion)) return { ok: false, status: 403, error: 'Autoria e confirmação Central autenticadas obrigatórias.' }
  if (externalAuthor && input.centralRole !== 'god_admin') return { ok: false, status: 403, error: 'Autoria incompatível.' }
  const [localOperator] = externalAuthor ? [] : await db.select({ id: users.id }).from(users).where(and(portalActor ? eq(users.id, portalActor.id) : eq(users.phone, phone), eq(users.isActive, true))).limit(1)
  if (!externalAuthor && !localOperator) return { ok: false, status: 403, error: 'Operador sem vínculo ativo para emitir.' }
  const operator = { id: localOperator?.id ?? null }
  if (!externalAuthor) {
    const perms = await db.select({ key: userPermissions.permissionKey }).from(userPermissions).where(eq(userPermissions.userId, localOperator!.id))
    const held = new Set(perms.map(p => p.key))
    if (!held.has('sofia.drafts.review') || !held.has('documents.issue')) return { ok: false, status: 403, error: 'Permissão insuficiente para emitir documentos.' }
  }
  const ownership = and(eq(sofiaDrafts.id, input.draftId), draftOwnership(input))
  const [draft] = await db.select().from(sofiaDrafts).where(and(ownership, eq(sofiaDrafts.status, SOFIA_DRAFT_STATUS.PENDING_REVIEW))).limit(1)
  if (!draft) {
    if (portalActor) {
      const [replayDraft] = await db.select().from(sofiaDrafts).where(ownership).limit(1)
      if (replayDraft?.status === SOFIA_DRAFT_STATUS.CONVERTED) {
        const [event] = await db.select().from(sofiaEvents).where(eq(sofiaEvents.idempotencyKey, input.correlationId)).limit(1)
        const recorded = record(event?.rawPayload)
        const [document] = event?.status === 'PROCESSED' && recorded.action === 'issue_service_draft' && recorded.draftId === replayDraft.id && uuid(recorded.documentId) && replayDraft.reviewedById === operator.id ? await db.select().from(officialDocuments).where(and(eq(officialDocuments.id, recorded.documentId as string), eq(officialDocuments.createdById, operator.id!))).limit(1) : []
        if (document?.status === DOC_STATUS.EMITIDO) {
          const replayPayload = record(replayDraft.draftPayload)
          return { ok: true, alreadyProcessed: true, result: { draftId: replayDraft.id, documentId: document.id, docNumber: document.docNumber, docType: document.docType, customerName: text(replayPayload.customerName), totalValue: document.totalValue, htmlSnapshot: document.htmlSnapshot ?? '' } }
        }
      }
    }
    return { ok: false, status: 409, error: 'Rascunho não disponível para emissão.' }
  }
  const payload = record(draft.draftPayload)
  if (portalActor && draft.status === SOFIA_DRAFT_STATUS.CONVERTED) {
    const [event] = await db.select().from(sofiaEvents).where(eq(sofiaEvents.idempotencyKey, input.correlationId)).limit(1)
    const recorded = record(event?.rawPayload)
    const [document] = event?.status === 'PROCESSED' && recorded.action === 'issue_service_draft' && recorded.draftId === draft.id && uuid(recorded.documentId) && draft.reviewedById === operator.id ? await db.select().from(officialDocuments).where(and(eq(officialDocuments.id, recorded.documentId as string), eq(officialDocuments.createdById, operator.id!))).limit(1) : []
    if (!document || document.status !== DOC_STATUS.EMITIDO) return { ok: false, status: 409, error: 'Emissão anterior não corresponde ao ator e rascunho ou documento indisponível.' }
    return { ok: true, alreadyProcessed: true, result: { draftId: draft.id, documentId: document.id, docNumber: document.docNumber, docType: document.docType, customerName: text(payload.customerName), totalValue: document.totalValue, htmlSnapshot: document.htmlSnapshot ?? '' } }
  }
  if (draft.status !== SOFIA_DRAFT_STATUS.PENDING_REVIEW) return { ok: false, status: 409, error: 'Rascunho não disponível para emissão.' }
  // A bound template/type is immutable at issue time; changing it requires a separately reviewed draft.
  const docType = payload.docType ?? 'ORCAMENTO'
  if (!docTypes.includes(docType as DocType) || (input.docType && docType !== input.docType)) return { ok: false, status: 422, error: 'Tipo do documento difere do rascunho.' }
  const boundTemplateId = text(payload.templateId, 40)
  if (input.templateId) return { ok: false, status: 422, error: 'Modelo deve ser confirmado no rascunho antes da emissão.' }
  if (input.supersedesDocumentId && !uuid(input.supersedesDocumentId)) return { ok: false, status: 422, error: 'Documento original inválido.' }
  if (externalAuthor && (input.amount !== undefined || input.paymentMethod !== undefined)) return { ok: false, status: 422, error: 'Valores devem ser alterados no rascunho e confirmados novamente.' }
  const prepared = prepareIssueDraft(payload, input)
  if (!prepared.ok) return { ok: false, status: 422, error: 'O rascunho ainda precisa de dados antes da emissão.', pendingFields: prepared.missing.map(item => ({ key: item.field, label: item.label })) }

  const acknowledged = missingDataAcknowledged(payload)
  const identity = resolveDocumentIdentity(text(payload.customerDocument, 32))
  if (!identity && !acknowledged) return { ok: false, status: 422, error: 'CPF ou CNPJ do cliente inválido.' }
  const customerPhone = digits(payload.customerPhone)
  const explicitLead = payload.leadId
  const explicitClient = payload.clientId
  if ((explicitLead !== undefined && !uuid(explicitLead)) || (explicitClient !== undefined && !uuid(explicitClient)) || (explicitLead && explicitClient)) return { ok: false, status: 422, error: 'Destinatário inválido.' }
  const matchingLeads = identity || explicitLead
    ? await db.select({ id: leads.id, name: leads.name, normalizedPhone: leads.normalizedPhone, normalizedDocument: leads.normalizedDocument, convertedClientId: leads.convertedClientId }).from(leads).where(
        explicitLead ? eq(leads.id, explicitLead as string) : customerPhone ? or(eq(leads.normalizedDocument, identity!.document), eq(leads.normalizedPhone, customerPhone)) : eq(leads.normalizedDocument, identity!.document),
      ).limit(3)
    : []
  const matchingClients = identity || explicitClient
    ? await db.select({ id: clients.id, name: clients.name, normalizedPhone: clients.normalizedPhone, document: clients.document, isActive: clients.isActive }).from(clients).where(
        explicitClient ? eq(clients.id, explicitClient as string) : sql`regexp_replace(${clients.document}, '[^0-9]', '', 'g') = ${digits(identity!.document)}`,
      ).limit(3)
    : []
  let recipient = resolveIssueRecipient(payload, matchingLeads, matchingClients)
  if (!recipient && acknowledged) {
    // Emissão consentida sem CPF/CNPJ: vincula ao cadastro existente de mesmo nome, sem criar CRM aqui.
    const wanted = text(payload.customerName, 160).toLocaleLowerCase('pt-BR')
    const namedLeads = customerPhone
      ? await db.select({ id: leads.id, name: leads.name, convertedClientId: leads.convertedClientId }).from(leads).where(and(sql`lower(${leads.name}) = ${wanted}`, eq(leads.normalizedPhone, customerPhone))).limit(3)
      : []
    const namedClients = await db.select({ id: clients.id, name: clients.name, isActive: clients.isActive }).from(clients).where(sql`lower(${clients.name}) = ${wanted}`).limit(3)
    const ordered = [
      ...namedLeads.filter(row => !row.convertedClientId).map(row => ({ kind: 'lead' as const, id: row.id })),
      ...namedClients.filter(row => row.isActive !== false).map(row => ({ kind: 'client' as const, id: row.id })),
    ]
    if (ordered.length === 1) recipient = ordered[0]
    else if (ordered.length > 1) return { ok: false, status: 422, error: 'Mais de um cadastro com esse nome; informe o CPF para emitir.' }
  }
  if (!recipient) return { ok: false, status: 422, error: 'Destinatário existente não identificado de forma única; confirme o ID, nome e CPF/CNPJ no CRM.' }

  const selected = await selectSofiaDocumentTemplate(docType as DocType, boundTemplateId || undefined)
  if (portalActor && (!selected || draftReviewVersion(payload, selected) !== portalActor.reviewVersion)) return { ok: false, status: 409, error: 'Rascunho ou modelo alterado. Revise novamente.' }
  if (!selected) return { ok: false, status: 422, error: 'Não há modelo ativo para este tipo de documento.' }
  if (externalAuthor && draftReviewVersion(payload, selected) !== input.reviewVersion) return { ok: false, status: 409, error: 'Rascunho ou modelo alterado. Confirme novamente.' }
  const stored = record(payload.documentFields)
  if (conflictingDocumentAliases(payload).length > 0) return { ok: false, status: 422, error: 'Campos do modelo conflitam com os dados revisados. Corrija o rascunho antes de emitir.' }
  if (input.documentFields !== undefined) return { ok: false, status: 422, error: 'Campos do modelo devem ser confirmados no rascunho antes da emissão.' }
  const confirmed = stored as Record<string, string>
  if (unknownDocumentFields(selected.fieldSchema, confirmed).length) return { ok: false, status: 422, error: 'O rascunho contém campos de outro modelo. Revise o modelo selecionado.' }
  const schemaFields = normalizeTemplateFields(selected.fieldSchema)
  const now = new Date()
  const docNumber = issueDocumentNumber(docType as string, prepared.date, draft.id)
  const documentPayload = prepared.documentPayloadFor(docType as DocType, docNumber)
  const values = resolveTemplateValues(documentPayload.data, confirmed)
  // Canonical reviewed values and their aliases satisfy the schema too.
  const templateRequired = schemaFields.filter(field => field.required && !String(values[field.key] ?? field.defaultValue ?? '').trim())
  if (templateRequired.length && !acknowledged) return { ok: false, status: 422, error: 'O modelo selecionado exige dados adicionais antes da emissão.', pendingFields: templateRequired.map(({ key, label }) => ({ key, label })) }
  // Campos exigidos pelo modelo sem dado real recebem o marcador de ausência, nunca conteúdo inventado.
  const effectiveConfirmed = templateRequired.length
    ? { ...confirmed, ...Object.fromEntries(templateRequired.map(({ key }) => [key, MISSING_DATA_PLACEHOLDER])) }
    : confirmed
  const rendered = await renderRegisteredTemplate(selected, documentPayload.data, effectiveConfirmed)
  if (!rendered.ok) return { ok: false, status: 422, error: rendered.error.message }

  const validateLockedIssue = async (tx: Parameters<Parameters<NonNullable<typeof db>['transaction']>[0]>[0]) => {
    // SHARE excludes template writers AND inserts: default selection cannot acquire a phantom.
    // Held through commit, including render/snapshot persistence. No client version is authority.
    await tx.execute(sql`LOCK TABLE document_templates IN SHARE MODE`)
    const current = await selectSofiaDocumentTemplate(docType as DocType, boundTemplateId || undefined, tx)
    if (!current || draftReviewVersion(payload, current) !== draftReviewVersion(payload, selected)) return false
    if (portalActor && draftReviewVersion(payload, current) !== portalActor.reviewVersion) return false
    if (externalAuthor && draftReviewVersion(payload, current) !== input.reviewVersion) return false
    const lockedLeads = recipient.kind === 'lead' ? await tx.select().from(leads).where(eq(leads.id, recipient.id)).for('update').limit(1) : []
    const lockedClients = recipient.kind === 'client' ? await tx.select().from(clients).where(eq(clients.id, recipient.id)).for('update').limit(1) : []
    if (missingDataAcknowledged(payload)) {
      const bound = recipient.kind === 'lead' ? lockedLeads[0] : lockedClients[0]
      return Boolean(bound && bound.id === recipient.id)
    }
    const currentRecipient = resolveIssueRecipient(payload, lockedLeads, lockedClients)
    return currentRecipient?.id === recipient.id && currentRecipient.kind === recipient.kind
  }

  const runRevision = async (): Promise<IssueDraftResult> => {
    const originalId = input.supersedesDocumentId
    if (!originalId) return { ok: false, status: 422, error: 'Documento original obrigatório para revisão.' }
    return db.transaction(async tx => {
      const [lockedDraft] = await tx.select().from(sofiaDrafts).where(ownership).for('update').limit(1)
      if (!lockedDraft || lockedDraft.status !== SOFIA_DRAFT_STATUS.PENDING_REVIEW || JSON.stringify(lockedDraft.draftPayload) !== JSON.stringify(payload)) return { ok: false as const, status: 409, error: 'Rascunho alterado ou já emitido.' }
      if (!await validateLockedIssue(tx)) return { ok: false as const, status: 409, error: 'Modelo ou identidade do destinatário alterado. Revise novamente.' }
      const [replay] = await tx.select({ id: sofiaEvents.id }).from(sofiaEvents).where(eq(sofiaEvents.idempotencyKey, input.correlationId)).limit(1)
      if (replay) return { ok: false as const, status: 409, error: 'Chave de idempotência já utilizada.' }
      const [lockedOriginal] = await tx.select().from(officialDocuments).where(eq(officialDocuments.id, originalId)).for('update').limit(1)
      if (!lockedOriginal || lockedOriginal.status === DOC_STATUS.ARQUIVADO || lockedOriginal.status === DOC_STATUS.ENVIADO) return { ok: false as const, status: 409, error: 'Documento original mudou e não pode ser revisado.' }
      if (lockedOriginal.docType !== docType || (recipient.kind === 'lead' ? lockedOriginal.leadId !== recipient.id : lockedOriginal.clientId !== recipient.id)) return { ok: false as const, status: 422, error: 'A revisão deve manter o destinatário e tipo do documento original.' }
      const [created] = await tx.insert(officialDocuments).values({ docType: lockedOriginal.docType, docNumber, leadId: lockedOriginal.leadId, clientId: lockedOriginal.clientId, serviceRequestId: lockedOriginal.serviceRequestId, supersedesDocumentId: lockedOriginal.id, templateVersion: selected.version, totalValue: prepared.totalValue, amountInWords: prepared.amountInWords, paymentMethod: prepared.paymentMethod, hasWarranty: prepared.warrantyDays !== null, warrantyDays: prepared.warrantyDays, documentPayloadSnapshot: { ...documentPayload, templateId: selected.id, templateVersion: selected.version, templateSourceSha256: selected.sourceSha256, fieldSchemaSnapshot: rendered.fieldSchemaSnapshot, fieldValuesSnapshot: rendered.fieldValuesSnapshot }, htmlSnapshot: rendered.html, status: DOC_STATUS.EMITIDO, issuedAt: now, createdById: operator.id, externalAuthor: externalAuthor ?? null }).returning()
      await tx.insert(auditEvents).values({ actorUserId: operator.id, action: 'document.superseded', targetType: 'official_document', targetId: created.id, metadata: { externalAuthor: externalAuthor ?? null, supersedesDocumentId: lockedOriginal.id } })
      if (docType === 'ORCAMENTO' || docType === 'ORCAMENTO_TECNICO') {
        if (recipient.kind === 'lead') await tx.insert(leadProposals).values({ leadId: recipient.id, officialDocumentId: created.id, title: `Orçamento — ${prepared.customerName}`, description: text(payload.problemReported), totalValue: prepared.totalValue, status: 'DRAFT', createdById: operator.id, externalAuthor: externalAuthor ?? null })
        else await tx.insert(proposals).values({ clientId: recipient.id, officialDocumentId: created.id, title: `Orçamento — ${prepared.customerName}`, description: text(payload.problemReported), totalValue: prepared.totalValue, status: 'DRAFT', createdById: operator.id, externalAuthor: externalAuthor ?? null })
      }
      await tx.update(sofiaDrafts).set({ draftPayload: portalActor ? payload : { ...payload, docType, templateId: selected.id, documentFields: confirmed, amount: prepared.payload.amount, totalAmount: prepared.payload.amount, paymentMethod: prepared.paymentMethod }, status: SOFIA_DRAFT_STATUS.CONVERTED, reviewedById: operator.id, reviewedAt: now, convertedAt: now, updatedAt: now }).where(eq(sofiaDrafts.id, draft.id))
      await tx.insert(sofiaEvents).values({ senderPhone: input.senderPhone, idempotencyKey: input.correlationId, rawPayload: { action: 'issue_service_draft', draftId: draft.id, docType, documentId: created.id }, intentDetected: draft.intent, status: 'PROCESSED' })
      await tx.insert(auditEvents).values({ actorUserId: operator.id, action: 'sofia_draft.confirmed_and_issued', targetType: 'sofia_draft', targetId: draft.id, metadata: { externalAuthor: externalAuthor ?? null, recipientKind: recipient.kind, recipientId: recipient.id, documentId: created.id, supersedesDocumentId: lockedOriginal.id, docType } })
      return { ok: true as const, result: { draftId: draft.id, documentId: created.id, docNumber: created.docNumber, docType: created.docType, customerName: prepared.customerName, totalValue: created.totalValue, htmlSnapshot: created.htmlSnapshot ?? '' } }
    })
  }
  if (input.supersedesDocumentId) return runRevision()
  // A single transaction locks the draft, revalidates its status/owner and commits
  // payload + document + proposal + event together. Rollback leaves no partial issue.
  return db.transaction(async tx => {
    const [locked] = await tx.select().from(sofiaDrafts).where(ownership).for('update').limit(1)
    if (!locked || locked.status !== SOFIA_DRAFT_STATUS.PENDING_REVIEW || locked.serviceRequestId || JSON.stringify(locked.draftPayload) !== JSON.stringify(payload)) return { ok: false as const, status: 409, error: 'Rascunho alterado ou já emitido.' }
    const [replay] = await tx.select({ id: sofiaEvents.id }).from(sofiaEvents).where(eq(sofiaEvents.idempotencyKey, input.correlationId)).limit(1)
    if (replay) return { ok: false as const, status: 409, error: 'Chave de idempotência já utilizada.' }
    if (!await validateLockedIssue(tx)) return { ok: false as const, status: 409, error: 'Modelo ou identidade do destinatário alterado. Revise novamente.' }
    const [documentRecord] = await tx.insert(officialDocuments).values({
      docType: docType as DocType, docNumber,
      ...(recipient.kind === 'lead' ? { leadId: recipient.id } : { clientId: recipient.id }),
      templateVersion: selected.version, totalValue: prepared.totalValue, amountInWords: prepared.amountInWords,
      paymentMethod: prepared.paymentMethod, hasWarranty: prepared.warrantyDays !== null, warrantyDays: prepared.warrantyDays,
      documentPayloadSnapshot: { ...documentPayload, templateId: selected.id, templateVersion: selected.version, templateSourceSha256: selected.sourceSha256, fieldSchemaSnapshot: rendered.fieldSchemaSnapshot, fieldValuesSnapshot: rendered.fieldValuesSnapshot },
      htmlSnapshot: rendered.html, status: DOC_STATUS.EMITIDO, issuedAt: now, createdById: operator.id, externalAuthor: externalAuthor ?? null,
    }).returning()
    if (docType === 'ORCAMENTO' || docType === 'ORCAMENTO_TECNICO') {
      if (recipient.kind === 'lead') {
        const [proposal] = await tx.insert(leadProposals).values({ leadId: recipient.id, officialDocumentId: documentRecord.id, title: `Orçamento — ${prepared.customerName}`, description: text(payload.problemReported), totalValue: prepared.totalValue, status: 'DRAFT', createdById: operator.id, externalAuthor: externalAuthor ?? null }).returning()
        await tx.insert(auditEvents).values({ actorUserId: operator.id, action: 'lead_proposal.created_from_document', targetType: 'lead_proposal', targetId: proposal.id, metadata: { externalAuthor: externalAuthor ?? null, documentId: documentRecord.id } })
      } else {
        const [proposal] = await tx.insert(proposals).values({ clientId: recipient.id, officialDocumentId: documentRecord.id, title: `Orçamento — ${prepared.customerName}`, description: text(payload.problemReported), totalValue: prepared.totalValue, status: 'DRAFT', createdById: operator.id, externalAuthor: externalAuthor ?? null }).returning()
        await tx.insert(auditEvents).values({ actorUserId: operator.id, action: 'proposal.created_from_document', targetType: 'proposal', targetId: proposal.id, metadata: { externalAuthor: externalAuthor ?? null, documentId: documentRecord.id } })
      }
    }
    await tx.update(sofiaDrafts).set({ draftPayload: portalActor ? payload : { ...payload, docType, templateId: selected.id, documentFields: confirmed, amount: prepared.payload.amount, totalAmount: prepared.payload.amount, paymentMethod: prepared.paymentMethod }, status: SOFIA_DRAFT_STATUS.CONVERTED, reviewedById: operator.id, reviewedAt: now, convertedAt: now, updatedAt: now }).where(eq(sofiaDrafts.id, draft.id))
    await tx.insert(sofiaEvents).values({ senderPhone: input.senderPhone, idempotencyKey: input.correlationId, rawPayload: { action: 'issue_service_draft', draftId: draft.id, docType, documentId: documentRecord.id }, intentDetected: draft.intent, status: 'PROCESSED' })
    await tx.insert(auditEvents).values({ actorUserId: operator.id, action: 'sofia_draft.confirmed_and_issued', targetType: 'sofia_draft', targetId: draft.id, metadata: { externalAuthor: externalAuthor ?? null, recipientKind: recipient.kind, recipientId: recipient.id, documentId: documentRecord.id, docType } })
    return { ok: true as const, result: { draftId: draft.id, documentId: documentRecord.id, docNumber: documentRecord.docNumber, docType: docType as string, customerName: prepared.customerName, totalValue: prepared.totalValue, htmlSnapshot: rendered.html } }
  })
}
