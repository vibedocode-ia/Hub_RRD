import { and, eq, sql } from 'drizzle-orm'
import { sofiaDrafts } from '@/db'
/** Construct only after dedicated Central transport and envelope authentication. */
export type CentralDocumentAuthor = { kind: 'central_sovereign'; grantId: string; hubId: string; senderPhone: string }
export type DraftIdentity = { senderPhone: string; centralHubId: string; centralRole: string; centralGrantId?: string; centralContactId?: string | null; centralClientId?: string | null }
/** Fail closed for incomplete identity; never infer a legacy membership from a grant. */
export function draftOwnership(input: DraftIdentity) {
 const common = and(eq(sofiaDrafts.senderPhone, input.senderPhone), eq(sofiaDrafts.centralHubId, input.centralHubId), eq(sofiaDrafts.centralRole, input.centralRole))
 if (input.centralRole === 'god_admin') return input.centralGrantId ? and(common, eq(sofiaDrafts.authorKind, 'central_sovereign'), eq(sofiaDrafts.centralGrantId, input.centralGrantId)) : sql`false`
 return input.centralContactId && input.centralClientId ? and(common, eq(sofiaDrafts.authorKind, 'legacy'), eq(sofiaDrafts.centralContactId, input.centralContactId), eq(sofiaDrafts.centralClientId, input.centralClientId)) : sql`false`
}
