import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

test('lead migration is additive and leaves legacy client flow untouched', () => {
  const sql = readFileSync('src/db/migrations/0020_leads_isolated.sql', 'utf8').toLowerCase()
  for (const table of ['leads', 'lead_addresses', 'lead_service_requests', 'lead_proposals', 'lead_documents', 'lead_audit_events']) assert.match(sql, new RegExp(`create table "${table}"`))
  assert.doesNotMatch(sql, /alter\s+table/)
  assert.doesNotMatch(sql, /drop\s+table/)
  for (const legacy of ['clients', 'client_addresses', 'service_requests', 'proposals', 'official_documents', 'audit_events']) assert.doesNotMatch(sql, new RegExp(`(?:alter|insert|update|delete)\\s+(?:into\\s+)?"${legacy}"`))
})

test('lead API remains an independent commercial boundary', () => {
  const createApi = readFileSync('src/app/api/leads/route.ts', 'utf8')
  const proposalApi = readFileSync('src/app/api/lead-proposals/[id]/route.ts', 'utf8')
  assert.match(createApi, /requireLocalPermission\('crm\.write'\)/)
  assert.match(createApi, /validateLeadInput/)
  assert.match(createApi, /leadAuditEvents/)
  assert.match(proposalApi, /convertApprovedLead/)
  assert.match(proposalApi, /db\.transaction/)
})
