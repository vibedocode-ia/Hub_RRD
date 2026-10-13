import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import {
  planTestLeadPurge,
  canOperateOnTestLead,
  assertLeadNotTestData,
  planTestLeadAuditRetention,
  classifyTestLeadReferences,
  mapFkDeleteAction,
} from '../test-lead-lifecycle'

type TestLeadPurgeInput = {
  testRunId: string | null
  lead: {
    id: string
    status: string
    testRunId: string | null
    convertedClientId?: string | null
  }
  proposalCount: number
  documentCount: number
  externalReferenceCount: number
  auditEvents?: { count: number; retainableDetached: boolean }
}

const RUN_ID = 'run-2026-10-13-001'

const purgeInput = (overrides: Partial<TestLeadPurgeInput> = {}): TestLeadPurgeInput => ({
  testRunId: RUN_ID,
  lead: { id: 'lead-1', status: 'NEW', testRunId: RUN_ID, convertedClientId: null },
  proposalCount: 0,
  documentCount: 0,
  externalReferenceCount: 0,
  ...overrides,
})

test('planTestLeadPurge libera lead NEW ativo da propria sessao, sem propostas, documentos ou referencias externas', () => {
  const plan = planTestLeadPurge(purgeInput())
  assert.equal(plan.allowed, true)
})

test('planTestLeadPurge rejeita quando testRunId e nulo (nunca purgar dado real)', () => {
  const plan = planTestLeadPurge(purgeInput({ testRunId: null }))
  assert.equal(plan.allowed, false)
})

test('planTestLeadPurge rejeita lead que nao pertence a sessao do testRunId', () => {
  const plan = planTestLeadPurge(purgeInput({ lead: { id: 'lead-1', status: 'NEW', testRunId: 'outra-sessao', convertedClientId: null } }))
  assert.equal(plan.allowed, false)
})

test('planTestLeadPurge rejeita lead com status CONVERTED', () => {
  const plan = planTestLeadPurge(purgeInput({ lead: { id: 'lead-1', status: 'CONVERTED', testRunId: RUN_ID, convertedClientId: null } }))
  assert.equal(plan.allowed, false)
})

test('planTestLeadPurge rejeita lead ja vinculado a cliente convertido', () => {
  const plan = planTestLeadPurge(purgeInput({ lead: { id: 'lead-1', status: 'NEW', testRunId: RUN_ID, convertedClientId: 'client-1' } }))
  assert.equal(plan.allowed, false)
})

test('planTestLeadPurge rejeita lead com propostas (proposalCount > 0)', () => {
  const plan = planTestLeadPurge(purgeInput({ proposalCount: 1 }))
  assert.equal(plan.allowed, false)
})

test('planTestLeadPurge rejeita lead com documentos (documentCount > 0)', () => {
  const plan = planTestLeadPurge(purgeInput({ documentCount: 1 }))
  assert.equal(plan.allowed, false)
})

test('planTestLeadPurge rejeita lead com referencias externas (externalReferenceCount > 0)', () => {
  const plan = planTestLeadPurge(purgeInput({ externalReferenceCount: 1 }))
  assert.equal(plan.allowed, false)
})

/* -------------------------------------------------------------------------- *
 * FK de auditoria real do lead: append-only, NOT NULL + ON DELETE cascade.
 *
 * O schema real (src/db/schema.ts e src/db/migrations/0020_leads_isolated.sql)
 * define `lead_audit_events.lead_id` como NOT NULL REFERENCES leads(id)
 * ON DELETE cascade. A auditoria nunca pode ser destacada nem retida fora do
 * lead: o DELETE do lead arrastaria a trilha junto. Logo, todo lead com evento
 * de auditoria e BLOQUEIO da purga automatica ("hard purge") — nunca um cascade
 * tolerado — e a rota precisa contar os eventos, bloquear e NAO apaga-los.
 * -------------------------------------------------------------------------- */

/** Fatos da FK de auditoria exatamente como o catalogo do Postgres os entrega. */
const AUDIT_FK_FACTS = {
  childTable: 'lead_audit_events',
  childColumn: 'lead_id',
  childColumnNotNull: true,
  onDelete: 'cascade',
} as const

test('mapFkDeleteAction traduz confdeltype do pg_constraint (c = cascade)', () => {
  assert.equal(mapFkDeleteAction('c'), 'cascade')
  assert.equal(mapFkDeleteAction('n'), 'set null')
  assert.equal(mapFkDeleteAction('r'), 'restrict')
  assert.equal(mapFkDeleteAction('a'), 'no action')
  assert.equal(mapFkDeleteAction('d'), 'set default')
  assert.equal(mapFkDeleteAction('x'), 'unknown')
})

test('planTestLeadAuditRetention bloqueia a FK de auditoria NOT NULL (ciclo de vida append-only)', () => {
  const retention = planTestLeadAuditRetention(AUDIT_FK_FACTS)

  assert.equal(retention.retainable, false, 'auditoria NOT NULL nao pode ser retida destacada')
  assert.equal(retention.reason, 'fk-column-not-nullable')
})

test('planTestLeadAuditRetention bloqueia qualquer acao de delecao diferente de set null', () => {
  for (const onDelete of ['cascade', 'restrict', 'no action', 'set default', 'unknown'] as const) {
    const retention = planTestLeadAuditRetention({
      ...AUDIT_FK_FACTS,
      childColumnNotNull: false,
      onDelete,
    })

    assert.equal(retention.retainable, false, `onDelete=${onDelete} nao pode liberar a purga`)
    assert.equal(retention.reason, 'fk-delete-action-not-set-null')
  }
})

test('planTestLeadPurge bloqueia lead com evento de auditoria (hard purge rejeitado)', () => {
  const plan = planTestLeadPurge({
    ...purgeInput(),
    auditEvents: { count: 1, retainableDetached: false },
  })

  assert.equal(plan.allowed, false)
  assert.ok(plan.blockers.includes('audit-events-not-retainable'))
})

test('planTestLeadPurge continua liberando lead de teste sem evento de auditoria', () => {
  assert.equal(
    planTestLeadPurge({ ...purgeInput(), auditEvents: { count: 0, retainableDetached: false } }).allowed,
    true,
  )
  assert.equal(planTestLeadPurge(purgeInput()).allowed, true)
})

test('classifyTestLeadReferences trata auditoria nao-retentavel como referencia bloqueante', () => {
  const retention = planTestLeadAuditRetention(AUDIT_FK_FACTS)
  const classification = classifyTestLeadReferences(
    {
      addressCount: 1,
      proposalCount: 0,
      documentCount: 0,
      serviceRequestCount: 0,
      auditEventCount: 2,
      externalAuditEventCount: 0,
      unclassifiedReferenceCount: 0,
    },
    retention,
  )

  assert.ok(classification.blockers.includes('audit-events-linked'))
  assert.equal(classification.retainedAuditEventCount, 0, 'nenhum evento pode ser retido/apagado')
  assert.equal(classification.addressDeleteAllowed, false)
  assert.equal(classification.disposableAddressCount, 0)
})

/* -------------------------------------------------------------------------- *
 * Guarda de operacao comercial sobre dado de teste (proposta / conversao).
 *
 * Contrato esperado de `src/lib/test-lead-lifecycle.ts` (modulo puro, sem I/O):
 *
 *   type TestLeadOperationKind = 'proposal' | 'conversion'
 *   type TestLeadOperationInput = { operation: TestLeadOperationKind; testRunId: string | null | undefined }
 *
 *   canOperateOnTestLead(input): boolean
 *     true  -> lead real (testRunId nulo, vazio ou somente espacos)
 *     false -> lead pertencente a uma sessao de teste (testRunId preenchido)
 *
 *   assertLeadNotTestData(input): void
 *     nao lanca quando a operacao e permitida;
 *     lanca Error com message === 'TEST_LEAD_OPERATION_BLOCKED' quando o lead
 *     pertence a uma sessao de teste.
 *
 * Um lead de teste NUNCA pode receber proposta comercial nem ser convertido
 * em cliente real: a unica operacao valida para ele e a purga controlada
 * (planTestLeadPurge) dentro do proprio testRunId.
 * -------------------------------------------------------------------------- */

type TestLeadOperationKind = 'proposal' | 'conversion'
type TestLeadOperationInput = {
  operation: TestLeadOperationKind
  testRunId: string | null | undefined
}

const guardInput = (
  operation: TestLeadOperationKind,
  testRunId: string | null | undefined,
): TestLeadOperationInput => ({ operation, testRunId })

const TEST_LEAD_BLOCKED_MESSAGE = 'TEST_LEAD_OPERATION_BLOCKED'

test('canOperateOnTestLead bloqueia criacao de proposta para lead marcado com testRunId', () => {
  assert.equal(canOperateOnTestLead(guardInput('proposal', RUN_ID)), false)
})

test('canOperateOnTestLead bloqueia conversao para lead marcado com testRunId', () => {
  assert.equal(canOperateOnTestLead(guardInput('conversion', RUN_ID)), false)
})

test('canOperateOnTestLead libera lead normal (testRunId nulo) em proposta e conversao', () => {
  assert.equal(canOperateOnTestLead(guardInput('proposal', null)), true)
  assert.equal(canOperateOnTestLead(guardInput('conversion', null)), true)
})

test('canOperateOnTestLead trata testRunId ausente, vazio ou em branco como lead normal', () => {
  assert.equal(canOperateOnTestLead(guardInput('proposal', undefined)), true)
  assert.equal(canOperateOnTestLead(guardInput('conversion', undefined)), true)
  assert.equal(canOperateOnTestLead(guardInput('proposal', '')), true)
  assert.equal(canOperateOnTestLead(guardInput('conversion', '   ')), true)
})

test('assertLeadNotTestData lanca TEST_LEAD_OPERATION_BLOCKED ao criar proposta em lead de teste', () => {
  assert.throws(
    () => assertLeadNotTestData(guardInput('proposal', RUN_ID)),
    (error: unknown) => error instanceof Error && error.message === TEST_LEAD_BLOCKED_MESSAGE,
    'esperado erro TEST_LEAD_OPERATION_BLOCKED para proposta em lead de sessao de teste',
  )
})

test('assertLeadNotTestData lanca TEST_LEAD_OPERATION_BLOCKED ao converter lead de teste', () => {
  assert.throws(
    () => assertLeadNotTestData(guardInput('conversion', RUN_ID)),
    (error: unknown) => error instanceof Error && error.message === TEST_LEAD_BLOCKED_MESSAGE,
    'esperado erro TEST_LEAD_OPERATION_BLOCKED para conversao de lead de sessao de teste',
  )
})

test('assertLeadNotTestData nao lanca para lead normal em proposta e conversao', () => {
  assert.doesNotThrow(() => assertLeadNotTestData(guardInput('proposal', null)))
  assert.doesNotThrow(() => assertLeadNotTestData(guardInput('conversion', null)))
  assert.doesNotThrow(() => assertLeadNotTestData(guardInput('conversion', undefined)))
})

/* -------------------------------------------------------------------------- *
 * Contratos de origem: cada ponto de mutacao comercial precisa consultar o
 * testRunId do lead ANTES de criar proposta, aprovar e converter.
 * -------------------------------------------------------------------------- */

const readSource = (relativePath: string) =>
  readFileSync(path.join(process.cwd(), relativePath), 'utf8')

const GUARD_CALL = /assertLeadNotTestData\(|canOperateOnTestLead\(/
const LEAD_TEST_RUN_READ = 'lead.testRunId'

const assertGuardPrecedesMutation = (
  source: string,
  mutationMarker: string,
  label: string,
) => {
  const guard = source.search(GUARD_CALL)
  const scopeRead = source.indexOf(LEAD_TEST_RUN_READ)
  const mutation = source.indexOf(mutationMarker)

  assert.ok(
    guard >= 0,
    `${label}: deve chamar assertLeadNotTestData/canOperateOnTestLead antes de mutar`,
  )
  assert.ok(
    scopeRead >= 0,
    `${label}: deve ler lead.testRunId para alimentar o guard`,
  )
  assert.ok(
    mutation >= 0,
    `${label}: marcador de mutacao '${mutationMarker}' nao encontrado`,
  )
  assert.ok(
    scopeRead < mutation,
    `${label}: a leitura de lead.testRunId deve ocorrer antes de '${mutationMarker}'`,
  )
  assert.ok(
    guard < mutation,
    `${label}: o guard de dados de teste deve rodar antes de '${mutationMarker}'`,
  )
}

test('rota de propostas do lead checa testRunId antes de inserir proposta ou mover o lead', () => {
  const source = readSource('src/app/api/leads/[id]/proposals/route.ts')
  assertGuardPrecedesMutation(source, 'tx.insert(leadProposals)', 'POST /api/leads/[id]/proposals')
  assertGuardPrecedesMutation(source, 'tx.update(leads)', 'POST /api/leads/[id]/proposals')
})

test('rota de proposta checa testRunId antes de atualizar status e antes de converter', () => {
  const source = readSource('src/app/api/lead-proposals/[id]/route.ts')
  assertGuardPrecedesMutation(source, 'tx.update(leadProposals)', 'PATCH /api/lead-proposals/[id]')
  assertGuardPrecedesMutation(source, 'convertApprovedLead(', 'PATCH /api/lead-proposals/[id]')
})

test('modulo de conversao checa testRunId apos travar o lead e antes de criar/atualizar cliente', () => {
  const source = readSource('src/lib/lead-conversion.ts')
  const leadLock = source.indexOf(".for('update')")
  const guard = source.search(GUARD_CALL)

  assert.ok(leadLock >= 0, 'lead-conversion: deve travar e reler o lead antes do guard')
  assert.ok(guard >= 0, 'lead-conversion: deve chamar assertLeadNotTestData/canOperateOnTestLead')
  assert.ok(
    guard > leadLock,
    'lead-conversion: o guard deve rodar depois de reler o lead dentro da transacao',
  )
  assertGuardPrecedesMutation(source, 'tx.insert(clients)', 'lead-conversion')
  assertGuardPrecedesMutation(source, 'tx.update(leads)', 'lead-conversion')
})
