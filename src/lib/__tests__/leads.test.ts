import test from 'node:test'
import assert from 'node:assert/strict'
import { canTransitionLead, LEAD_STATUSES, normalizeLeadDocument, normalizeLeadPhone, validateLeadInput } from '../leads'

test('lead exige nome e telefone normalizável antes de persistir', () => {
  assert.equal(validateLeadInput({ name: '', phone: '21999999999' }).ok, false)
  assert.equal(validateLeadInput({ name: 'Ana', phone: '' }).ok, false)
  assert.deepEqual(validateLeadInput({ name: '  Ana   Silva ', phone: '+55 (21) 99999-9999' }), { ok: true, value: { name: 'Ana Silva', phone: '5521999999999' } })
})

test('deduplicação usa telefone e documento normalizados', () => {
  assert.equal(normalizeLeadPhone('+55 (21) 99999-9999'), '5521999999999')
  assert.equal(normalizeLeadDocument('12.345.678/0001-95'), '12345678000195')
  assert.equal(normalizeLeadDocument(''), null)
})

test('lead só converte depois da aprovação comercial', () => {
  assert.equal(canTransitionLead(LEAD_STATUSES.NEW, LEAD_STATUSES.QUOTING), true)
  assert.equal(canTransitionLead(LEAD_STATUSES.QUOTING, LEAD_STATUSES.APPROVED), true)
  assert.equal(canTransitionLead(LEAD_STATUSES.APPROVED, LEAD_STATUSES.CONVERTED), true)
  assert.equal(canTransitionLead(LEAD_STATUSES.NEW, LEAD_STATUSES.CONVERTED), false)
  assert.equal(canTransitionLead(LEAD_STATUSES.CONVERTED, LEAD_STATUSES.LOST), false)
})
