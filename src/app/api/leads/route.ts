import { NextRequest, NextResponse } from 'next/server'
import { and, desc, eq, ilike, or } from 'drizzle-orm'
import { db, leadAddresses, leadAuditEvents, leadServiceRequests, leads } from '@/db'
import { normalizeLeadDocument, validateLeadInput } from '@/lib/leads'
import { requireLocalPermission } from '@/lib/require-local-permission'

const text = (value: unknown, max: number) => typeof value === 'string' ? value.trim().slice(0, max) : ''
const uuid = (value: unknown) => typeof value === 'string' && /^[0-9a-f-]{36}$/i.test(value)

export async function GET(req: NextRequest) {
  const authorized = await requireLocalPermission('crm.read'); if (!authorized) return NextResponse.json({ error: 'Permissão insuficiente' }, { status: 403 }); if (!db) return NextResponse.json({ error: 'Banco indisponível' }, { status: 503 })
  const { searchParams } = new URL(req.url); const status = text(searchParams.get('status'), 32); const q = text(searchParams.get('q'), 160); const filters = [status ? eq(leads.status, status) : undefined, q ? or(ilike(leads.name, `%${q}%`), ilike(leads.phone, `%${q.replace(/\D/g, '')}%`)) : undefined].filter(Boolean) as any[]
  const rows = await db.select().from(leads).where(filters.length ? and(...filters) : undefined).orderBy(desc(leads.updatedAt)).limit(200)
  return NextResponse.json({ success: true, leads: rows })
}

export async function POST(req: NextRequest) {
  const authorized = await requireLocalPermission('crm.write'); if (!authorized) return NextResponse.json({ error: 'Permissão insuficiente' }, { status: 403 }); if (!db) return NextResponse.json({ error: 'Banco indisponível' }, { status: 503 })
  const body = await req.json().catch(() => null) as Record<string, unknown> | null; const checked = validateLeadInput(body || {}); if (!checked.ok) return NextResponse.json({ error: checked.error }, { status: 422 })
  const document = normalizeLeadDocument(body?.document); const address = (body?.address || {}) as Record<string, unknown>; const service = (body?.service || {}) as Record<string, unknown>; const serviceType = text(service.serviceType, 80); const problemReported = text(service.problemReported, 2000)
  try {
    const result = await db.transaction(async tx => {
      const [lead] = await tx.insert(leads).values({ name: checked.value.name, phone: text(body?.phone, 32), normalizedPhone: checked.value.phone, email: text(body?.email, 160) || null, document, normalizedDocument: document, sourceChannel: text(body?.sourceChannel, 80) || 'PORTAL_MANUAL', serviceType: serviceType || null, problemReported: problemReported || null, notes: text(body?.notes, 4000) || null, createdById: authorized.access.id }).returning()
      const [leadAddress] = await tx.insert(leadAddresses).values({ leadId: lead.id, street: text(address.street, 180) || null, number: text(address.number, 32) || null, complement: text(address.complement, 120) || null, neighborhood: text(address.neighborhood, 120) || null, city: text(address.city, 120) || 'Niterói', state: text(address.state, 2).toUpperCase() || 'RJ', zipCode: text(address.zipCode, 16) || null, referencePoint: text(address.referencePoint, 200) || null }).returning()
      if (serviceType && problemReported) await tx.insert(leadServiceRequests).values({ leadId: lead.id, leadAddressId: leadAddress.id, serviceType, problemReported, priority: text(service.priority, 32) || 'NORMAL', customerNotes: text(service.customerNotes, 2000) || null })
      await tx.insert(leadAuditEvents).values({ leadId: lead.id, actorUserId: authorized.access.id, action: 'lead.created', targetType: 'lead', targetId: lead.id, metadata: { sourceChannel: lead.sourceChannel } })
      return lead
    })
    return NextResponse.json({ success: true, lead: result }, { status: 201 })
  } catch (error: any) {
    if (error?.code === '23505') return NextResponse.json({ error: 'Já existe um Lead com este telefone ou documento.' }, { status: 409 })
    console.error('Falha ao criar Lead', error); return NextResponse.json({ error: 'Falha interna ao criar Lead.' }, { status: 500 })
  }
}
