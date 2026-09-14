import test from 'node:test'
import assert from 'node:assert/strict'
import { CreateAgendaEventSchema, CreateContactSchema, normalizeGoogleSettings } from '../validation/contacts-agenda'

test('contato representa pessoa sem empresa e rejeita campos desconhecidos', () => {
  assert.equal(CreateContactSchema.safeParse({ name: 'João da Silva', phone: '(21) 99999-0000', instagramUrl: 'https://instagram.com/joao' }).success, true)
  assert.equal(CreateContactSchema.safeParse({ name: 'João', arbitrary: 'x' }).success, false)
})

test('agenda exige fim posterior ao início e permite vínculos operacionais opcionais', () => {
  const valid = CreateAgendaEventSchema.safeParse({ title: 'Visita técnica', startsAt: '2026-10-01T09:00:00.000Z', endsAt: '2026-10-01T10:00:00.000Z' })
  assert.equal(valid.success, true)
  assert.equal(CreateAgendaEventSchema.safeParse({ title: 'Inválido', startsAt: '2026-10-01T10:00:00.000Z', endsAt: '2026-10-01T09:00:00.000Z' }).success, false)
})

test('email principal Google é validado e não implica conexão OAuth', () => {
  assert.deepEqual(normalizeGoogleSettings({ primaryEmail: 'agenda@rrd.example' }), { primaryEmail: 'agenda@rrd.example' })
  assert.throws(() => normalizeGoogleSettings({ primaryEmail: 'invalido' }))
})
