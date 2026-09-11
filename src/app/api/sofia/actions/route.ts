import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'
import { asc, eq } from 'drizzle-orm'
import { db, serviceCatalog, sofiaEvents, sofiaDrafts, SOFIA_DRAFT_STATUS, teams } from '@/db'
import { SofiaActionRequest, pendingDraftFields } from '@/lib/sofia-actions'
import { VERSION } from '@/lib/version'

const header = (correlationId?: string) => ({
  'X-Hub-Version': VERSION,
  ...(correlationId ? { 'X-Correlation-Id': correlationId } : {}),
})

function authorized(req: NextRequest) {
  const secret = process.env.SOFIA_HUB_SECRET
  const value = req.headers.get('authorization')
  if (!secret) return { ok: false as const, status: 503, error: 'Endpoint Sofia não configurado.' }
  if (!value?.startsWith('Bearer ')) return { ok: false as const, status: 401, error: 'Authorization Bearer obrigatório.' }
  const token = value.slice(7)
  if (token.length !== secret.length || !timingSafeEqual(Buffer.from(token), Buffer.from(secret))) return { ok: false as const, status: 401, error: 'Não autorizado.' }
  return { ok: true as const }
}

export async function POST(req: NextRequest) {
  const auth = authorized(req)
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status, headers: header() })
  if (!db) return NextResponse.json({ error: 'Banco de dados indisponível.' }, { status: 503, headers: header() })
  const correlationId = req.headers.get('idempotency-key') || req.headers.get('x-correlation-id') || ''
  if (!correlationId || correlationId.length > 160) return NextResponse.json({ error: 'Idempotency-Key obrigatório.' }, { status: 400, headers: header() })
  const body = await req.json().catch(() => null)
  const parsed = SofiaActionRequest.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Ação Sofia inválida.' }, { status: 422, headers: header(correlationId) })
  const input = parsed.data
  if (input.centralHubId !== process.env.RRD_HUB_ID) return NextResponse.json({ error: 'Hub central não autorizado.' }, { status: 403, headers: header(correlationId) })

  if (input.action === 'list_services') {
    const services = await db.select({ name: serviceCatalog.name, category: serviceCatalog.category, description: serviceCatalog.description, basePrice: serviceCatalog.basePrice, priceNotes: serviceCatalog.priceNotes, requiresInspection: serviceCatalog.requiresInspection, emergencyEligible: serviceCatalog.isEmergencyEligible }).from(serviceCatalog).where(eq(serviceCatalog.status, 'ACTIVE')).orderBy(asc(serviceCatalog.displayOrder), asc(serviceCatalog.name)).limit(50)
    return NextResponse.json({ success: true, services }, { headers: header(correlationId) })
  }
  if (input.action === 'list_active_teams') {
    const activeTeams = await db.select({ name: teams.name, leaderName: teams.leaderName }).from(teams).where(eq(teams.isActive, true)).orderBy(asc(teams.name)).limit(20)
    return NextResponse.json({ success: true, teams: activeTeams }, { headers: header(correlationId) })
  }

  const existing = await db.select({ id: sofiaDrafts.id, status: sofiaDrafts.status, pendingFields: sofiaDrafts.pendingFields }).from(sofiaDrafts).where(eq(sofiaDrafts.correlationId, correlationId)).limit(1)
  if (existing[0]) return NextResponse.json({ success: true, alreadyProcessed: true, draftId: existing[0].id, pendingFields: existing[0].pendingFields, nextAction: existing[0].status === SOFIA_DRAFT_STATUS.COLLECTING ? 'collect_missing_fields' : 'none' }, { status: existing[0].status === SOFIA_DRAFT_STATUS.COLLECTING ? 202 : 200, headers: header(correlationId) })

  const pendingFields = pendingDraftFields(input)
  const status = pendingFields.length ? SOFIA_DRAFT_STATUS.COLLECTING : SOFIA_DRAFT_STATUS.PENDING_REVIEW
  const [event] = await db.insert(sofiaEvents).values({ senderPhone: input.senderPhone, idempotencyKey: correlationId, rawPayload: input, intentDetected: input.intentDetected, status }).returning()
  const [draft] = await db.insert(sofiaDrafts).values({ correlationId, centralContactId: input.centralContactId, centralClientId: input.centralClientId, centralHubId: input.centralHubId, centralRole: input.centralRole, senderPhone: input.senderPhone, intent: input.intentDetected, status, draftPayload: input, pendingFields, conversationSummary: input.conversationSummary, sourceEventId: event.id }).returning()
  return NextResponse.json({ success: true, draftId: draft.id, pendingFields, nextAction: pendingFields.length ? 'collect_missing_fields' : 'review_draft', message: pendingFields.length ? 'Rascunho criado; faltam dados antes da revisão.' : 'Rascunho completo; aguarda revisão humana.' }, { status: pendingFields.length ? 202 : 201, headers: header(correlationId) })
}
