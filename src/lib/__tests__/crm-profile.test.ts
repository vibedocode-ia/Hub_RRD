import test from 'node:test'
import assert from 'node:assert/strict'
import { buildCrmProfile, normalizeCrmInput } from '../crm-profile'

test('CRM profile keeps editable relationship fields and derives financial and service metrics from real records', () => {
  const input = normalizeCrmInput({
    type: 'CONDOMINIO', recurrence: 'CONTRATO_FIXO', source: 'INDICACAO',
    customerSince: '2023-06-01', lastContactAt: '2026-09-10', nextVisitAt: '2026-09-20', notes: 'Portaria avisa a equipe.',
  })
  assert.deepEqual(input, {
    type: 'CONDOMINIO', recurrence: 'CONTRATO_FIXO', source: 'INDICACAO', customerSince: new Date('2023-06-01T12:00:00.000Z'),
    lastContactAt: new Date('2026-09-10T12:00:00.000Z'), nextVisitAt: new Date('2026-09-20T12:00:00.000Z'), notes: 'Portaria avisa a equipe.',
  })

  const profile = buildCrmProfile({
    client: { recurrence: 'CONTRATO_FIXO', customerSince: new Date('2023-06-01T12:00:00.000Z'), lastContactAt: new Date('2026-09-10T12:00:00.000Z'), nextVisitAt: new Date('2026-09-20T12:00:00.000Z') },
    services: [{ code: 'OS-9', serviceType: 'HIDROJATEAMENTO', status: 'CONCLUIDO', totalAmount: '900.00', completedAt: new Date('2026-09-09T12:00:00.000Z'), createdAt: new Date('2026-09-01T12:00:00.000Z') }],
    financial: [
      { tipo: 'RECEITA', status: 'EFETIVADO', valor: '900.00', data: new Date('2026-09-09T12:00:00.000Z') },
      { tipo: 'RECEITA', status: 'PENDENTE', valor: '350.00', data: new Date('2026-09-12T12:00:00.000Z') },
    ],
  })
  assert.equal(profile.totalPaid, 900)
  assert.equal(profile.pendingAmount, 350)
  assert.equal(profile.lastPayment?.amount, 900)
  assert.equal(profile.lastService?.code, 'OS-9')
  assert.equal(profile.serviceCount, 1)
  assert.equal(profile.financialStatus, 'ATENCAO')
})

test('CRM profile exposes no invented values when service or financial data is absent', () => {
  const profile = buildCrmProfile({ client: {}, services: [], financial: [] })
  assert.equal(profile.totalPaid, 0)
  assert.equal(profile.pendingAmount, 0)
  assert.equal(profile.lastPayment, null)
  assert.equal(profile.lastService, null)
  assert.equal(profile.financialStatus, 'SEM_HISTORICO')
})

test('CRM input rejects relationship values outside the closed contract', () => {
  assert.throws(() => normalizeCrmInput({ recurrence: 'VIP', source: 'TOKEN_SECRETO' }))
})
