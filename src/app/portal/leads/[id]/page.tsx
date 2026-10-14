import { desc, eq } from 'drizzle-orm'
import { db, leads, leadAddresses, leadAuditEvents, leadProposals, leadServiceRequests, leadDocuments } from '@/db'
import { requireLocalPermission } from '@/lib/require-local-permission'
import { redirect, notFound } from 'next/navigation'
import LeadDetailClient from './LeadDetailClient'
type Params = { params: Promise<{ id: string }> }
export const dynamic = 'force-dynamic'
export default async function LeadPage({ params }: Params) {
  if (!await requireLocalPermission('crm.read')) redirect('/portal')
  const { id } = await params
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) notFound()
  if (!db) return <p>Banco indisponível.</p>
  const [lead] = await db.select().from(leads).where(eq(leads.id, id)).limit(1)
  if (!lead) notFound()
  const [addresses, requests, proposals, audit, documents] = await Promise.all([
    db.select().from(leadAddresses).where(eq(leadAddresses.leadId, id)),
    db.select().from(leadServiceRequests).where(eq(leadServiceRequests.leadId, id)).orderBy(desc(leadServiceRequests.createdAt)),
    db.select().from(leadProposals).where(eq(leadProposals.leadId, id)).orderBy(desc(leadProposals.createdAt)),
    db.select().from(leadAuditEvents).where(eq(leadAuditEvents.leadId, id)).orderBy(desc(leadAuditEvents.createdAt)),
    db.select().from(leadDocuments).where(eq(leadDocuments.leadId, id)).orderBy(desc(leadDocuments.createdAt)),
  ])
  const serializedLead = JSON.parse(JSON.stringify(lead))
  const readOnly = !await requireLocalPermission('crm.write') || Boolean(lead.convertedAt || lead.convertedClientId)
  return <LeadDetailClient lead={serializedLead} address={JSON.parse(JSON.stringify(addresses[0] || null))} requests={JSON.parse(JSON.stringify(requests))} proposals={JSON.parse(JSON.stringify(proposals))} documents={JSON.parse(JSON.stringify(documents))} audit={JSON.parse(JSON.stringify(audit))} readOnly={readOnly} />
}
