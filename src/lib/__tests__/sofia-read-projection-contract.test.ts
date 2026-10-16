import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { safeClientSummary } from '../sofia-actions'

const read = (path: string) => readFileSync(path, 'utf8')
const route = read('src/app/api/sofia/actions/route.ts')
const schema = read('src/db/schema.ts')

test('service-request projection returns names and address only from the request-linked client/address/team', () => {
  const start = route.indexOf("if (action === 'list_service_requests')")
  const end = route.indexOf("if (action === 'list_documents')", start)
  assert.ok(start >= 0 && end > start, 'list_service_requests route block exists')
  const block = route.slice(start, end)
  assert.match(block, /\.leftJoin\(clients,\s*eq\(clients\.id,\s*serviceRequests\.clientId\)\)/)
  assert.match(block, /\.leftJoin\(clientAddresses,\s*and\(eq\(clientAddresses\.id,\s*serviceRequests\.addressId\),\s*eq\(clientAddresses\.clientId,\s*serviceRequests\.clientId\)\)\)/)
  assert.match(block, /\.leftJoin\(teams,\s*eq\(teams\.id,\s*serviceRequests\.assignedTeamId\)\)/)
  for (const field of ['clientName', 'addressStreet', 'addressNumber', 'addressNeighborhood', 'addressCity', 'addressState', 'assignedTeamName']) {
    assert.match(block, new RegExp(`${field}:`), `projection includes ${field}`)
  }
  assert.match(schema, /addressId:\s*uuid\('address_id'\)\.references\(\(\)\s*=>\s*clientAddresses\.id\)/)
  assert.match(schema, /assignedTeamId:\s*uuid\('assigned_team_id'\)\.references\(\(\)\s*=>\s*teams\.id\)/)
})

test('client list projection retains a canonical opaque ID for subsequent profile lookup', () => {
  const summary = safeClientSummary({ id: '22222222-2222-4222-8222-222222222222', name: 'WALE Exemplo', phone: '5521999999262', isActive: true })
  assert.equal(summary.id, '22222222-2222-4222-8222-222222222222')
  assert.equal(summary.name, 'WALE Exemplo')
  assert.equal(summary.phone, '***9262')
  assert.equal(summary.active, true)
  const start = route.indexOf("if (action === 'get_client_profile')")
  const end = route.indexOf("if (action === 'create_client')", start)
  assert.ok(start >= 0 && end > start, 'get_client_profile route block exists')
  const block = route.slice(start, end)
  assert.match(block, /const clientId = typeof data\.clientId === 'string' \? data\.clientId : null/)
  assert.match(block, /eq\(clients\.id, clientId\)/)
  assert.match(block, /id: client\.id, name: client\.name/)
  assert.match(block, /matches\.length > 1/)
})
