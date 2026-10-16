import test from 'node:test'
import assert from 'node:assert/strict'
import { executeSofiaPersonProfile, type PersonProfileRepository } from '../sofia-person-profile'
test('explicit projection includes metadata and only permission keys, never grant secrets', async () => {
 const date = new Date('2026-01-01T00:00:00Z')
 const row = { id: 'x', name: 'Teste', phone: '5521999999999', email: null, jobTitle: null, photoUrl: null, company: null, city: null, state: null, instagramUrl: null, websiteUrl: null, personalNotes: null, role: 'LEITURA', isActive: true, lastLoginAt: null, createdAt: date, updatedAt: date, permissions: ['sofia.use'], passwordHash: 'secret' }
 const repo: PersonProfileRepository = { findByPhone: async () => row, updateByPhone: async () => row }
 const result = await executeSofiaPersonProfile('get_my_profile', {}, row.phone, repo)
 assert.equal(result.body.profile?.createdAt, date)
 assert.deepEqual(result.body.profile?.permissions, ['sofia.use'])
 assert.equal(JSON.stringify(result).includes('secret'), false)
})
