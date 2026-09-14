import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'node:crypto'
import { and, asc, desc, eq, gte, ilike, or, sql } from 'drizzle-orm'
import { db, clientAddresses, clients, equipment, financeiroLancamentos, insumos, officialDocuments, serviceCatalog, serviceRequests, sofiaEvents, sofiaDrafts, SOFIA_DRAFT_STATUS, teams, vehicles } from '@/db'
import { SofiaActionRequest, pendingDraftFields, digits, parseSofiaClientAction, parseSofiaDomainAction, safeClientSummary, safeStockSummary, safeVehicleSummary } from '@/lib/sofia-actions'
import { buildCrmProfile } from '@/lib/crm-profile'
import { VERSION } from '@/lib/version'

const header = (correlationId?: string) => ({ 'X-Hub-Version': VERSION, ...(correlationId ? { 'X-Correlation-Id': correlationId } : {}) })
const reply = (body: unknown, status = 200, correlationId?: string) => NextResponse.json(body, { status, headers: header(correlationId) })
const clean = (value: unknown, max: number) => typeof value === 'string' ? value.trim().slice(0, max) : ''
function authorized(req: NextRequest) {
  const secret = process.env.SOFIA_HUB_SECRET; const value = req.headers.get('authorization')
  if (!secret) return { ok: false as const, status: 503, error: 'Endpoint Sofia não configurado.' }
  if (!value?.startsWith('Bearer ')) return { ok: false as const, status: 401, error: 'Authorization Bearer obrigatório.' }
  const token = value.slice(7)
  if (token.length !== secret.length || !timingSafeEqual(Buffer.from(token), Buffer.from(secret))) return { ok: false as const, status: 401, error: 'Não autorizado.' }
  return { ok: true as const }
}
function centralHubMatches(raw: unknown) { return Boolean(raw && typeof raw === 'object' && !Array.isArray(raw) && (raw as Record<string, unknown>).centralHubId === process.env.RRD_HUB_ID) }

export async function POST(req: NextRequest) {
  const auth = authorized(req); if (!auth.ok) return reply({ success: false, error: auth.error }, auth.status)
  if (!db) return reply({ success: false, error: 'Banco de dados indisponível.' }, 503)
  const correlationId = req.headers.get('idempotency-key') || req.headers.get('x-correlation-id') || ''
  if (!/^[A-Za-z0-9:_-]{8,160}$/.test(correlationId)) return reply({ success: false, error: 'Chave de idempotência obrigatória.' }, 400)
  const rawBody = await req.json().catch(() => null)
  if (!centralHubMatches(rawBody)) return reply({ success: false, error: 'Hub central não autorizado.' }, 403, correlationId)
  try {
    const operational = SofiaActionRequest.safeParse(rawBody)
    if (operational.success) {
      const input = operational.data
      if (input.action === 'list_services') {
        const services = await db.select({ name: serviceCatalog.name, category: serviceCatalog.category, description: serviceCatalog.description, basePrice: serviceCatalog.basePrice, priceNotes: serviceCatalog.priceNotes, requiresInspection: serviceCatalog.requiresInspection, emergencyEligible: serviceCatalog.isEmergencyEligible }).from(serviceCatalog).where(eq(serviceCatalog.status, 'ACTIVE')).orderBy(asc(serviceCatalog.displayOrder), asc(serviceCatalog.name)).limit(50)
        return reply({ success: true, action: input.action, services }, 200, correlationId)
      }
      if (input.action === 'list_active_teams') {
        const activeTeams = await db.select({ name: teams.name, leaderName: teams.leaderName }).from(teams).where(eq(teams.isActive, true)).orderBy(asc(teams.name)).limit(20)
        return reply({ success: true, action: input.action, teams: activeTeams }, 200, correlationId)
      }
      const existing = await db.select({ id: sofiaDrafts.id, status: sofiaDrafts.status, pendingFields: sofiaDrafts.pendingFields }).from(sofiaDrafts).where(eq(sofiaDrafts.correlationId, correlationId)).limit(1)
      if (existing[0]) return reply({ success: true, alreadyProcessed: true, draftId: existing[0].id, pendingFields: existing[0].pendingFields }, existing[0].status === SOFIA_DRAFT_STATUS.COLLECTING ? 202 : 200, correlationId)
      const pendingFields = pendingDraftFields(input); const status = pendingFields.length ? SOFIA_DRAFT_STATUS.COLLECTING : SOFIA_DRAFT_STATUS.PENDING_REVIEW
      const [event] = await db.insert(sofiaEvents).values({ senderPhone: input.senderPhone, idempotencyKey: correlationId, rawPayload: input, intentDetected: input.intentDetected, status }).returning()
      const [draft] = await db.insert(sofiaDrafts).values({ correlationId, centralContactId: input.centralContactId, centralClientId: input.centralClientId, centralHubId: input.centralHubId, centralRole: input.centralRole, senderPhone: input.senderPhone, intent: input.intentDetected, status, draftPayload: input, pendingFields, conversationSummary: input.conversationSummary, sourceEventId: event.id }).returning()
      return reply({ success: true, action: input.action, draftId: draft.id, pendingFields, nextAction: pendingFields.length ? 'collect_missing_fields' : 'review_draft' }, pendingFields.length ? 202 : 201, correlationId)
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
        const rows = await db.select().from(insumos).where(query ? or(ilike(insumos.nome, `%${query}%`), ilike(insumos.categoria, `%${query}%`)) : undefined).orderBy(asc(insumos.nome)).limit(50)
        return reply({ success: true, action, items: rows.map(safeStockSummary) }, 200, correlationId)
      }
      if (action === 'list_vehicles') {
        const rows = await db.select().from(vehicles).where(eq(vehicles.isActive, true)).orderBy(asc(vehicles.name)).limit(50)
        return reply({ success: true, action, vehicles: rows.map(safeVehicleSummary) }, 200, correlationId)
      }
      if (action === 'list_financial_entries') {
        const rows = await db.select().from(financeiroLancamentos).orderBy(desc(financeiroLancamentos.data)).limit(100)
        return reply({ success: true, action, entries: rows.map(row => ({ id: row.id, type: row.tipo, amount: row.valor, description: row.descricao, category: row.categoria, date: row.data, status: row.status, clientId: row.clientId })) }, 200, correlationId)
      }
      if (action === 'get_financial_summary') {
        const rows = await db.select().from(financeiroLancamentos).limit(500)
        const summary = rows.reduce((acc, row) => { const value = Number(row.valor) || 0; if (row.status === 'EFETIVADO' && row.tipo === 'RECEITA') acc.revenue += value; if (row.status === 'EFETIVADO' && row.tipo === 'DESPESA') acc.expenses += value; if (row.status === 'PENDENTE' && row.tipo === 'RECEITA') acc.receivable += value; if (row.status === 'PENDENTE' && row.tipo === 'DESPESA') acc.payable += value; return acc }, { revenue: 0, expenses: 0, receivable: 0, payable: 0 })
        return reply({ success: true, action, summary: { ...summary, cash: summary.revenue - summary.expenses } }, 200, correlationId)
      }
      if (action === 'list_teams') {
        const rows = await db.select().from(teams).orderBy(asc(teams.name)).limit(50)
        return reply({ success: true, action, teams: rows.map(row => ({ id: row.id, name: row.name, leaderName: row.leaderName, active: row.isActive })) }, 200, correlationId)
      }
      if (action === 'list_equipment') {
        const rows = await db.select().from(equipment).where(eq(equipment.isActive, true)).orderBy(asc(equipment.name)).limit(50)
        return reply({ success: true, action, equipment: rows.map(row => ({ id: row.id, name: row.name, code: row.code, active: row.isActive })) }, 200, correlationId)
      }
      if (action === 'list_service_requests') {
        const rows = await db.select({ id: serviceRequests.id, code: serviceRequests.code, clientId: serviceRequests.clientId, status: serviceRequests.status, priority: serviceRequests.priority, serviceType: serviceRequests.serviceType, scheduledAt: serviceRequests.scheduledAt, totalAmount: serviceRequests.totalAmount }).from(serviceRequests).orderBy(desc(serviceRequests.updatedAt)).limit(100)
        return reply({ success: true, action, requests: rows }, 200, correlationId)
      }
      if (action === 'list_documents') {
        const docType = clean(data.docType, 32)
        const rows = await db.select({ id: officialDocuments.id, docType: officialDocuments.docType, docNumber: officialDocuments.docNumber, clientId: officialDocuments.clientId, serviceRequestId: officialDocuments.serviceRequestId, totalValue: officialDocuments.totalValue, status: officialDocuments.status, issuedAt: officialDocuments.issuedAt }).from(officialDocuments).where(docType ? eq(officialDocuments.docType, docType) : undefined).orderBy(desc(officialDocuments.updatedAt)).limit(100)
        return reply({ success: true, action, documents: rows }, 200, correlationId)
      }
      const replay = await db.select({ id: sofiaEvents.id }).from(sofiaEvents).where(eq(sofiaEvents.idempotencyKey, correlationId)).limit(1)
      if (replay[0]) return reply({ success: true, alreadyProcessed: true, action }, 200, correlationId)
      if (action === 'adjust_stock') {
        const itemId = String(data.itemId); const amount = Number(String(data.quantity).replace(',', '.')); const direction = String(data.direction)
        const [before] = await db.select().from(insumos).where(eq(insumos.id, itemId)).limit(1)
        if (!before) return reply({ success: false, error: 'Item de estoque não encontrado.' }, 404, correlationId)
        if (direction === 'SAIDA' && Number(before.quantidade) < amount) return reply({ success: false, error: 'Estoque insuficiente para esta saída.' }, 422, correlationId)
        const delta = direction === 'ENTRADA' ? amount : -amount
        const [updated] = await db.update(insumos).set({ quantidade: sql`${insumos.quantidade} + ${delta}`, updatedAt: new Date() }).where(eq(insumos.id, itemId)).returning()
        await db.insert(sofiaEvents).values({ senderPhone: String((rawBody as Record<string, unknown>).senderPhone), idempotencyKey: correlationId, rawPayload: { action, itemId, direction, amount }, intentDetected: 'inventory_adjust', status: 'PROCESSED' })
        return reply({ success: true, action, item: safeStockSummary(updated) }, 200, correlationId)
      }
      if (action === 'create_financial_entry') {
        const [entry] = await db.insert(financeiroLancamentos).values({ tipo: String(data.type), valor: String(data.amount).replace(',', '.'), descricao: clean(data.description, 300), categoria: clean(data.category, 100) || 'GERAL', status: clean(data.status, 16) || 'EFETIVADO', data: data.date ? new Date(String(data.date)) : new Date() }).returning()
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
        if (data.date !== undefined) values.data = new Date(String(data.date))
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
        const [request] = await db.update(serviceRequests).set(values as any).where(eq(serviceRequests.id, String(data.requestId))).returning()
        if (!request) return reply({ success: false, error: 'Chamado não encontrado.' }, 404, correlationId)
        await db.insert(sofiaEvents).values({ senderPhone: String((rawBody as Record<string, unknown>).senderPhone), idempotencyKey: correlationId, rawPayload: { action, requestId: request.id, fields: Object.keys(data).filter(key => key !== 'requestId') }, intentDetected: 'service_request_update', status: 'PROCESSED' })
        return reply({ success: true, action, request: { id: request.id, code: request.code, status: request.status } }, 200, correlationId)
      }
      if (action === 'update_document' || action === 'archive_document') {
        const documentId = String(data.documentId); const values: Record<string, unknown> = { updatedAt: new Date() }
        if (action === 'archive_document') values.status = 'ARQUIVADO'; else { if (data.status !== undefined) values.status = clean(data.status, 32); if (data.paymentMethod !== undefined) values.paymentMethod = clean(data.paymentMethod, 64); if (data.warrantyTerms !== undefined) values.warrantyTerms = clean(data.warrantyTerms, 4000); if (data.technicalNotes !== undefined) values.technicalNotes = clean(data.technicalNotes, 4000) }
        const [document] = await db.update(officialDocuments).set(values as any).where(eq(officialDocuments.id, documentId)).returning()
        if (!document) return reply({ success: false, error: 'Documento não encontrado.' }, 404, correlationId)
        await db.insert(sofiaEvents).values({ senderPhone: String((rawBody as Record<string, unknown>).senderPhone), idempotencyKey: correlationId, rawPayload: { action, documentId, fields: Object.keys(data).filter(key => key !== 'documentId') }, intentDetected: action === 'archive_document' ? 'document_archive' : 'document_update', status: 'PROCESSED' })
        return reply({ success: true, action, document: { id: document.id, docNumber: document.docNumber, status: document.status } }, 200, correlationId)
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
