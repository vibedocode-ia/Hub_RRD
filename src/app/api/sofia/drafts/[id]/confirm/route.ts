import { NextRequest, NextResponse } from 'next/server'
import { and, eq, isNull } from 'drizzle-orm'
import { resolveDocumentIdentity } from '@/lib/document-identity'
import { auditEvents, clientAddresses, clients, db, serviceRequests, sofiaDrafts, SOFIA_DRAFT_STATUS } from '@/db'
import { requireLocalPermission } from '@/lib/require-local-permission'

type Params = { params: Promise<{ id: string }> }
const text = (value: unknown, max: number) => typeof value === 'string' ? value.trim().slice(0, max) : ''

export async function POST(req: NextRequest, { params }: Params) {
  const authorized = await requireLocalPermission('sofia.drafts.review')
  if (!authorized) return NextResponse.json({ error: 'Permissão insuficiente para confirmar rascunhos.' }, { status: 403 })
  if (!db) return NextResponse.json({ error: 'Banco de dados indisponível.' }, { status: 503 })
  const { id } = await params
  const [draft] = await db.select().from(sofiaDrafts).where(and(eq(sofiaDrafts.id, id), eq(sofiaDrafts.status, SOFIA_DRAFT_STATUS.PENDING_REVIEW))).limit(1)
  if (!draft) return NextResponse.json({ error: 'Rascunho não disponível para confirmação.' }, { status: 409 })
  const payload = draft.draftPayload as Record<string, any>
  const body = await req.json().catch(() => ({}))
  if (body.confirmation !== 'CONFIRMO') return NextResponse.json({ error: 'Confirmação explícita obrigatória.' }, { status: 422 })
  const customerName = text(payload.customerName, 160)
  const phone = text(payload.customerPhone, 32) || draft.senderPhone
  const address = payload.address || {}
  const street = text(address.street, 180); const number = text(address.number, 32); const neighborhood = text(address.neighborhood, 120)
  const problemReported = text(payload.problemReported, 2000)
  const documentIdentity = resolveDocumentIdentity(text(payload.customerDocument, 32))
  if (!customerName || !documentIdentity || !street || !number || !neighborhood || !problemReported) return NextResponse.json({ error: 'O rascunho ainda precisa de dados antes da confirmação.' }, { status: 422 })
  const result = await db.transaction(async tx => {
    const [client] = await tx.insert(clients).values({ name: customerName, phone, normalizedPhone: phone.replace(/\D/g, ''), type: documentIdentity.type, document: documentIdentity.document }).returning()
    const [clientAddress] = await tx.insert(clientAddresses).values({ clientId: client.id, street, number, neighborhood, city: text(address.city, 120) || 'Niterói', state: 'RJ', complement: text(address.complement, 120) || null, referencePoint: text(address.referencePoint, 200) || null, isMain: true }).returning()
    const [request] = await tx.insert(serviceRequests).values({ code: `SOF-${new Date().getFullYear()}-${draft.id.slice(0, 8)}`, clientId: client.id, addressId: clientAddress.id, sourceChannel: 'SOFIA_WHATSAPP', leadStatus: 'NOVO', priority: payload.priority || 'NORMAL', serviceType: payload.serviceType || 'DESENTUPIMENTO', problemReported, status: 'PENDING_REVIEW', totalAmount: '0.00' }).returning()
    const [updated] = await tx.update(sofiaDrafts).set({ status: SOFIA_DRAFT_STATUS.CONVERTED, serviceRequestId: request.id, reviewedById: authorized.access.id, reviewedAt: new Date(), convertedAt: new Date(), updatedAt: new Date() }).where(and(eq(sofiaDrafts.id, id), eq(sofiaDrafts.status, SOFIA_DRAFT_STATUS.PENDING_REVIEW), isNull(sofiaDrafts.serviceRequestId))).returning()
    if (!updated) throw new Error('DRAFT_ALREADY_CONVERTED')
    await tx.insert(auditEvents).values({ actorUserId: authorized.access.id, action: 'sofia_draft.confirmed_and_converted', targetType: 'sofia_draft', targetId: draft.id, metadata: { serviceRequestId: request.id, intent: draft.intent } })
    return { request }
  })
  return NextResponse.json({ success: true, draftId: id, serviceRequestId: result.request.id, status: SOFIA_DRAFT_STATUS.CONVERTED }, { status: 201 })
}
