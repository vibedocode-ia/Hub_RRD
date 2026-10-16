import test from 'node:test'
import assert from 'node:assert/strict'
import { SofiaManagedPersonProfileRequest, SofiaPersonProfileRequest, SofiaPersonalProfilePatchSchema, executeSofiaPersonProfile, type PersonProfileRepository } from '../sofia-person-profile'
const row = { id: 'local-person', name: 'Teste', phone: '5521999999999', email: null, jobTitle: 'Administrador de obras', photoUrl: null, company: null, city: null, state: null, instagramUrl: null, websiteUrl: null, personalNotes: null, role: 'LEITURA', isActive: true, lastLoginAt: null, createdAt: new Date('2026-01-01'), updatedAt: new Date('2026-01-01'), permissions: ['sofia.use'] }
function repository() {
 let saved: import('../sofia-person-profile').SofiaPersonProfile = { ...row }
 const lookedUp: string[] = []
 const repo: PersonProfileRepository = {
  async findByPhone(phone) { lookedUp.push(phone); return phone === row.phone ? saved : null },
  async updateByPhone(phone, patch) { if (phone !== row.phone) return null; saved = { ...saved, ...patch }; return saved },
 }
 return { repo, lookedUp }
}
test('strict action envelope requires Central identities and rejects alternate targets', () => {
 const envelope = { action: 'get_my_profile', senderPhone: '+5521999999999', centralRole: 'hub_operator', centralContactId: '11111111-1111-4111-8111-111111111111', centralClientId: '22222222-2222-4222-8222-222222222222', centralHubId: '33333333-3333-4333-8333-333333333333' }
 assert.equal(SofiaPersonProfileRequest.safeParse(envelope).success, true)
 assert.equal(SofiaPersonProfileRequest.safeParse({ ...envelope, centralContactId: 'invalid' }).success, false)
 assert.equal(SofiaPersonProfileRequest.safeParse({ ...envelope, userId: row.id }).success, false)
 assert.equal(SofiaPersonProfileRequest.safeParse({ ...envelope, data: { phone: row.phone } }).success, false)
 assert.equal(SofiaPersonProfileRequest.safeParse({ ...envelope, action: 'update_my_profile', data: { jobTitle: 'Diretor comercial' } }).success, true)
})

test('my profile resolves validated sender phone and excludes unexpected secrets', async () => {
 const { repo, lookedUp } = repository()
 repo.findByPhone = async phone => { lookedUp.push(phone); return { ...row, passwordHash: 'not-public', token: 'not-public' } }
 const result = await executeSofiaPersonProfile('get_my_profile', {}, '+5521999999999', repo)
 assert.equal(result.status, 200)
 assert.deepEqual(lookedUp, [row.phone])
 assert.equal(result.body.profile?.role, 'LEITURA')
 assert.equal(JSON.stringify(result).includes('not-public'), false)
})
test('personal update allows jobTitle as description without granting authority', async () => {
 const { repo } = repository()
 const result = await executeSofiaPersonProfile('update_my_profile', { jobTitle: 'Administrador de obras', name: 'Novo nome' }, '+5521999999999', repo)
 assert.equal(result.status, 200)
 assert.equal(result.body.profile?.name, 'Novo nome')
 assert.equal(result.body.profile?.role, 'LEITURA')
})
test('authority, identities, secrets and empty patches are strictly rejected', () => {
 for (const input of [{ role: 'OWNER' }, { permissions: [] }, { isActive: false }, { userId: row.id }, { phone: '5521888888888' }, { senderPhone: '+5521888888888' }, { passwordHash: 'x' }, {}]) assert.equal(SofiaPersonalProfilePatchSchema.safeParse(input).success, false)
})
test('manager action envelope carries only explicit target and strict patch, not permission changes', () => {
 const envelope = { senderPhone: row.phone, centralRole: 'hub_operator', centralContactId: '11111111-1111-4111-8111-111111111111', centralClientId: '22222222-2222-4222-8222-222222222222', centralHubId: '33333333-3333-4333-8333-333333333333' }
 assert.equal(SofiaManagedPersonProfileRequest.safeParse({ ...envelope, action: 'get_person_profile', data: { targetPhone: row.phone } }).success, true)
 assert.equal(SofiaManagedPersonProfileRequest.safeParse({ ...envelope, action: 'update_person_profile', data: { targetPhone: row.phone, patch: { phone: '5521999999900', isActive: true, jobTitle: 'Gestor' } } }).success, true)
 assert.equal(SofiaManagedPersonProfileRequest.safeParse({ ...envelope, action: 'update_person_profile', data: { targetPhone: row.phone, patch: { role: 'ADMIN' } } }).success, false)
 assert.equal(SofiaManagedPersonProfileRequest.safeParse({ ...envelope, action: 'update_person_profile', data: { targetPhone: row.phone, patch: { isActive: true }, phoneIdentityMode: 'registration_only' } }).success, false)
})
test('malformed sender identity is rejected rather than normalized into a valid identity', async () => {
 for (const phone of ['abc5521999999999', ' +5521999999999', '+55 (21) 999999999', '', '+0000000000']) {
  const { repo, lookedUp } = repository()
  assert.equal((await executeSofiaPersonProfile('get_my_profile', {}, phone, repo)).status, 422)
  assert.equal(lookedUp.length, 0)
 }
})
test('missing and inactive profiles are never updated', async () => {
 const { repo } = repository()
 assert.equal((await executeSofiaPersonProfile('get_my_profile', {}, '+5521888888888', repo)).status, 404)
 repo.findByPhone = async () => ({ ...row, isActive: false })
 repo.updateByPhone = async () => { throw new Error('must not update') }
 assert.equal((await executeSofiaPersonProfile('update_my_profile', { name: 'Novo' }, '+5521999999999', repo)).status, 403)
})
