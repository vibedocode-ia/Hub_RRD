import { desc, eq } from 'drizzle-orm'
import { agendaEvents, db, googleIntegrations } from '@/db'
import { decryptOAuthToken, encryptOAuthToken } from '@/lib/google-oauth'

type GoogleToken = { access_token?: string; refresh_token?: string; expires_in?: number; expiry_date?: number }
type AgendaEvent = typeof agendaEvents.$inferSelect

async function globalIntegration() {
  if (!db) return null
  return (await db.select().from(googleIntegrations).orderBy(desc(googleIntegrations.updatedAt)).limit(1))[0] ?? null
}

async function accessToken() {
  const integration = await globalIntegration()
  if (!integration || integration.status !== 'CONNECTED' || !integration.tokenCiphertext || !integration.tokenIv || !integration.tokenTag) return null
  const encryptionKey = process.env.GOOGLE_TOKEN_ENCRYPTION_KEY
  if (!encryptionKey) return null
  let token: GoogleToken
  try { token = JSON.parse(decryptOAuthToken({ ciphertext: integration.tokenCiphertext, iv: integration.tokenIv, tag: integration.tokenTag }, encryptionKey)) } catch { return null }
  if (token.access_token && (!token.expiry_date || token.expiry_date > Date.now() + 60_000)) return token.access_token
  if (!token.refresh_token || !process.env.GOOGLE_OAUTH_CLIENT_ID || !process.env.GOOGLE_OAUTH_CLIENT_SECRET) return null
  const refresh = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ client_id: process.env.GOOGLE_OAUTH_CLIENT_ID, client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET, refresh_token: token.refresh_token, grant_type: 'refresh_token' }) })
  if (!refresh.ok) return null
  const replacement = await refresh.json() as GoogleToken
  if (!replacement.access_token) return null
  const next: GoogleToken = { ...token, ...replacement, refresh_token: token.refresh_token, expiry_date: Date.now() + Number(replacement.expires_in ?? 3600) * 1000 }
  const encrypted = encryptOAuthToken(JSON.stringify(next), encryptionKey)
  await db.update(googleIntegrations).set({ tokenCiphertext: encrypted.ciphertext, tokenIv: encrypted.iv, tokenTag: encrypted.tag, updatedAt: new Date() }).where(eq(googleIntegrations.id, integration.id))
  return next.access_token
}

function googlePayload(event: AgendaEvent) {
  return {
    summary: event.title,
    description: event.description ?? undefined,
    location: event.location ?? undefined,
    start: { dateTime: event.startsAt.toISOString(), timeZone: 'America/Sao_Paulo' },
    end: { dateTime: event.endsAt.toISOString(), timeZone: 'America/Sao_Paulo' },
  }
}

/** Best-effort sync: local scheduling stays successful even when Google is offline. */
export async function syncAgendaEventToGoogle(event: AgendaEvent) {
  if (!db) return { synced: false, reason: 'DATABASE_UNAVAILABLE' as const }
  try {
  const token = await accessToken()
  if (!token) {
    await db.update(agendaEvents).set({ googleSyncStatus: 'NOT_CONNECTED', updatedAt: new Date() }).where(eq(agendaEvents.id, event.id))
    return { synced: false, reason: 'OAUTH_NOT_CONNECTED' as const }
  }
  const endpoint = event.googleEventId
    ? `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(event.googleEventId)}`
    : 'https://www.googleapis.com/calendar/v3/calendars/primary/events'
  const result = await fetch(endpoint, {
    method: event.googleEventId ? 'PATCH' : 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify(googlePayload(event)),
  })
  if (!result.ok) {
    await db.update(agendaEvents).set({ googleSyncStatus: 'FAILED', updatedAt: new Date() }).where(eq(agendaEvents.id, event.id))
    return { synced: false, reason: 'GOOGLE_SYNC_FAILED' as const }
  }
  const remote = await result.json() as { id?: string }
  await db.update(agendaEvents).set({ googleEventId: remote.id ?? event.googleEventId ?? null, googleSyncStatus: 'SYNCED', googleSyncedAt: new Date(), updatedAt: new Date() }).where(eq(agendaEvents.id, event.id))
  return { synced: true as const }
  } catch {
    try { await db.update(agendaEvents).set({ googleSyncStatus: 'FAILED' }).where(eq(agendaEvents.id,event.id)) } catch { /* Local write already committed; never turn it into an API error. */ }
    return { synced:false, reason:'GOOGLE_SYNC_FAILED' as const }
  }
}
