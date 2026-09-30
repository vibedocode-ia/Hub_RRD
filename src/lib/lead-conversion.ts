import { and, eq, or, sql } from 'drizzle-orm'
import { clients, leadAuditEvents, leadProposals, leads } from '@/db'
import { LEAD_STATUSES, leadConversionPayload } from './leads'

export async function convertApprovedLead(tx: any, input: { leadId: string; proposalId: string; actorUserId: string }) {
  // Lock Lead and its canonical phone identity: one conversion per lead and one client creation per phone.
  await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${input.leadId}))`)
  const lockedRows = await tx.execute(sql`select * from leads where id = ${input.leadId} for update`)
  const lead = lockedRows[0] as typeof leads.$inferSelect | undefined
  if (!lead) throw new Error('LEAD_NOT_FOUND')
  if (lead.convertedClientId) return { clientId: lead.convertedClientId, alreadyConverted: true }
  if (lead.status !== LEAD_STATUSES.APPROVED) throw new Error('LEAD_NOT_APPROVED')
  // Re-lock and re-read the commercial approval at the exact conversion boundary.
  const proposalRows = await tx.execute(sql`select * from lead_proposals where id = ${input.proposalId} and lead_id = ${lead.id} for update`)
  const proposal = proposalRows[0] as typeof leadProposals.$inferSelect | undefined
  if (!proposal || proposal.status !== 'APPROVED') throw new Error('LEAD_NOT_APPROVED')

  await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${lead.normalizedPhone}))`)
  const clientMatch = lead.normalizedDocument ? or(eq(clients.normalizedPhone, lead.normalizedPhone), eq(clients.document, lead.normalizedDocument)) : eq(clients.normalizedPhone, lead.normalizedPhone)
  const matches = await tx.select().from(clients).where(clientMatch).limit(2)
  if (matches.length > 1) throw new Error('AMBIGUOUS_CLIENT_MATCH')
  const client = matches[0] || (await tx.insert(clients).values({ ...leadConversionPayload(lead), type: 'PF', createdById: input.actorUserId }).returning())[0]
  const now = new Date()
  const [updated] = await tx.update(leads).set({ status: LEAD_STATUSES.CONVERTED, convertedClientId: client.id, convertedAt: now, convertedById: input.actorUserId, updatedAt: now }).where(and(eq(leads.id, lead.id), eq(leads.status, LEAD_STATUSES.APPROVED), sql`${leads.convertedClientId} is null`)).returning()
  if (!updated) throw new Error('LEAD_CONVERSION_CONFLICT')
  await tx.insert(leadAuditEvents).values({ leadId: lead.id, actorUserId: input.actorUserId, action: 'lead.converted', targetType: 'client', targetId: client.id, metadata: { proposalId: proposal.id, reusedClient: Boolean(matches[0]) } })
  return { clientId: client.id, alreadyConverted: false }
}
