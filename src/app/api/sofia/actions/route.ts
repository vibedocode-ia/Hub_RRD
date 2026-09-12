import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'node:crypto'
import { and, asc, desc, eq, gte, ilike, or, sql } from 'drizzle-orm'
import { db, clientAddresses, clients, financeiroLancamentos, insumos, serviceCatalog, serviceRequests, sofiaEvents, sofiaDrafts, SOFIA_DRAFT_STATUS, teams, vehicles } from '@/db'
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
      if (action === 'list_stock') {
        const query = clean(data.query, 160)
        const rows = await db.select().from(insumos).where(query ? or(ilike(insumos.nome, `%${query}%`), ilike(insumos.categoria, `%${query}%`)) : undefined).orderBy(asc(insumos.nome)).limit(50)
        return reply({ success: true, action, items: rows.map(safeStockSummary) }, 200, correlationId)
      }
      if (action === 'list_vehicles') {
        const rows = await db.select().from(vehicles).where(eq(vehicles.isActive, true)).orderBy(asc(vehicles.name)).limit(50)
        return reply({ success: true, action, vehicles: rows.map(safeVehicleSummary) }, 200, correlationId)
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
      const matches = clientId
        ? await db.select().from(clients).where(and(eq(clients.id, clientId), eq(clients.isActive, true))).limit(2)
        : await db.select().from(clients).where(and(eq(clients.isActive, true), ilike(clients.name, name))).limit(2)
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
      const [client] = await db.insert(clients).values({ type: typeof data.type === 'string' ? data.type.slice(0, 32) : 'PF', name, phone, normalizedPhone: digits(phone), document: data.document ? digits(data.document) : null, email: typeof data.email === 'string' ? data.email.slice(0, 160) : null, contactPerson: typeof data.contactPerson === 'string' ? data.contactPerson.slice(0, 160) : null, notes: typeof data.notes === 'string' ? data.notes.slice(0, 2000) : null }).returning()
      await db.insert(clientAddresses).values({ clientId: client.id, street: clean(data.street, 180) || 'Endereço a confirmar', number: clean(data.number, 32) || 'S/N', neighborhood: clean(data.neighborhood, 120) || 'Bairro a confirmar', city: clean(data.city, 120) || 'Niterói', state: clean(data.state, 2).toUpperCase() || 'RJ' })
      await db.insert(sofiaEvents).values({ senderPhone: String((rawBody as Record<string, unknown>).senderPhone), idempotencyKey: correlationId, rawPayload: { action, clientId: client.id }, intentDetected: 'crm_create_client', status: 'PROCESSED' })
      return reply({ success: true, action, client: safeClientSummary(client) }, 201, correlationId)
    }
    const id = String(data.clientId); const [client] = await db.select().from(clients).where(eq(clients.id, id)).limit(1)
    if (!client) return reply({ success: false, error: 'Cliente não encontrado.' }, 404, correlationId)
    if (action === 'archive_client') {
      const [archived] = await db.update(clients).set({ isActive: false, updatedAt: new Date() }).where(and(eq(clients.id, id), eq(clients.isActive, true))).returning()
      await db.insert(sofiaEvents).values({ senderPhone: String((rawBody as Record<string, unknown>).senderPhone), idempotencyKey: correlationId, rawPayload: { action, clientId: id }, intentDetected: 'crm_archive_client', status: 'PROCESSED' })
      return reply({ success: true, action, client: safeClientSummary(archived || client) }, 200, correlationId)
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
    await db.insert(sofiaEvents).values({ senderPhone: String((rawBody as Record<string, unknown>).senderPhone), idempotencyKey: correlationId, rawPayload: { action, clientId: id, fields: Object.keys(updates).filter(key => key !== 'updatedAt') }, intentDetected: 'crm_update_client', status: 'PROCESSED' })
    return reply({ success: true, action, client: safeClientSummary(updated) }, 200, correlationId)
  } catch { return reply({ success: false, error: 'Falha ao executar operação Sofia.' }, 500, correlationId) }
}
