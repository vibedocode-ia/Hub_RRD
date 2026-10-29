import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'node:crypto'
import { and, asc, desc, eq, gte, lt, gt, ilike, isNull, ne, or, sql } from 'drizzle-orm'
import { db, agendaEvents, clientAddresses, clients, equipment, financeiroLancamentos, insumos, leads, officialDocuments, serviceCatalog, serviceRequests, sofiaEvents, sofiaDrafts, SOFIA_DRAFT_STATUS, stockMovements, teams, userPermissions, users, vehicles } from '@/db'
import { validateStockAdjustment } from '@/lib/inventory'
import { FinancialEntrySchema } from '@/lib/validation/financeiro'
import { normalizeDocumentDraft, documentDraftContract, OPTIONAL_FIELD_CONSENT } from '@/lib/sofia-document-draft'
import { SofiaActionRequest, pendingDraftFields, digits, parseSofiaClientAction, parseSofiaDomainAction, safeClientSummary, safeStockSummary, safeVehicleSummary } from '@/lib/sofia-actions'
import { canExecuteRrdSofiaAction, normalizeRrdPhone, SOFIA_LOCAL_PERMISSION } from '@/lib/sofia-local-access'
import { selectSofiaDocumentTemplate, publicSofiaDocumentTemplate, unknownDocumentFields } from '@/lib/sofia-document-template'
import { draftOwnership, type CentralDocumentAuthor } from '@/lib/sofia-document-author'
import { reviewPortalDraft } from '@/lib/sofia-issue-draft'
import { issueDraftDocument } from '@/lib/sofia-issue-draft'
import { archiveOfficialDocument, supersedeOfficialDocument } from '@/lib/official-document-lifecycle'
import { authorizeRrdCentralEnvelope } from '@/lib/sofia-godadmin-policy'
import { buildCrmProfile } from '@/lib/crm-profile'
import { clientPurgeCounts, clientPurgeHasHistory, purgeClientRecords } from '@/lib/client-purge'
import { documentPurgeCounts, purgeDocumentRecord } from '@/lib/document-purge'
import { VERSION } from '@/lib/version'
import { isNativePeopleAccessRead, listNativePeopleAccesses } from '@/lib/native-people-accesses'
import { executeSofiaPersonProfile, SofiaPersonProfileRequest, SofiaManagedPersonProfileRequest } from '@/lib/sofia-person-profile'
import { executeSofiaManagedPersonProfile } from '@/lib/sofia-person-profile-service'
import { agendaReadResult, financialReadResult, resolveQueryRange } from '@/lib/sofia-operational-queries'

const header = (correlationId?: string) => ({ 'X-Hub-Version': VERSION, ...(correlationId ? { 'X-Correlation-Id': correlationId } : {}) })
const reply = (body: unknown, status = 200, correlationId?: string) => NextResponse.json(body, { status, headers: header(correlationId) })
const clean = (value: unknown, max: number) => typeof value === 'string' ? value.trim().slice(0, max) : ''
function authorized(req: NextRequest) {
  const secret = process.env.SOFIA_HUB_SECRET; const value = req.headers.get('authorization')
  if (!secret) return { ok: false as const, status: 503, error: 'Endpoint Sofia não configurado.' }
  if (!value?.startsWith('Bearer ')) return { ok: false as const, status: 401, error: 'Authorization Bearer obrigatório.' }
  const token = value.slice(7)
  if (token.length !== secret.length || !timingSafeEqual(Buffer.from(token), Buffer.from(secret))) return { ok: false as const, status: 401, error: 'Não autorizado.' }
  return { ok: true as const, trustedGodAdmin: false }
}
function godAdminTransport(req: NextRequest) {
  // Independent secret. An ordinary Sofia Hub token must never claim GodAdmin by
  // submitting centralRole in JSON. The HVD side re-reads the grant each call.
  const secret = process.env.SOFIA_RRD_CENTRAL_SECRET
  const legacy = process.env.SOFIA_HUB_SECRET
  const header = req.headers.get('authorization')
  if (!secret?.trim() || secret === legacy || !header?.startsWith('Bearer ')) return false
  const token = header.slice(7)
  return token.length === secret.length && timingSafeEqual(Buffer.from(token), Buffer.from(secret))
}
function centralHubMatches(raw: unknown) { return Boolean(process.env.RRD_HUB_ID && raw && typeof raw === 'object' && !Array.isArray(raw) && (raw as Record<string, unknown>).centralHubId === process.env.RRD_HUB_ID) }

async function locallyAuthorizedForSofiaAction(senderPhone: unknown, centralRole: unknown): Promise<boolean> {
  const phone = normalizeRrdPhone(senderPhone)
  if (!phone || !db) return false
  const [person] = await db.select({ phone: users.phone, isActive: users.isActive })
    .from(users)
    .innerJoin(userPermissions, and(eq(userPermissions.userId, users.id), eq(userPermissions.permissionKey, SOFIA_LOCAL_PERMISSION)))
    .where(and(eq(users.phone, phone), eq(users.isActive, true)))
    .limit(1)
  return canExecuteRrdSofiaAction(person ? { ...person, permissions: [SOFIA_LOCAL_PERMISSION] } : null, phone, centralRole)
}

export async function POST(req: NextRequest) {
  const auth = authorized(req)
  // Dedicated Central transport (independent secret) marks the turn as trusted
  // GodAdmin. An ordinary Hub token is never trusted here.
  const centralTransport = !auth.ok && godAdminTransport(req)
  const effectiveAuth = centralTransport ? { ok: true as const, trustedGodAdmin: true } : { ...auth, trustedGodAdmin: false }
  if (!effectiveAuth.ok) return reply({ success: false, error: effectiveAuth.error }, effectiveAuth.status)
  if (!db) return reply({ success: false, error: 'Banco de dados indisponível.' }, 503)
  const correlationId = req.headers.get('idempotency-key') || req.headers.get('x-correlation-id') || ''
  if (!/^[A-Za-z0-9:_-]{8,160}$/.test(correlationId)) return reply({ success: false, error: 'Chave de idempotência obrigatória.' }, 400)
  const rawBody = await req.json().catch(() => null)
  if (!centralHubMatches(rawBody)) return reply({ success: false, error: 'Hub central não autorizado.' }, 403, correlationId)
  const envelope = rawBody as Record<string, unknown>
  // GodAdmin Central is sovereign above the Hub: it is authorized by the dedicated
  // transport + explicit envelope, NOT by a local RRD membership and NOT by a
  // synthesized hub_owner role. Ordinary Hub traffic keeps the local gate below.
  const godAdmin = authorizeRrdCentralEnvelope(rawBody, { expectedHubId: process.env.RRD_HUB_ID, trustedGodAdmin: effectiveAuth.trustedGodAdmin })
  if (effectiveAuth.trustedGodAdmin !== godAdmin) return reply({ success: false, error: 'Autoridade Central não autorizada.' }, 403, correlationId)
  if (!effectiveAuth.trustedGodAdmin) {
    if (envelope.centralRole === 'god_admin') return reply({ success: false, error: 'Autoridade Central não autorizada.' }, 403, correlationId)
    if (!await locallyAuthorizedForSofiaAction(envelope.senderPhone, envelope.centralRole)) {
      return reply({ success: false, error: 'Acesso indisponível ou revogado para este Hub.' }, 403, correlationId)
    }
  }
  try {
    if (envelope.action === 'list_people_accesses') {
      if (!isNativePeopleAccessRead(envelope, godAdmin)) return reply({ success: false, error: 'Leitura de acessos exige autoridade Central e contrato válido.' }, 403, correlationId)
      return reply({ success: true, action: 'list_people_accesses', people: await listNativePeopleAccesses() }, 200, correlationId)
    }
    const externalAuthor: CentralDocumentAuthor | undefined = godAdmin ? { kind: 'central_sovereign', grantId: String(envelope.centralGrantId), hubId: String(envelope.centralHubId), senderPhone: String(envelope.senderPhone) } : undefined
    if (envelope.action === 'get_person_profile' || envelope.action === 'update_person_profile') {
      const parsed = SofiaManagedPersonProfileRequest.safeParse(rawBody)
      if (!parsed.success) return reply({ success: false, error: 'Envelope ou dados de perfil inválidos.' }, 422, correlationId)
      const result = await executeSofiaManagedPersonProfile(parsed.data.action, parsed.data.data, parsed.data.senderPhone, { phoneIdentityMode: 'central_phone_identity', ...(godAdmin ? { sovereign: { grantId: String(envelope.centralGrantId), hubId: String(envelope.centralHubId) } } : {}) })
      return reply({ ...result.body, action: parsed.data.action }, result.status, correlationId)
    }
    if (envelope.action === 'get_my_profile' || envelope.action === 'update_my_profile') {
      const parsed = SofiaPersonProfileRequest.safeParse(rawBody)
      if (!parsed.success) return reply({ success: false, error: 'Envelope ou dados de perfil inválidos.' }, 422, correlationId)
      const input = parsed.data
      const result = godAdmin
        ? await executeSofiaManagedPersonProfile(input.action === 'get_my_profile' ? 'get_person_profile' : 'update_person_profile', { targetPhone: input.senderPhone, ...(input.action === 'update_my_profile' ? { patch: input.data } : {}) }, input.senderPhone, { sovereign: { grantId: String(envelope.centralGrantId), hubId: String(envelope.centralHubId) } })
        : await executeSofiaPersonProfile(input.action, input.data, input.senderPhone)
      return reply({ ...result.body, action: input.action }, result.status, correlationId)
    }
    const operational = SofiaActionRequest.safeParse(rawBody)
    if (operational.success) {
      const input = operational.data
      if (input.action === 'get_document_template') {
        if (!godAdmin) {
          const [operator] = await db.select({ id: users.id }).from(users).where(and(eq(users.phone, normalizeRrdPhone(input.senderPhone)!), eq(users.isActive, true))).limit(1)
          const permissions = operator ? await db.select({ key: userPermissions.permissionKey }).from(userPermissions).where(eq(userPermissions.userId, operator.id)) : []
          if (!permissions.some(p => p.key === 'documents.issue') || !permissions.some(p => p.key === SOFIA_LOCAL_PERMISSION)) return reply({ success: false, error: 'Permissão insuficiente para consultar o modelo.' }, 403, correlationId)
        }
        const template = await selectSofiaDocumentTemplate(input.docType, input.templateId)
        if (!template) return reply({ success: false, error: 'Modelo ativo não encontrado para este tipo de documento.' }, 404, correlationId)
        return reply({ success: true, action: input.action, template: publicSofiaDocumentTemplate(template) }, 200, correlationId)
      }
      if (input.action === 'list_services') {
        const services = await db.select({ name: serviceCatalog.name, category: serviceCatalog.category, description: serviceCatalog.description, basePrice: serviceCatalog.basePrice, priceNotes: serviceCatalog.priceNotes, requiresInspection: serviceCatalog.requiresInspection, emergencyEligible: serviceCatalog.isEmergencyEligible }).from(serviceCatalog).where(eq(serviceCatalog.status, 'ACTIVE')).orderBy(asc(serviceCatalog.displayOrder), asc(serviceCatalog.name)).limit(50)
        return reply({ success: true, action: input.action, services }, 200, correlationId)
      }
      if (input.action === 'list_active_teams') {
        const activeTeams = await db.select({ name: teams.name, leaderName: teams.leaderName }).from(teams).where(eq(teams.isActive, true)).orderBy(asc(teams.name)).limit(20)
        return reply({ success: true, action: input.action, teams: activeTeams }, 200, correlationId)
      }
      if (input.action === 'update_service_draft') {
        const [replay] = await db.select().from(sofiaEvents).where(eq(sofiaEvents.idempotencyKey, correlationId)).limit(1)
        if (replay) {
          const [owned] = await db.select({ id: sofiaDrafts.id }).from(sofiaDrafts).where(and(eq(sofiaDrafts.id, input.draftId), draftOwnership(input))).limit(1)
          const recorded = replay.rawPayload as Record<string, unknown>
          if (!owned || recorded?.action !== input.action || recorded?.draftId !== input.draftId) return reply({ success: false, error: 'Chave não corresponde ao rascunho e autoria.' }, 409, correlationId)
          return reply({ success: true, alreadyProcessed: true, action: input.action }, 200, correlationId)
        }
        const [draft] = await db.select().from(sofiaDrafts).where(and(
          eq(sofiaDrafts.id, input.draftId),
          draftOwnership(input),
          sql`${sofiaDrafts.status} in (${SOFIA_DRAFT_STATUS.COLLECTING}, ${SOFIA_DRAFT_STATUS.PENDING_REVIEW})`,
        )).limit(1)
        if (!draft) return reply({ success: false, error: 'Rascunho em coleta não encontrado para esta conversa.' }, 409, correlationId)
        const previous = draft.draftPayload as Record<string, unknown>
        const next = normalizeDocumentDraft(previous, input as unknown as Record<string, unknown>)
        if (input.documentFields) {
          const selected = await selectSofiaDocumentTemplate(input.docType || (typeof previous.docType === 'string' ? previous.docType : 'ORCAMENTO'), input.templateId || (typeof previous.templateId === 'string' ? previous.templateId : undefined))
          if (!selected || unknownDocumentFields(selected.fieldSchema, input.documentFields).length) return reply({ success: false, error: 'Campos não pertencem ao modelo ativo.' }, 422, correlationId)
          if (unknownDocumentFields(selected.fieldSchema, next.documentFields as Record<string, string>).length) return reply({ success: false, error: 'O rascunho contém campos de outro modelo.' }, 422, correlationId)
          next.templateId = selected.id
          next.docType = selected.docType
        }
        const contract = documentDraftContract(next)
        const pendingFields = pendingDraftFields(next as any); const status = contract.nextAction === 'review_draft' ? SOFIA_DRAFT_STATUS.PENDING_REVIEW : SOFIA_DRAFT_STATUS.COLLECTING
        const [updated] = await db.transaction(async tx => {
          const [row] = await tx.update(sofiaDrafts).set({ draftPayload: next, pendingFields, conversationSummary: input.conversationSummary, status, updatedAt: new Date() }).where(and(eq(sofiaDrafts.id, draft.id), eq(sofiaDrafts.status, draft.status))).returning()
          if (!row) throw new Error('DRAFT_NOT_COLLECTING')
          await tx.insert(sofiaEvents).values({ senderPhone: input.senderPhone, idempotencyKey: correlationId, rawPayload: { action: input.action, draftId: draft.id, receivedFields: Object.keys(input).filter(key => !['conversationSummary'].includes(key)) }, intentDetected: draft.intent, status })
          return [row]
        })
        return reply({ success: true, action: input.action, draftId: updated.id, review: await reviewPortalDraft(updated.id, next), pendingFields, confirmedValues: contract.confirmedValues, missingRequiredFields: contract.missingRequiredFields, missingOptionalFields: contract.missingOptionalFields, optionalOmissionConsent: contract.optionalOmissionConsent, nextAction: contract.nextAction }, 200, correlationId)
      }
      if (input.action === 'issue_service_draft') {
        const [replay] = await db.select({ rawPayload: sofiaEvents.rawPayload, senderPhone: sofiaEvents.senderPhone, status: sofiaEvents.status }).from(sofiaEvents).where(eq(sofiaEvents.idempotencyKey, correlationId)).limit(1)
        if (replay) {
          const recorded = replay.rawPayload as Record<string, unknown> | null
          if (replay.senderPhone !== input.senderPhone || replay.status !== 'PROCESSED' || recorded?.action !== 'issue_service_draft' || recorded.draftId !== input.draftId || typeof recorded.documentId !== 'string') return reply({ success: false, action: input.action, error: 'Reprocessamento inconclusivo: chave não corresponde à emissão solicitada.' }, 409, correlationId)
          const [owned] = await db.select({ id: sofiaDrafts.id, status: sofiaDrafts.status }).from(sofiaDrafts).where(and(eq(sofiaDrafts.id, input.draftId), draftOwnership(input))).limit(1)
          const [document] = owned && owned.status === SOFIA_DRAFT_STATUS.CONVERTED ? await db.select({ id: officialDocuments.id, docNumber: officialDocuments.docNumber, docType: officialDocuments.docType, totalValue: officialDocuments.totalValue, htmlSnapshot: officialDocuments.htmlSnapshot, createdById: officialDocuments.createdById, externalAuthor: officialDocuments.externalAuthor }).from(officialDocuments).where(eq(officialDocuments.id, recorded.documentId)).limit(1) : []
          if (!document) return reply({ success: false, action: input.action, error: 'Reprocessamento inconclusivo: documento não encontrado para este rascunho.' }, 409, correlationId)
          if (externalAuthor) {
            const author = document.externalAuthor as CentralDocumentAuthor | null
            if (!author || author.kind !== externalAuthor.kind || author.grantId !== externalAuthor.grantId || author.hubId !== externalAuthor.hubId || author.senderPhone !== externalAuthor.senderPhone) return reply({ success: false, error: 'Autoria da emissão não corresponde.' }, 409, correlationId)
          } else {
            const [actor] = await db.select({ id: users.id }).from(users).where(and(eq(users.phone, input.senderPhone.replace(/\D/g, '')), eq(users.isActive, true))).limit(1)
            if (!actor || actor.id !== document.createdById) return reply({ success: false, error: 'Emissor não corresponde.' }, 409, correlationId)
          }
          return reply({ success: true, alreadyProcessed: true, action: input.action, draftId: owned!.id, documentId: document.id, docNumber: document.docNumber, docType: document.docType, totalValue: document.totalValue, htmlSnapshot: document.htmlSnapshot }, 200, correlationId)
        }
        const issued = await issueDraftDocument({
          draftId: input.draftId,
          senderPhone: input.senderPhone,
          centralHubId: input.centralHubId,
          centralContactId: input.centralContactId,
          centralClientId: input.centralClientId,
          centralRole: input.centralRole,
          centralGrantId: 'centralGrantId' in input ? input.centralGrantId : undefined,
          confirmed: input.confirmed,
          reviewVersion: input.reviewVersion,
          docType: input.docType,
          amount: input.amount,
          paymentMethod: input.paymentMethod,
          templateId: input.templateId,
          documentFields: input.documentFields,
          supersedesDocumentId: input.supersedesDocumentId,
          correlationId,
        }, externalAuthor)
        if (!issued.ok) {
          if (issued.pendingFields) return reply({ success: false, operationCompleted: false, action: input.action, draftId: input.draftId, nextAction: 'collect_document_fields', pendingFields: issued.pendingFields, error: issued.error }, issued.status, correlationId)
          return reply({ success: false, action: input.action, error: issued.error }, issued.status, correlationId)
        }
        // The document HTML references its A4 template backgrounds with root-relative
        // URLs (/documents/templates/…). Return this Hub's PUBLIC origin so the caller
        // renders the PDF with the official template instead of a blank page. Behind a
        // proxy the container's own req.url host is internal, so prefer the forwarded
        // host header, then a configured public URL.
        const forwardedHost = (req.headers.get('x-forwarded-host') || req.headers.get('host') || '').split(',')[0].trim()
        const forwardedProto = (req.headers.get('x-forwarded-proto') || 'https').split(',')[0].trim()
        const assetBaseUrl = /^[a-z0-9.-]+(?::\d+)?$/i.test(forwardedHost) && !/^localhost|^127\./i.test(forwardedHost)
          ? `${forwardedProto === 'http' ? 'http' : 'https'}://${forwardedHost}`
          : (process.env.COOLIFY_URL || '').replace(/\/+$/, '')
        return reply({ success: true, action: input.action, ...issued.result, assetBaseUrl }, 201, correlationId)
      }
      const existing = await db.select({ id: sofiaDrafts.id, status: sofiaDrafts.status, pendingFields: sofiaDrafts.pendingFields, draftPayload: sofiaDrafts.draftPayload }).from(sofiaDrafts).where(and(eq(sofiaDrafts.correlationId, correlationId), draftOwnership(input))).limit(1)
      if (existing[0]) { const replay = documentDraftContract(existing[0].draftPayload as Record<string, unknown>); return reply({ success: true, alreadyProcessed: true, draftId: existing[0].id, pendingFields: existing[0].pendingFields, confirmedValues: replay.confirmedValues, missingRequiredFields: replay.missingRequiredFields, missingOptionalFields: replay.missingOptionalFields, optionalOmissionConsent: replay.optionalOmissionConsent, nextAction: replay.nextAction }, existing[0].status === SOFIA_DRAFT_STATUS.COLLECTING ? 202 : 200, correlationId) }
      const [collision] = await db.select({ id: sofiaDrafts.id }).from(sofiaDrafts).where(eq(sofiaDrafts.correlationId, correlationId)).limit(1)
      if (collision) return reply({ success: false, error: 'Chave de idempotência pertence a outra autoria.' }, 409, correlationId)
      if (input.documentFields) {
        const selected = await selectSofiaDocumentTemplate(input.docType || 'ORCAMENTO', input.templateId)
        if (!selected || unknownDocumentFields(selected.fieldSchema, input.documentFields).length) return reply({ success: false, error: 'Campos não pertencem ao modelo ativo.' }, 422, correlationId)
      }
      const canonical = normalizeDocumentDraft({}, input as unknown as Record<string, unknown>)
      const contract = documentDraftContract(canonical)
      const pendingFields = pendingDraftFields(canonical as any); const status = contract.nextAction === 'review_draft' ? SOFIA_DRAFT_STATUS.PENDING_REVIEW : SOFIA_DRAFT_STATUS.COLLECTING
      const [event] = await db.insert(sofiaEvents).values({ senderPhone: input.senderPhone, idempotencyKey: correlationId, rawPayload: input, intentDetected: input.intentDetected, status }).returning()
      const [draft] = await db.insert(sofiaDrafts).values({ correlationId, authorKind: externalAuthor ? 'central_sovereign' : 'legacy', centralGrantId: externalAuthor?.grantId, centralContactId: input.centralContactId, centralClientId: input.centralClientId, centralHubId: input.centralHubId, centralRole: input.centralRole, senderPhone: input.senderPhone, intent: input.intentDetected, status, draftPayload: canonical, pendingFields, conversationSummary: input.conversationSummary, sourceEventId: event.id }).returning()
      return reply({ success: true, action: input.action, draftId: draft.id, review: await reviewPortalDraft(draft.id, canonical), pendingFields, confirmedValues: contract.confirmedValues, missingRequiredFields: contract.missingRequiredFields, missingOptionalFields: contract.missingOptionalFields, optionalOmissionConsent: contract.optionalOmissionConsent, nextAction: contract.nextAction }, status === SOFIA_DRAFT_STATUS.COLLECTING ? 202 : 201, correlationId)
    }

    const domain = parseSofiaDomainAction(rawBody)
    if (domain.ok) {
      const { action, data } = domain
      if (action === 'create_catalog_service' || action === 'update_catalog_service' || action === 'archive_catalog_service') {
        const replay = await db.select({ id: sofiaEvents.id }).from(sofiaEvents).where(eq(sofiaEvents.idempotencyKey, correlationId)).limit(1)
        if (replay[0]) return reply({ success: true, alreadyProcessed: true, action }, 200, correlationId)
        const serviceId = String(data.serviceId || '')
        if (action === 'archive_catalog_service') {
          const [service] = await db.update(serviceCatalog).set({ status: 'INACTIVE', updatedAt: new Date() }).where(and(eq(serviceCatalog.id, serviceId), eq(serviceCatalog.status, 'ACTIVE'))).returning()
          if (!service) return reply({ success: false, error: 'Serviço ativo não encontrado.' }, 404, correlationId)
          await db.insert(sofiaEvents).values({ senderPhone: String((rawBody as Record<string, unknown>).senderPhone), idempotencyKey: correlationId, rawPayload: { action, serviceId }, intentDetected: 'service_catalog_archive', status: 'PROCESSED' })
          return reply({ success: true, action, service: { id: service.id, name: service.name, status: service.status } }, 200, correlationId)
        }
        const values: Record<string, unknown> = { updatedAt: new Date() }
        for (const key of ['name', 'category', 'description', 'basePrice', 'priceNotes', 'status'] as const) if (data[key] !== undefined) values[key] = clean(data[key], key === 'description' ? 2000 : 300)
        for (const key of ['warrantyDays', 'defaultDurationMinutes', 'displayOrder'] as const) if (data[key] !== undefined) values[key] = Number(data[key])
        for (const key of ['requiresInspection', 'isEmergencyEligible'] as const) if (data[key] !== undefined) values[key] = Boolean(data[key])
        let service: any
        if (action === 'create_catalog_service') [service] = await db.insert(serviceCatalog).values({ ...values, name: clean(data.name, 160), description: clean(data.description, 2000), basePrice: clean(data.basePrice, 32), category: clean(data.category, 80) || 'DESENTUPIMENTO', status: 'ACTIVE' } as any).returning()
        else [service] = await db.update(serviceCatalog).set(values as any).where(eq(serviceCatalog.id, serviceId)).returning()
        if (!service) return reply({ success: false, error: 'Serviço não encontrado.' }, 404, correlationId)
        await db.insert(sofiaEvents).values({ senderPhone: String((rawBody as Record<string, unknown>).senderPhone), idempotencyKey: correlationId, rawPayload: { action, serviceId: service.id }, intentDetected: action === 'create_catalog_service' ? 'service_catalog_create' : 'service_catalog_update', status: 'PROCESSED' })
        return reply({ success: true, action, service: { id: service.id, name: service.name, status: service.status } }, action === 'create_catalog_service' ? 201 : 200, correlationId)
      }
      if (action === 'list_stock') {
        const query = clean(data.query, 160)
        const rows = await db.select().from(insumos).where(query ? or(ilike(insumos.nome, `%${query}%`), ilike(insumos.categoria, `%${query}%`)) : undefined).orderBy(asc(insumos.nome), asc(insumos.id))
        return reply({ success: true, action, items: rows.slice(0, 50).map(safeStockSummary), coverage: { totalMatching: rows.length, returned: Math.min(rows.length, 50), limit: 50, hasMore: rows.length > 50 } }, 200, correlationId)
      }
      if (action === 'list_vehicles') {
        const rows = await db.select().from(vehicles).where(eq(vehicles.isActive, true)).orderBy(asc(vehicles.name)).limit(50)
        return reply({ success: true, action, vehicles: rows.map(safeVehicleSummary) }, 200, correlationId)
      }
      if (action === 'list_financial_entries' || action === 'get_financial_summary') {
        // No pre-limit: totals and list share one complete source snapshot.
        const rows = await db.select().from(financeiroLancamentos)
        const result = financialReadResult(rows, data)
        const { entries, ...metadata } = result
        if (action === 'get_financial_summary') return reply({ success: true, action, ...metadata, coverage: { ...metadata.coverage, returned: 0, limit: null, hasMore: false, entryListIncluded: false } }, 200, correlationId)
        return reply({ success: true, action, ...metadata, entries: entries.map(row => ({ id: row.id, type: row.tipo, amount: row.valor, description: row.descricao, category: row.categoria, date: row.data, launchDate: row.data, dueDate: null, status: row.status, clientId: row.clientId })) }, 200, correlationId)
      }
      if (action === 'list_teams') {
        const rows = await db.select().from(teams).orderBy(asc(teams.name)).limit(50)
        return reply({ success: true, action, teams: rows.map(row => ({ id: row.id, name: row.name, leaderName: row.leaderName, active: row.isActive })) }, 200, correlationId)
      }
      if (action === 'list_equipment') {
        const rows = await db.select().from(equipment).where(eq(equipment.isActive, true)).orderBy(asc(equipment.name)).limit(50)
        return reply({ success: true, action, equipment: rows.map(row => ({ id: row.id, name: row.name, code: row.code, active: row.isActive })) }, 200, correlationId)
      }
      if (action === 'list_agenda') {
        const now = new Date()
        const dates = { date: data.date as string | undefined, startDate: data.startDate as string | undefined, endDate: data.endDate as string | undefined, timeZone: data.timeZone as string }
        const range = resolveQueryRange(dates.date || dates.startDate ? dates : { ...dates, period: 'HOJE' }, now)
        const start = new Date(range.start!), end = new Date(range.endExclusive!)
        const [requests, events] = await Promise.all([
          db.select({ id: serviceRequests.id, code: serviceRequests.code, clientId: serviceRequests.clientId, clientName: clients.name, scheduledAt: serviceRequests.scheduledAt, status: serviceRequests.status, serviceType: serviceRequests.serviceType, assignedTeamId: serviceRequests.assignedTeamId, assignedTeamName: teams.name, archivedAt: serviceRequests.archivedAt })
            .from(serviceRequests).leftJoin(clients, eq(clients.id, serviceRequests.clientId)).leftJoin(teams, eq(teams.id, serviceRequests.assignedTeamId))
            .where(and(isNull(serviceRequests.archivedAt), gte(serviceRequests.scheduledAt, start), lt(serviceRequests.scheduledAt, end))),
          db.select({ id: agendaEvents.id, title: agendaEvents.title, description: agendaEvents.description, location: agendaEvents.location, startsAt: agendaEvents.startsAt, endsAt: agendaEvents.endsAt, status: agendaEvents.status, serviceRequestId: agendaEvents.serviceRequestId, clientId: agendaEvents.clientId, teamId: agendaEvents.teamId, vehicleId: agendaEvents.vehicleId, serviceRequestArchivedAt: serviceRequests.archivedAt })
            .from(agendaEvents).leftJoin(serviceRequests, eq(serviceRequests.id, agendaEvents.serviceRequestId))
            .where(and(ne(agendaEvents.status, 'ARCHIVED'), isNull(serviceRequests.archivedAt), lt(agendaEvents.startsAt, end), gt(agendaEvents.endsAt, start))),
        ])
        return reply({ success: true, action, ...agendaReadResult(requests, events, data, now) }, 200, correlationId)
      }
      if (action === 'list_service_requests') {
        const rows = await db.select({ id: serviceRequests.id, code: serviceRequests.code, clientId: serviceRequests.clientId, clientName: clients.name, status: serviceRequests.status, priority: serviceRequests.priority, serviceType: serviceRequests.serviceType, scheduledAt: serviceRequests.scheduledAt, totalAmount: serviceRequests.totalAmount, addressStreet: clientAddresses.street, addressNumber: clientAddresses.number, addressComplement: clientAddresses.complement, addressNeighborhood: clientAddresses.neighborhood, addressCity: clientAddresses.city, addressState: clientAddresses.state, assignedTeamId: serviceRequests.assignedTeamId, assignedTeamName: teams.name }).from(serviceRequests).leftJoin(clients, eq(clients.id, serviceRequests.clientId)).leftJoin(clientAddresses, and(eq(clientAddresses.id, serviceRequests.addressId), eq(clientAddresses.clientId, serviceRequests.clientId))).leftJoin(teams, eq(teams.id, serviceRequests.assignedTeamId)).where(isNull(serviceRequests.archivedAt)).orderBy(desc(serviceRequests.updatedAt), asc(serviceRequests.id)).limit(100)
        return reply({ success: true, action, requests: rows }, 200, correlationId)
      }
      if (action === 'list_documents') {
        const docType = clean(data.docType, 32)
        const rows = await db.select({ id: officialDocuments.id, docType: officialDocuments.docType, docNumber: officialDocuments.docNumber, clientId: officialDocuments.clientId, leadId: officialDocuments.leadId, clientName: clients.name, leadName: leads.name, serviceRequestId: officialDocuments.serviceRequestId, totalValue: officialDocuments.totalValue, status: officialDocuments.status, issuedAt: officialDocuments.issuedAt }).from(officialDocuments).leftJoin(clients, eq(officialDocuments.clientId, clients.id)).leftJoin(leads, eq(officialDocuments.leadId, leads.id)).where(docType ? eq(officialDocuments.docType, docType) : undefined).orderBy(desc(officialDocuments.updatedAt)).limit(100)
        const documents = rows.map(({ clientName, leadName, ...row }) => ({ ...row, recipientType: row.leadId ? 'lead' : 'client', recipientName: row.leadId ? leadName : clientName }))
        return reply({ success: true, action, documents }, 200, correlationId)
      }
      const replay = await db.select({ id: sofiaEvents.id }).from(sofiaEvents).where(eq(sofiaEvents.idempotencyKey, correlationId)).limit(1)
      if (replay[0]) return reply({ success: true, alreadyProcessed: true, action }, 200, correlationId)
      if (action === 'adjust_stock') {
        const itemId = String(data.itemId); const direction = String(data.direction) as 'ENTRADA' | 'SAIDA'
        const amount = Number(String(data.quantity).replace(',', '.'))
        const result = await db.transaction(async (tx) => {
          const [before] = await tx.select().from(insumos).where(eq(insumos.id, itemId)).limit(1)
          if (!before) return { error: 'Item de estoque não encontrado.', status: 404 as const }
          const validation = validateStockAdjustment(amount, { direction, available: Number(before.quantidade) })
          if (!validation.ok) return { error: validation.error, status: 422 as const }
          const delta = direction === 'ENTRADA' ? validation.quantity : -validation.quantity
          const [updated] = await tx.update(insumos).set({ quantidade: sql`${insumos.quantidade} + ${delta}`, updatedAt: new Date() }).where(direction === 'SAIDA' ? and(eq(insumos.id, itemId), gte(insumos.quantidade, validation.quantity.toFixed(2))) : eq(insumos.id, itemId)).returning()
          if (!updated) return { error: 'Estoque insuficiente para esta saída.', status: 422 as const }
          await tx.insert(stockMovements).values({ insumoId: itemId, direction, quantity: validation.quantity.toFixed(2), source: 'SOFIA' })
          await tx.insert(sofiaEvents).values({ senderPhone: String((rawBody as Record<string, unknown>).senderPhone), idempotencyKey: correlationId, rawPayload: { action, itemId, direction, amount: validation.quantity }, intentDetected: 'inventory_adjust', status: 'PROCESSED' })
          return { updated }
        })
        if ('error' in result) return reply({ success: false, error: result.error }, result.status, correlationId)
        return reply({ success: true, action, item: safeStockSummary(result.updated) }, 200, correlationId)
      }
      if (action === 'create_financial_entry') {
        const input = FinancialEntrySchema.safeParse({ tipo: data.type, valor: data.amount, descricao: data.description, categoria: data.category || 'GERAL', status: data.status || 'EFETIVADO', data: data.date })
        if (!input.success) return reply({ success: false, error: 'Lançamento financeiro inválido.' }, 422, correlationId)
        const [entry] = await db.insert(financeiroLancamentos).values({ tipo: input.data.tipo, valor: input.data.valor.toFixed(2), descricao: input.data.descricao, categoria: input.data.categoria || 'GERAL', status: input.data.status, data: new Date(`${input.data.data}T12:00:00.000Z`) }).returning()
        await db.insert(sofiaEvents).values({ senderPhone: String((rawBody as Record<string, unknown>).senderPhone), idempotencyKey: correlationId, rawPayload: { action, entryId: entry.id, type: entry.tipo, amount: entry.valor }, intentDetected: 'financial_create_entry', status: 'PROCESSED' })
        return reply({ success: true, action, entry: { id: entry.id, type: entry.tipo, amount: entry.valor, description: entry.descricao, status: entry.status } }, 201, correlationId)
      }
      if (action === 'update_financial_entry') {
        const values: Record<string, unknown> = { updatedAt: new Date() }
        if (data.type !== undefined) values.tipo = clean(data.type, 16)
        if (data.amount !== undefined) values.valor = String(data.amount).replace(',', '.')
        if (data.description !== undefined) values.descricao = clean(data.description, 300)
        if (data.category !== undefined) values.categoria = clean(data.category, 100) || null
        if (data.status !== undefined) values.status = clean(data.status, 16)
        if (data.date !== undefined) values.data = new Date(`${String(data.date)}T12:00:00.000Z`)
        const [entry] = await db.update(financeiroLancamentos).set(values as any).where(eq(financeiroLancamentos.id, String(data.entryId))).returning()
        if (!entry) return reply({ success: false, error: 'Lançamento financeiro não encontrado.' }, 404, correlationId)
        await db.insert(sofiaEvents).values({ senderPhone: String((rawBody as Record<string, unknown>).senderPhone), idempotencyKey: correlationId, rawPayload: { action, entryId: entry.id, fields: Object.keys(data).filter(key => key !== 'entryId') }, intentDetected: 'financial_update_entry', status: 'PROCESSED' })
        return reply({ success: true, action, entry: { id: entry.id, type: entry.tipo, amount: entry.valor, description: entry.descricao, status: entry.status } }, 200, correlationId)
      }
      if (action === 'create_team') {
        const [team] = await db.insert(teams).values({ name: clean(data.name, 160), leaderName: clean(data.leaderName, 160), phone: clean(data.phone, 32) || null, isActive: data.isActive !== false }).returning()
        await db.insert(sofiaEvents).values({ senderPhone: String((rawBody as Record<string, unknown>).senderPhone), idempotencyKey: correlationId, rawPayload: { action, teamId: team.id }, intentDetected: 'team_create', status: 'PROCESSED' })
        return reply({ success: true, action, team: { id: team.id, name: team.name, leaderName: team.leaderName, active: team.isActive } }, 201, correlationId)
      }
      if (action === 'update_team') {
        const values: Record<string, unknown> = { updatedAt: new Date() }; if (data.name !== undefined) values.name = clean(data.name, 160); if (data.leaderName !== undefined) values.leaderName = clean(data.leaderName, 160); if (data.phone !== undefined) values.phone = clean(data.phone, 32) || null; if (data.isActive !== undefined) values.isActive = data.isActive
        const [team] = await db.update(teams).set(values as any).where(eq(teams.id, String(data.teamId))).returning()
        if (!team) return reply({ success: false, error: 'Equipe não encontrada.' }, 404, correlationId)
        await db.insert(sofiaEvents).values({ senderPhone: String((rawBody as Record<string, unknown>).senderPhone), idempotencyKey: correlationId, rawPayload: { action, teamId: team.id, fields: Object.keys(data).filter(key => key !== 'teamId') }, intentDetected: 'team_update', status: 'PROCESSED' })
        return reply({ success: true, action, team: { id: team.id, name: team.name, leaderName: team.leaderName, active: team.isActive } }, 200, correlationId)
      }
      if (action === 'create_vehicle') {
        const [vehicle] = await db.insert(vehicles).values({ name: clean(data.name, 160), type: clean(data.type, 64), plate: clean(data.plate, 32) || null, isActive: data.isActive !== false }).returning()
        await db.insert(sofiaEvents).values({ senderPhone: String((rawBody as Record<string, unknown>).senderPhone), idempotencyKey: correlationId, rawPayload: { action, vehicleId: vehicle.id }, intentDetected: 'vehicle_create', status: 'PROCESSED' })
        return reply({ success: true, action, vehicle: safeVehicleSummary(vehicle) }, 201, correlationId)
      }
      if (action === 'update_vehicle') {
        const values: Record<string, unknown> = { updatedAt: new Date() }; if (data.name !== undefined) values.name = clean(data.name, 160); if (data.type !== undefined) values.type = clean(data.type, 64); if (data.plate !== undefined) values.plate = clean(data.plate, 32) || null; if (data.isActive !== undefined) values.isActive = data.isActive
        const [vehicle] = await db.update(vehicles).set(values as any).where(eq(vehicles.id, String(data.vehicleId))).returning()
        if (!vehicle) return reply({ success: false, error: 'Veículo não encontrado.' }, 404, correlationId)
        await db.insert(sofiaEvents).values({ senderPhone: String((rawBody as Record<string, unknown>).senderPhone), idempotencyKey: correlationId, rawPayload: { action, vehicleId: vehicle.id, fields: Object.keys(data).filter(key => key !== 'vehicleId') }, intentDetected: 'vehicle_update', status: 'PROCESSED' })
        return reply({ success: true, action, vehicle: safeVehicleSummary(vehicle) }, 200, correlationId)
      }
      if (action === 'create_equipment') {
        const [item] = await db.insert(equipment).values({ name: clean(data.name, 160), code: clean(data.code, 64) || null, isActive: data.isActive !== false }).returning()
        await db.insert(sofiaEvents).values({ senderPhone: String((rawBody as Record<string, unknown>).senderPhone), idempotencyKey: correlationId, rawPayload: { action, equipmentId: item.id }, intentDetected: 'equipment_create', status: 'PROCESSED' })
        return reply({ success: true, action, equipment: { id: item.id, name: item.name, code: item.code, active: item.isActive } }, 201, correlationId)
      }
      if (action === 'update_equipment') {
        const values: Record<string, unknown> = { updatedAt: new Date() }; if (data.name !== undefined) values.name = clean(data.name, 160); if (data.code !== undefined) values.code = clean(data.code, 64) || null; if (data.isActive !== undefined) values.isActive = data.isActive
        const [item] = await db.update(equipment).set(values as any).where(eq(equipment.id, String(data.equipmentId))).returning()
        if (!item) return reply({ success: false, error: 'Equipamento não encontrado.' }, 404, correlationId)
        await db.insert(sofiaEvents).values({ senderPhone: String((rawBody as Record<string, unknown>).senderPhone), idempotencyKey: correlationId, rawPayload: { action, equipmentId: item.id, fields: Object.keys(data).filter(key => key !== 'equipmentId') }, intentDetected: 'equipment_update', status: 'PROCESSED' })
        return reply({ success: true, action, equipment: { id: item.id, name: item.name, code: item.code, active: item.isActive } }, 200, correlationId)
      }
      if (action === 'update_service_request') {
        const values: Record<string, unknown> = { updatedAt: new Date() }
        const textFields: Array<[string, string, number]> = [['leadStatus','leadStatus',32],['priority','priority',32],['serviceType','serviceType',64],['problemReported','problemReported',2000],['problemFound','problemFound',2000],['status','status',32],['paymentMethod','paymentMethod',64],['internalNotes','internalNotes',4000],['customerNotes','customerNotes',4000],['cancelReason','cancelReason',2000]]
        for (const [source, target, limit] of textFields) if (data[source] !== undefined) values[target] = clean(data[source], limit) || null
        for (const [source, target] of [['assignedTeamId','assignedTeamId'],['vehicleId','vehicleId'],['equipmentId','equipmentId']] as const) if (data[source] !== undefined) values[target] = data[source]
        if (data.totalAmount !== undefined) values.totalAmount = String(data.totalAmount).replace(',', '.')
        if (data.warrantyDays !== undefined) values.warrantyDays = Number(data.warrantyDays)
        if (data.scheduledAt !== undefined) values.scheduledAt = data.scheduledAt ? new Date(String(data.scheduledAt)) : null
        const [request] = await db.update(serviceRequests).set(values as any).where(and(eq(serviceRequests.id, String(data.requestId)), isNull(serviceRequests.archivedAt))).returning()
        if (!request) return reply({ success: false, error: 'Chamado não encontrado.' }, 404, correlationId)
        await db.insert(sofiaEvents).values({ senderPhone: String((rawBody as Record<string, unknown>).senderPhone), idempotencyKey: correlationId, rawPayload: { action, requestId: request.id, fields: Object.keys(data).filter(key => key !== 'requestId') }, intentDetected: 'service_request_update', status: 'PROCESSED' })
        return reply({ success: true, action, request: { id: request.id, code: request.code, status: request.status } }, 200, correlationId)
      }
      if (action === 'update_document') return reply({ success: false, error: 'Documento oficial é imutável. Emita uma nova versão para alterar seus dados.' }, 409, correlationId)
      if (action === 'archive_document') {
        const documentId = String(data.documentId)
        const [localActor] = externalAuthor ? [] : await db.select({id:users.id}).from(users).where(eq(users.phone, normalizeRrdPhone(envelope.senderPhone)!)).limit(1)
        if (!externalAuthor && !localActor) return reply({success:false,error:'Autor não identificado.'},403,correlationId)
        const archived = await archiveOfficialDocument(documentId, externalAuthor ?? localActor!.id, correlationId)
        if (!archived.ok) return reply({ success: false, error: archived.error }, archived.status, correlationId)
        await db.insert(sofiaEvents).values({ senderPhone: String((rawBody as Record<string, unknown>).senderPhone), idempotencyKey: correlationId, rawPayload: { action, documentId }, intentDetected: 'document_archive', status: 'PROCESSED' })
        return reply({ success: true, action, document: archived.document }, 200, correlationId)
      }
      if (action === 'delete_document') {
        const documentId = String(data.documentId)
        const [doc] = await db.select({ id: officialDocuments.id }).from(officialDocuments).where(eq(officialDocuments.id, documentId)).limit(1)
        if (!doc) return reply({ success: false, error: 'Documento não encontrado.' }, 404, correlationId)
        const blockers = await documentPurgeCounts(documentId)
        if (blockers.attachments > 0 && data.force !== true) {
          return reply({ success: false, action, error: 'Documento tem anexos vinculados. Confirme com force=true para excluir tudo.', blockers }, 409, correlationId)
        }
        const [localActor] = externalAuthor ? [] : await db.select({ id: users.id }).from(users).where(eq(users.phone, normalizeRrdPhone(envelope.senderPhone)!)).limit(1)
        if (!externalAuthor && !localActor) return reply({ success: false, error: 'Autor não identificado.' }, 403, correlationId)
        const removed = await purgeDocumentRecord(documentId, { actorUserId: externalAuthor ? null : localActor!.id, reason: 'sofia-delete-document' })
        if (!removed.document) return reply({ success: false, error: 'Documento não encontrado.' }, 404, correlationId)
        await db.insert(sofiaEvents).values({ senderPhone: String((rawBody as Record<string, unknown>).senderPhone), idempotencyKey: correlationId, rawPayload: { action, documentId, removed }, intentDetected: 'document_delete', status: 'PROCESSED' })
        return reply({ success: true, action, removed }, 200, correlationId)
      }
      const vehicleName = clean(data.vehicleName, 160)
      const matches = data.vehicleId
        ? await db.select().from(vehicles).where(eq(vehicles.id, String(data.vehicleId))).limit(1)
        : await db.select().from(vehicles).where(and(eq(vehicles.isActive, true), ilike(vehicles.name, vehicleName))).limit(2)
      if (!matches.length) return reply({ success: false, error: 'Veículo não encontrado.' }, 404, correlationId)
      if (matches.length > 1) return reply({ success: false, error: 'Mais de um veículo encontrado; especifique o nome completo.' }, 409, correlationId)
      const vehicle = matches[0]
      const [archived] = await db.update(vehicles).set({ isActive: false, updatedAt: new Date() }).where(and(eq(vehicles.id, vehicle.id), eq(vehicles.isActive, true))).returning()
      await db.insert(sofiaEvents).values({ senderPhone: String((rawBody as Record<string, unknown>).senderPhone), idempotencyKey: correlationId, rawPayload: { action, vehicleId: vehicle.id }, intentDetected: 'fleet_archive_vehicle', status: 'PROCESSED' })
      return reply({ success: true, action, vehicle: safeVehicleSummary(archived || vehicle) }, 200, correlationId)
    }

    const parsed = parseSofiaClientAction(rawBody)
    if (!parsed.ok) return reply({ success: false, error: parsed.error }, 422, correlationId)
    const { action, data } = parsed
    if (action !== 'list_clients') { const replay = await db.select().from(sofiaEvents).where(eq(sofiaEvents.idempotencyKey, correlationId)).limit(1); if (replay.length) return reply({ success: true, alreadyProcessed: true, action }, 200, correlationId) }
    if (action === 'list_clients') { const rows = await db.select().from(clients).where(eq(clients.isActive, true)).orderBy(desc(clients.updatedAt)).limit(50); return reply({ success: true, action, clients: rows.map(safeClientSummary) }, 200, correlationId) }
    if (action === 'get_client_profile') {
      const clientId = typeof data.clientId === 'string' ? data.clientId : null
      const name = typeof data.name === 'string' ? clean(data.name, 160) : ''
      const nameTerms = name.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(term => term.length >= 2).slice(0, 8)
      const matches = clientId
        ? await db.select().from(clients).where(and(eq(clients.id, clientId), eq(clients.isActive, true))).limit(2)
        : nameTerms.length && !/[%_]/.test(name)
          ? await db.select().from(clients).where(and(eq(clients.isActive, true), ...nameTerms.map(term => ilike(clients.name, `%${term}%`)))).limit(2)
          : []
      if (!matches.length) return reply({ success: false, error: 'Cliente não encontrado.' }, 404, correlationId)
      if (matches.length > 1) return reply({ success: false, error: 'Mais de um cliente encontrado; informe o nome completo.' }, 409, correlationId)
      const client = matches[0]
      const [address, serviceRows, financialRows] = await Promise.all([
        db.select().from(clientAddresses).where(and(eq(clientAddresses.clientId, client.id), eq(clientAddresses.isMain, true))).limit(1),
        db.select().from(serviceRequests).where(eq(serviceRequests.clientId, client.id)).orderBy(desc(serviceRequests.completedAt), desc(serviceRequests.createdAt)).limit(100),
        db.select().from(financeiroLancamentos).where(eq(financeiroLancamentos.clientId, client.id)).orderBy(desc(financeiroLancamentos.data)).limit(200),
      ])
      const profile = buildCrmProfile({ client, services: serviceRows, financial: financialRows })
      return reply({ success: true, action, client: {
        id: client.id, name: client.name, type: client.type, document: client.document, phone: client.phone, email: client.email,
        contactPerson: client.contactPerson, source: client.source, recurrence: client.recurrence, customerSince: client.customerSince,
        lastContactAt: client.lastContactAt, nextVisitAt: client.nextVisitAt, notes: client.notes, active: client.isActive,
        address: address[0] ? { street: address[0].street, number: address[0].number, complement: address[0].complement, neighborhood: address[0].neighborhood, city: address[0].city, state: address[0].state, zipCode: address[0].zipCode, referencePoint: address[0].referencePoint, serviceAccessNotes: address[0].serviceAccessNotes } : null,
        profile,
      } }, 200, correlationId)
    }
    if (action === 'create_client') {
      const phone = String(data.phone).trim(); const name = String(data.name).trim()
      const [client] = await db.insert(clients).values({ type: typeof data.type === 'string' ? data.type.slice(0, 32) : 'PF', name, phone, normalizedPhone: digits(phone), document: data.document ? digits(data.document) : null, email: typeof data.email === 'string' ? data.email.slice(0, 160) : null, contactPerson: typeof data.contactPerson === 'string' ? data.contactPerson.slice(0, 160) : null, source: typeof data.source === 'string' ? data.source.slice(0, 32) : undefined, recurrence: typeof data.recurrence === 'string' ? data.recurrence.slice(0, 32) : undefined, notes: typeof data.notes === 'string' ? data.notes.slice(0, 2000) : null }).returning()
      await db.insert(clientAddresses).values({ clientId: client.id, street: clean(data.street, 180) || 'Endereço a confirmar', number: clean(data.number, 32) || 'S/N', complement: clean(data.complement, 120) || null, floorOrUnit: clean(data.floorOrUnit, 120) || null, neighborhood: clean(data.neighborhood, 120) || 'Bairro a confirmar', city: clean(data.city, 120) || 'Niterói', state: clean(data.state, 2).toUpperCase() || 'RJ', zipCode: clean(data.zipCode, 16) || null, referencePoint: clean(data.referencePoint, 200) || null, serviceAccessNotes: clean(data.serviceAccessNotes, 2000) || null, propertyType: clean(data.propertyType, 64) || undefined, needsCondominiumAuthorization: data.needsCondominiumAuthorization === true })
      await db.insert(sofiaEvents).values({ senderPhone: String((rawBody as Record<string, unknown>).senderPhone), idempotencyKey: correlationId, rawPayload: { action, clientId: client.id }, intentDetected: 'crm_create_client', status: 'PROCESSED' })
      return reply({ success: true, action, client: safeClientSummary(client) }, 201, correlationId)
    }
    const id = String(data.clientId); const [client] = await db.select().from(clients).where(eq(clients.id, id)).limit(1)
    if (!client) return reply({ success: false, error: 'Cliente não encontrado.' }, 404, correlationId)
    if (action === 'archive_client') {
      const [archived] = await db.update(clients).set({ isActive: false, updatedAt: new Date() }).where(and(eq(clients.id, id), eq(clients.isActive, true))).returning()
      if (!archived) return reply({ success: false, error: 'Cliente ativo não encontrado.' }, 404, correlationId)
      await db.insert(sofiaEvents).values({ senderPhone: String((rawBody as Record<string, unknown>).senderPhone), idempotencyKey: correlationId, rawPayload: { action, clientId: id }, intentDetected: 'crm_archive_client', status: 'PROCESSED' })
      return reply({ success: true, action, client: safeClientSummary(archived) }, 200, correlationId)
    }
    if (action === 'delete_client') {
      const blockers = await clientPurgeCounts(id)
      if (clientPurgeHasHistory(blockers) && data.force !== true) {
        return reply({ success: false, action, error: 'Cliente tem histórico vinculado (documentos, chamados, propostas ou anexos). Confirme com force=true para excluir tudo.', blockers }, 409, correlationId)
      }
      const sender = String((rawBody as Record<string, unknown>).senderPhone)
      const [actor] = await db.select({ id: users.id }).from(users).where(and(eq(users.phone, normalizeRrdPhone(sender) ?? sender.replace(/\D/g, '')), eq(users.isActive, true))).limit(1)
      const removed = await purgeClientRecords(id, { actorUserId: actor?.id ?? null, reason: 'sofia-delete-client' })
      if (!removed.client) return reply({ success: false, error: 'Cliente não encontrado.' }, 404, correlationId)
      await db.insert(sofiaEvents).values({ senderPhone: sender, idempotencyKey: correlationId, rawPayload: { action, clientId: id, removed }, intentDetected: 'crm_delete_client', status: 'PROCESSED' })
      return reply({ success: true, action, client: { id, name: client.name }, removed }, 200, correlationId)
    }
    const updates: Record<string, unknown> = { updatedAt: new Date() }
    if (data.name !== undefined) updates.name = clean(data.name, 160)
    if (data.phone !== undefined) { updates.phone = clean(data.phone, 32); updates.normalizedPhone = digits(data.phone) }
    if (data.document !== undefined) updates.document = data.document ? digits(data.document) : null
    if (data.email !== undefined) updates.email = clean(data.email, 160) || null
    if (data.contactPerson !== undefined) updates.contactPerson = clean(data.contactPerson, 160) || null
    if (data.notes !== undefined) updates.notes = clean(data.notes, 4000) || null
    if (data.type !== undefined) updates.type = clean(data.type, 32)
    if (data.source !== undefined) updates.source = clean(data.source, 32) || null
    if (data.recurrence !== undefined) updates.recurrence = clean(data.recurrence, 32)
    for (const [source, target] of [['customerSince', 'customerSince'], ['lastContactAt', 'lastContactAt'], ['nextVisitAt', 'nextVisitAt']] as const) {
      if (data[source] !== undefined) { const parsed = data[source] ? new Date(String(data[source])) : null; if (parsed && Number.isNaN(parsed.getTime())) return reply({ success: false, error: 'Data CRM inválida.' }, 422, correlationId); updates[target] = parsed }
    }
    const [updated] = await db.update(clients).set(updates as any).where(eq(clients.id, id)).returning()
    if (data.street !== undefined || data.number !== undefined || data.complement !== undefined || data.floorOrUnit !== undefined || data.neighborhood !== undefined || data.city !== undefined || data.state !== undefined || data.zipCode !== undefined || data.referencePoint !== undefined || data.serviceAccessNotes !== undefined || data.propertyType !== undefined || data.needsCondominiumAuthorization !== undefined) {
      const addressUpdates: Record<string, unknown> = { updatedAt: new Date() }
      const addressFields: Array<[string, string, number]> = [['street','street',160],['number','number',32],['complement','complement',120],['floorOrUnit','floorOrUnit',120],['neighborhood','neighborhood',120],['city','city',120],['state','state',2],['zipCode','zipCode',16],['referencePoint','referencePoint',200],['serviceAccessNotes','serviceAccessNotes',2000],['propertyType','propertyType',64]]
      for (const [source, target, limit] of addressFields) if (data[source] !== undefined) addressUpdates[target] = clean(data[source], limit)
      if (data.state !== undefined) addressUpdates.state = String(addressUpdates.state).toUpperCase()
      if (data.needsCondominiumAuthorization !== undefined) addressUpdates.needsCondominiumAuthorization = data.needsCondominiumAuthorization
      const [existingAddress] = await db.select().from(clientAddresses).where(and(eq(clientAddresses.clientId, id), eq(clientAddresses.isMain, true))).limit(1)
      if (existingAddress) await db.update(clientAddresses).set(addressUpdates as any).where(eq(clientAddresses.id, existingAddress.id))
      else await db.insert(clientAddresses).values({ clientId: id, street: String(addressUpdates.street || 'Endereço a confirmar'), number: String(addressUpdates.number || 'S/N'), neighborhood: String(addressUpdates.neighborhood || 'Bairro a confirmar'), city: String(addressUpdates.city || 'Niterói'), state: String(addressUpdates.state || 'RJ'), complement: addressUpdates.complement as string | undefined, floorOrUnit: addressUpdates.floorOrUnit as string | undefined, zipCode: addressUpdates.zipCode as string | undefined, referencePoint: addressUpdates.referencePoint as string | undefined, serviceAccessNotes: addressUpdates.serviceAccessNotes as string | undefined, propertyType: addressUpdates.propertyType as string | undefined, needsCondominiumAuthorization: addressUpdates.needsCondominiumAuthorization as boolean | undefined, isMain: true })
    }
    await db.insert(sofiaEvents).values({ senderPhone: String((rawBody as Record<string, unknown>).senderPhone), idempotencyKey: correlationId, rawPayload: { action, clientId: id, fields: Object.keys(data).filter(key => key !== 'clientId') }, intentDetected: 'crm_update_client', status: 'PROCESSED' })
    return reply({ success: true, action, client: safeClientSummary(updated) }, 200, correlationId)
  } catch { return reply({ success: false, error: 'Falha ao executar operação Sofia.' }, 500, correlationId) }
}
