import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'node:crypto'
import { and, asc, desc, eq } from 'drizzle-orm'
import { db, clientAddresses, clients, serviceCatalog, sofiaEvents, sofiaDrafts, SOFIA_DRAFT_STATUS, teams } from '@/db'
import { SofiaActionRequest, pendingDraftFields, digits, parseSofiaClientAction, safeClientSummary } from '@/lib/sofia-actions'
import { VERSION } from '@/lib/version'

const header = (correlationId?: string) => ({ 'X-Hub-Version': VERSION, ...(correlationId ? { 'X-Correlation-Id': correlationId } : {}) })
const reply = (body: unknown, status = 200, correlationId?: string) => NextResponse.json(body, { status, headers: header(correlationId) })
function authorized(req: NextRequest) {
  const secret = process.env.SOFIA_HUB_SECRET
  const value = req.headers.get('authorization')
  if (!secret) return { ok: false as const, status: 503, error: 'Endpoint Sofia não configurado.' }
  if (!value?.startsWith('Bearer ')) return { ok: false as const, status: 401, error: 'Authorization Bearer obrigatório.' }
  const token = value.slice(7)
  if (token.length !== secret.length || !timingSafeEqual(Buffer.from(token), Buffer.from(secret))) return { ok: false as const, status: 401, error: 'Não autorizado.' }
  return { ok: true as const }
}
function centralHubMatches(raw: unknown) {
  return Boolean(raw && typeof raw === 'object' && !Array.isArray(raw) && (raw as Record<string, unknown>).centralHubId === process.env.RRD_HUB_ID)
}

export async function POST(req: NextRequest) {
  const auth = authorized(req)
  if (!auth.ok) return reply({ success: false, error: auth.error }, auth.status)
  if (!db) return reply({ success: false, error: 'Banco de dados indisponível.' }, 503)
  const correlationId = req.headers.get('idempotency-key') || req.headers.get('x-correlation-id') || ''
  if (!/^[A-Za-z0-9:_-]{8,160}$/.test(correlationId)) return reply({ success: false, error: 'Chave de idempotência obrigatória.' }, 400)
  const rawBody = await req.json().catch(() => null)
  if (!centralHubMatches(rawBody)) return reply({ success: false, error: 'Hub central não autorizado.' }, 403, correlationId)

  const operational = SofiaActionRequest.safeParse(rawBody)
  try {
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
      const pendingFields = pendingDraftFields(input)
      const status = pendingFields.length ? SOFIA_DRAFT_STATUS.COLLECTING : SOFIA_DRAFT_STATUS.PENDING_REVIEW
      const [event] = await db.insert(sofiaEvents).values({ senderPhone: input.senderPhone, idempotencyKey: correlationId, rawPayload: input, intentDetected: input.intentDetected, status }).returning()
      const [draft] = await db.insert(sofiaDrafts).values({ correlationId, centralContactId: input.centralContactId, centralClientId: input.centralClientId, centralHubId: input.centralHubId, centralRole: input.centralRole, senderPhone: input.senderPhone, intent: input.intentDetected, status, draftPayload: input, pendingFields, conversationSummary: input.conversationSummary, sourceEventId: event.id }).returning()
      return reply({ success: true, action: input.action, draftId: draft.id, pendingFields, nextAction: pendingFields.length ? 'collect_missing_fields' : 'review_draft' }, pendingFields.length ? 202 : 201, correlationId)
    }

    const parsed = parseSofiaClientAction(rawBody)
    if (!parsed.ok) return reply({ success: false, error: parsed.error }, 422, correlationId)
    const { action, data } = parsed
    if (action !== 'list_clients') {
      const replay = await db.select().from(sofiaEvents).where(eq(sofiaEvents.idempotencyKey, correlationId)).limit(1)
      if (replay.length) return reply({ success: true, alreadyProcessed: true, action }, 200, correlationId)
    }
    if (action === 'list_clients') {
      const rows = await db.select().from(clients).where(eq(clients.isActive, true)).orderBy(desc(clients.updatedAt)).limit(50)
      return reply({ success: true, action, clients: rows.map(safeClientSummary) }, 200, correlationId)
    }
    if (action === 'create_client') {
      const phone = String(data.phone).trim(); const name = String(data.name).trim()
      const [client] = await db.insert(clients).values({ type: typeof data.type === 'string' ? data.type.slice(0, 32) : 'PF', name, phone, normalizedPhone: digits(phone), document: data.document ? digits(data.document) : null, email: typeof data.email === 'string' ? data.email.slice(0, 160) : null, contactPerson: typeof data.contactPerson === 'string' ? data.contactPerson.slice(0, 160) : null, notes: typeof data.notes === 'string' ? data.notes.slice(0, 2000) : null }).returning()
      await db.insert(clientAddresses).values({ clientId: client.id, street: typeof data.street === 'string' && data.street.trim() ? data.street.trim().slice(0, 180) : 'Endereço a confirmar', number: typeof data.number === 'string' && data.number.trim() ? data.number.trim().slice(0, 32) : 'S/N', neighborhood: typeof data.neighborhood === 'string' && data.neighborhood.trim() ? data.neighborhood.trim().slice(0, 120) : 'Bairro a confirmar', city: typeof data.city === 'string' && data.city.trim() ? data.city.trim().slice(0, 120) : 'Niterói', state: typeof data.state === 'string' && data.state.trim() ? data.state.trim().slice(0, 2).toUpperCase() : 'RJ' })
      await db.insert(sofiaEvents).values({ senderPhone: String((rawBody as Record<string, unknown>).senderPhone), idempotencyKey: correlationId, rawPayload: { action, clientId: client.id }, intentDetected: 'crm_create_client', status: 'PROCESSED' })
      return reply({ success: true, action, client: safeClientSummary(client) }, 201, correlationId)
    }
    const id = String(data.clientId)
    const [client] = await db.select().from(clients).where(eq(clients.id, id)).limit(1)
    if (!client) return reply({ success: false, error: 'Cliente não encontrado.' }, 404, correlationId)
    if (action === 'archive_client') {
      const [archived] = await db.update(clients).set({ isActive: false, updatedAt: new Date() }).where(and(eq(clients.id, id), eq(clients.isActive, true))).returning()
      await db.insert(sofiaEvents).values({ senderPhone: String((rawBody as Record<string, unknown>).senderPhone), idempotencyKey: correlationId, rawPayload: { action, clientId: id }, intentDetected: 'crm_archive_client', status: 'PROCESSED' })
      return reply({ success: true, action, client: safeClientSummary(archived || client) }, 200, correlationId)
    }
    const [updated] = await db.update(clients).set({ name: String(data.name).trim(), phone: String(data.phone).trim(), normalizedPhone: digits(data.phone), document: data.document ? digits(data.document) : null, updatedAt: new Date() }).where(eq(clients.id, id)).returning()
    await db.insert(sofiaEvents).values({ senderPhone: String((rawBody as Record<string, unknown>).senderPhone), idempotencyKey: correlationId, rawPayload: { action, clientId: id }, intentDetected: 'crm_update_client', status: 'PROCESSED' })
    return reply({ success: true, action, client: safeClientSummary(updated) }, 200, correlationId)
  } catch { return reply({ success: false, error: 'Falha ao executar operação Sofia.' }, 500, correlationId) }
}
