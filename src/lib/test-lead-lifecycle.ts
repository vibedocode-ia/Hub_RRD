/**
 * Pure planning module for purging test-run leads.
 *
 * No database access, no I/O, no imports: given the requested test-run id plus
 * a candidate lead snapshot, it decides whether that lead may be deleted as
 * part of a test-data purge run.
 */

export type TestLeadLifecycleStatus = string

export type TestLeadPurgeLead = {
  id: string
  status: TestLeadLifecycleStatus
  testRunId: string | null
  convertedClientId?: string | null
}

/**
 * Fatos de auditoria do lead candidato: quantos eventos existem e se o vinculo
 * `lead_audit_events.lead_id -> leads.id` permite rete-los DESTACADOS do lead
 * purgado (coluna anulavel + ON DELETE SET NULL). Sem essa capacidade os
 * eventos jamais podem ser apagados e a purga precisa ser bloqueada.
 */
export type TestLeadPurgeAuditEvents = {
  count: number
  retainableDetached: boolean
}

export type TestLeadPurgeInput = {
  testRunId: string | null
  lead: TestLeadPurgeLead
  proposalCount: number
  documentCount: number
  externalReferenceCount: number
  auditEvents?: TestLeadPurgeAuditEvents
}

export type TestLeadPurgeBlocker =
  | 'missing-run-id'
  | 'run-id-mismatch'
  | 'status-not-new'
  | 'converted-client-linked'
  | 'proposals-linked'
  | 'documents-linked'
  | 'external-references-linked'
  | 'service-requests-linked'
  | 'audit-events-linked'
  | 'audit-events-not-retainable'
  | 'external-audit-events-linked'
  | 'unclassified-references-linked'
  | 'addresses-not-disposable'

export type TestLeadPurgePlan = {
  allowed: boolean
  blockers: string[]
}

/**
 * A lead is only purgeable when it belongs to the explicitly requested
 * (non-empty) test run, is still NEW, was never converted into a real client
 * and carries no proposals, documents or external references.
 */
export function planTestLeadPurge(input: TestLeadPurgeInput): TestLeadPurgePlan {
  const blockers: TestLeadPurgeBlocker[] = []

  const requestedRunId =
    typeof input.testRunId === 'string' && input.testRunId.trim().length > 0
      ? input.testRunId
      : null

  const lead = input.lead

  if (requestedRunId === null) {
    // Never purge without an explicit test-run scope (guards real data).
    blockers.push('missing-run-id')
  } else if (typeof lead.testRunId !== 'string' || lead.testRunId !== requestedRunId) {
    blockers.push('run-id-mismatch')
  }

  if (lead.status !== 'NEW') {
    blockers.push('status-not-new')
  }

  if (lead.convertedClientId !== null && lead.convertedClientId !== undefined) {
    blockers.push('converted-client-linked')
  }

  if (input.proposalCount !== 0) {
    blockers.push('proposals-linked')
  }

  if (input.documentCount !== 0) {
    blockers.push('documents-linked')
  }

  if (input.externalReferenceCount !== 0) {
    blockers.push('external-references-linked')
  }

  const auditEvents = input.auditEvents
  if (auditEvents && auditEvents.count > 0 && !auditEvents.retainableDetached) {
    // Dado de auditoria NUNCA e apagado. Sem FK anulavel com ON DELETE SET NULL
    // nao existe forma de reter o evento destacado do lead que sera removido,
    // entao a purga e bloqueada (dentro da mesma transacao, sem deletar nada).
    blockers.push('audit-events-not-retainable')
  }

  return {
    allowed: blockers.length === 0,
    blockers,
  }
}

/* -------------------------------------------------------------------------- *
 * Commercial-operation guard for test-run leads (proposal / conversion).
 *
 * A lead created inside a test run (non-empty `testRunId`) may never receive a
 * commercial proposal nor be converted into a real client: the only valid
 * operation for it is the controlled purge above, scoped to its own testRunId.
 * An unmarked lead (null / undefined / empty / whitespace-only testRunId) is a
 * normal lead and may proceed. Fail-closed: any non-blank marker blocks.
 * -------------------------------------------------------------------------- */

export type TestLeadOperationKind = 'proposal' | 'conversion'

export type TestLeadOperationInput = {
  operation: TestLeadOperationKind
  testRunId: string | null | undefined
}

export const TEST_LEAD_OPERATION_BLOCKED = 'TEST_LEAD_OPERATION_BLOCKED'

const belongsToTestRun = (testRunId: string | null | undefined): boolean =>
  typeof testRunId === 'string' && testRunId.trim().length > 0

/**
 * true  -> real lead (no test-run marker): proposal/conversion allowed.
 * false -> lead of a test run (non-empty marker): must be blocked.
 */
export function canOperateOnTestLead(input: TestLeadOperationInput): boolean {
  switch (input.operation) {
    case 'proposal':
    case 'conversion':
      return !belongsToTestRun(input.testRunId)
    default:
      return !belongsToTestRun(input.testRunId)
  }
}

/**
 * Throws an Error whose message is exactly `TEST_LEAD_OPERATION_BLOCKED` when
 * the target lead belongs to a test run. Callers map that code to HTTP 409.
 */
export function assertLeadNotTestData(input: TestLeadOperationInput): void {
  if (!canOperateOnTestLead(input)) throw new Error(TEST_LEAD_OPERATION_BLOCKED)
}

/* -------------------------------------------------------------------------- *
 * 1. Relacoes FK com `leads`: inventario e allowlist de descarte.
 *
 * O contrato de purga e "deletion-only": exatamente DUAS tabelas podem perder
 * linhas, nunca por cascade amplo e nunca sem allowlist explicita:
 *
 *   lead_addresses     -> UNICA tabela allowlistada (endereco do dado de teste,
 *                         descartavel) e apenas quando nao existem propostas
 *                         nem documentos oficiais ligados ao lead;
 *   leads              -> a propria linha do lead.
 *
 * Qualquer outra relacao (lead_service_requests, lead_proposals,
 * lead_documents, auditoria e qualquer FK futura nao conhecida) e um BLOQUEIO,
 * nunca um cascade.
 * -------------------------------------------------------------------------- */

export const TEST_LEAD_LEAD_COLUMN = 'lead_id'
export const TEST_LEAD_PARENT_TABLE = 'leads'
export const TEST_LEAD_DISPOSABLE_CHILD_TABLE = 'lead_addresses'
export const TEST_LEAD_AUDIT_CHILD_TABLE = 'lead_audit_events'

/**
 * SEGUNDO pai referenciado do modulo comercial: o endereco do lead de teste.
 *
 * Ele e a unica filha descartavel de `leads`, mas isso nao dispensa descobrir
 * QUEM referencia `lead_addresses`: apagar o endereco pode falhar (RESTRICT /
 * NO ACTION) ou arrastar linhas de terceiros se a FK de entrada nao estiver na
 * allowlist. Por isso a descoberta tambem e dirigida por este pai.
 */
export const TEST_LEAD_ADDRESS_PARENT_TABLE = 'lead_addresses'

/** Coluna filha EXATA da FK que referencia `lead_addresses`. */
export const TEST_LEAD_ADDRESS_REFERENCE_COLUMN = 'lead_address_id'

/**
 * Lista FECHADA de tabelas pai cujas FKs a rota precisa descobrir no catalogo
 * do Postgres. A descoberta e dirigida pelo PAI (`confrelid = to_regclass(<pai>)`)
 * e nunca por tabela filha fixa: uma FK nova que aponte para `leads` ou para
 * `lead_addresses` aparece sozinha e, fora da allowlist, bloqueia a purga.
 */
export const TEST_LEAD_REFERENCED_PARENT_TABLES = [
  TEST_LEAD_PARENT_TABLE,
  TEST_LEAD_ADDRESS_PARENT_TABLE,
] as const

/** Relacoes contadas explicitamente pela rota (bloqueiam se tiverem linha). */
export const TEST_LEAD_COUNTED_CHILD_TABLES = [
  'lead_proposals',
  'lead_documents',
  'lead_service_requests',
] as const

/** Toda relacao conhecida com `leads` hoje. */
export const TEST_LEAD_KNOWN_CHILD_TABLES = [
  TEST_LEAD_DISPOSABLE_CHILD_TABLE,
  TEST_LEAD_AUDIT_CHILD_TABLE,
  ...TEST_LEAD_COUNTED_CHILD_TABLES,
] as const

/** Tabelas que a rota pode tocar. Nada fora daqui pode receber DELETE. */
export const TEST_LEAD_DELETABLE_CHILD_TABLES = [TEST_LEAD_DISPOSABLE_CHILD_TABLE] as const

export function isKnownLeadReferenceTable(table: string): boolean {
  return (TEST_LEAD_KNOWN_CHILD_TABLES as readonly string[]).includes(table)
}

export function isLeadAddresses(relation: { childTable: string; childColumn: string }): boolean {
  return (
    relation.childTable === TEST_LEAD_DISPOSABLE_CHILD_TABLE &&
    relation.childColumn === TEST_LEAD_LEAD_COLUMN
  )
}

/* -------------------------------------------------------------------------- *
 * 2. Semantica da FK de auditoria, lida do catalogo do Postgres em runtime.
 * -------------------------------------------------------------------------- */

export type TestLeadFkDeleteAction =
  | 'cascade'
  | 'set null'
  | 'restrict'
  | 'no action'
  | 'set default'
  | 'unknown'

export type TestLeadFkFacts = {
  childTable: string
  childColumn: string
  childColumnNotNull: boolean
  onDelete: TestLeadFkDeleteAction
}

/** confdeltype do pg_constraint -> acao de delecao. */
export function mapFkDeleteAction(code: unknown): TestLeadFkDeleteAction {
  switch (String(code ?? '').trim().toLowerCase()) {
    case 'c':
      return 'cascade'
    case 'n':
      return 'set null'
    case 'r':
      return 'restrict'
    case 'a':
      return 'no action'
    case 'd':
      return 'set default'
    default:
      return 'unknown'
  }
}

export type TestLeadAuditRetentionReason =
  | 'fk-nullable-set-null'
  | 'fk-missing'
  | 'fk-column-not-nullable'
  | 'fk-delete-action-not-set-null'

export type TestLeadAuditRetentionPlan = {
  /** true apenas quando a FK permite reter o evento DESTACADO do lead purgado. */
  retainable: boolean
  reason: TestLeadAuditRetentionReason
  detail: string
}

const auditRelationLabel = (facts: TestLeadFkFacts | null | undefined): string =>
  facts
    ? `${facts.childTable}.${facts.childColumn} -> ${TEST_LEAD_PARENT_TABLE}.id (${facts.onDelete}${
        facts.childColumnNotNull ? ', NOT NULL' : ', NULL'
      })`
    : `${TEST_LEAD_AUDIT_CHILD_TABLE}.${TEST_LEAD_LEAD_COLUMN} -> ${TEST_LEAD_PARENT_TABLE}.id (ausente)`

/**
 * Regra explicita de retencao de auditoria (eixo central desta rota).
 *
 * Dado de auditoria NUNCA e apagado. Como um lead de teste sempre possui o
 * evento `lead.test_created`, a unica forma honesta de purgar o lead retendo a
 * auditoria e deixar a propria FK destacar o evento
 * (`lead_audit_events.lead_id` anulavel + ON DELETE SET NULL). Qualquer outro
 * arranjo (coluna NOT NULL, CASCADE, RESTRICT, NO ACTION, FK ausente) torna a
 * purga impossivel sem apagar auditoria e portanto BLOQUEIA a operacao:
 *
 *   NOT NULL                 -> nao ha como destacar o evento (block)
 *   CASCADE                  -> o DELETE do lead apagaria a auditoria (block)
 *   RESTRICT / NO ACTION     -> o DELETE do lead falharia no banco (block)
 *   SET NULL (coluna nula)   -> evento retido destacado, auditavel (LIBERA)
 */
export function planTestLeadAuditRetention(
  facts: TestLeadFkFacts | null | undefined,
): TestLeadAuditRetentionPlan {
  const label = auditRelationLabel(facts)

  if (!facts) {
    return {
      retainable: false,
      reason: 'fk-missing',
      detail: `${label}: relacao de auditoria do lead nao encontrada no catalogo; sem certeza de retencao, bloqueia.`,
    }
  }

  if (facts.childTable !== TEST_LEAD_AUDIT_CHILD_TABLE) {
    return {
      retainable: false,
      reason: 'fk-missing',
      detail: `${label}: relacao de auditoria do lead nao encontrada no catalogo (recebido ${facts.childTable}); bloqueia.`,
    }
  }

  if (facts.childColumnNotNull) {
    return {
      retainable: false,
      reason: 'fk-column-not-nullable',
      detail: `${label}: coluna NOT NULL impede destacar o evento de auditoria do lead purgado; bloqueia para nunca apagar auditoria.`,
    }
  }

  if (facts.onDelete !== 'set null') {
    return {
      retainable: false,
      reason: 'fk-delete-action-not-set-null',
      detail: `${label}: acao de delecao diferente de SET NULL; o evento seria apagado ou o DELETE falharia; bloqueia.`,
    }
  }

  return {
    retainable: true,
    reason: 'fk-nullable-set-null',
    detail: `${label}: evento de auditoria retido e destacado do lead purgado.`,
  }
}

/* -------------------------------------------------------------------------- *
 * 2b. Descoberta das FKs no catalogo do Postgres, DIRIGIDA PELO PAI.
 *
 * A rota nunca fixa uma tabela filha (isso deixaria toda FK nova passar
 * despercebida). Ela pergunta ao catalogo vivo QUEM referencia cada tabela pai
 * (`c.confrelid = to_regclass(<pai>)`), resolve o nome da filha
 * (`pg_class.relname`) e a coluna filha exata (`unnest(conkey)` + `pg_attribute`)
 * e entrega cada relacao aqui para classificacao DETERMINISTICA.
 *
 * Toda relacao que nao casar a allowlist fechada — tabela desconhecida, coluna
 * errada, FK composta ou acao de delecao fora do mapa — entra como
 * `unclassified` e o contador sai da classificacao, nunca de um literal.
 * -------------------------------------------------------------------------- */

export type TestLeadReferencedParentTable = (typeof TEST_LEAD_REFERENCED_PARENT_TABLES)[number]

/** Uma relacao de FK lida do catalogo do Postgres, com o pai ja resolvido. */
export type TestLeadCatalogReference = {
  parentTable: string
  childTable: string
  childColumn: string
  childColumnNotNull: boolean
  /** array_length(conkey, 1): > 1 significa FK composta (nunca classificavel). */
  columnCount: number
  onDelete: TestLeadFkDeleteAction
}

export type TestLeadCatalogClassification = {
  /** Relacoes que casam a allowlist fechada (podem ser contadas/descartadas). */
  classified: TestLeadCatalogReference[]
  /** Relacoes fora da allowlist: SEMPRE bloqueiam, independente de contagem. */
  unclassified: TestLeadCatalogReference[]
  /** Diagnostico: tabelas filhas fora de TEST_LEAD_KNOWN_CHILD_TABLES. */
  unknownChildTables: string[]
  /** Derivado da classificacao (unclassified.length) — nunca um literal. */
  unclassifiedReferenceCount: number
}

/** Coluna filha EXATA exigida para cada PAI referenciado (lista fechada). */
const TEST_LEAD_EXPECTED_CHILD_COLUMN: Record<string, string> = {
  [TEST_LEAD_PARENT_TABLE]: TEST_LEAD_LEAD_COLUMN,
  [TEST_LEAD_ADDRESS_PARENT_TABLE]: TEST_LEAD_ADDRESS_REFERENCE_COLUMN,
}

/**
 * Uma relacao descoberta so e classificada (allowlist) quando TODOS os fatos
 * casam a allowlist fechada:
 *
 *   - o pai referenciado esta na lista fechada (leads / lead_addresses);
 *   - a tabela filha e conhecida (TEST_LEAD_KNOWN_CHILD_TABLES);
 *   - a FK tem UMA coluna (FK composta e classificavel por engano: bloqueia);
 *   - a coluna filha casa EXATAMENTE a coluna esperada do pai
 *     (`lead_id` para `leads`, `lead_address_id` para `lead_addresses`);
 *   - a acao de delecao foi reconhecida no catalogo (nunca `unknown`).
 *
 * Qualquer desvio devolve false: a relacao entra como bloqueio da purga.
 */
export function classifyCatalogReference(relation: TestLeadCatalogReference): boolean {
  const expectedColumn = TEST_LEAD_EXPECTED_CHILD_COLUMN[relation.parentTable]
  if (expectedColumn === undefined) return false
  if (!isKnownLeadReferenceTable(relation.childTable)) return false
  if (relation.columnCount !== 1) return false
  if (relation.onDelete === 'unknown') return false
  if (expectedColumn === TEST_LEAD_LEAD_COLUMN) {
    return relation.childColumn === TEST_LEAD_LEAD_COLUMN
  }
  return relation.childColumn === TEST_LEAD_ADDRESS_REFERENCE_COLUMN
}

export function classifyTestLeadCatalogReferences(
  relations: readonly TestLeadCatalogReference[],
): TestLeadCatalogClassification {
  const classified: TestLeadCatalogReference[] = []
  const unclassified: TestLeadCatalogReference[] = []

  for (const relation of relations) {
    if (classifyCatalogReference(relation)) classified.push(relation)
    else unclassified.push(relation)
  }

  const unknownChildTables = [
    ...new Set(
      unclassified
        .filter((relation) => !isKnownLeadReferenceTable(relation.childTable))
        .map((relation) => relation.childTable),
    ),
  ]

  return {
    classified,
    unclassified,
    unknownChildTables,
    unclassifiedReferenceCount: unclassified.length,
  }
}

/* -------------------------------------------------------------------------- *
 * 3. Classificacao das referencias contadas para o lead alvo.
 * -------------------------------------------------------------------------- */

export type TestLeadReferenceSnapshot = {
  addressCount: number
  proposalCount: number
  documentCount: number
  serviceRequestCount: number
  auditEventCount: number
  /** Auditoria generica (`audit_events`) apontando para o lead: sem FK, nunca apagada. */
  externalAuditEventCount: number
  /** Relacoes FK com `leads` fora do inventario conhecido: sempre bloqueiam. */
  unclassifiedReferenceCount: number
}

export type TestLeadReferenceClassification = {
  blockingCount: number
  blockers: TestLeadPurgeBlocker[]
  addressDeleteAllowed: boolean
  disposableAddressCount: number
  retainedAuditEventCount: number
}

/**
 * Converte o inventario de referencias em (a) o contador de bloqueio que
 * alimenta `planTestLeadPurge`, (b) os codigos de bloqueio e (c) se o endereco
 * do lead pode ser descartado. `lead_addresses` e a UNICA allowlist e so pode
 * ser descartada quando nao ha proposta/documento (nem qualquer outra
 * referencia bloqueante) ligada ao lead.
 */
export function classifyTestLeadReferences(
  snapshot: TestLeadReferenceSnapshot,
  auditRetention: TestLeadAuditRetentionPlan,
): TestLeadReferenceClassification {
  const blockers: TestLeadPurgeBlocker[] = []

  const auditEventsBlocking = auditRetention.retainable ? 0 : snapshot.auditEventCount

  if (snapshot.serviceRequestCount > 0) blockers.push('service-requests-linked')
  if (auditEventsBlocking > 0) blockers.push('audit-events-linked')
  if (snapshot.externalAuditEventCount > 0) blockers.push('external-audit-events-linked')
  if (snapshot.unclassifiedReferenceCount > 0) blockers.push('unclassified-references-linked')

  const blockingCount =
    snapshot.serviceRequestCount +
    auditEventsBlocking +
    snapshot.externalAuditEventCount +
    snapshot.unclassifiedReferenceCount

  const addressDeleteAllowed =
    snapshot.proposalCount === 0 && snapshot.documentCount === 0 && blockingCount === 0

  if (!addressDeleteAllowed && snapshot.addressCount > 0) {
    // Trilha explicita: sem allowlist liberada o endereco nao e descartado.
    if (blockingCount > 0) blockers.push('addresses-not-disposable')
  }

  return {
    blockingCount,
    blockers,
    addressDeleteAllowed,
    disposableAddressCount: addressDeleteAllowed ? snapshot.addressCount : 0,
    retainedAuditEventCount: auditRetention.retainable ? snapshot.auditEventCount : 0,
  }
}

/* -------------------------------------------------------------------------- *
 * 4. Relatorio da purga: JSON sem PII, com lista fechada de chaves.
 * -------------------------------------------------------------------------- */

export const TEST_LEAD_PURGE_REPORT_KEYS = [
  'success',
  'purged',
  'outcome',
  'leadId',
  'runId',
  'allowed',
  'blockers',
  'counts',
  'deletions',
  'audit',
] as const

export const TEST_LEAD_PURGE_COUNT_KEYS = [
  'addresses',
  'proposals',
  'documents',
  'serviceRequests',
  'auditEvents',
  'externalAuditEvents',
  'unclassifiedReferences',
  'blockingReferences',
] as const

export type TestLeadPurgeOutcome = 'purged' | 'blocked' | 'not-found'

export type TestLeadPurgeReportInput = {
  outcome: TestLeadPurgeOutcome
  leadId: string
  testRunId: string | null
  plan: TestLeadPurgePlan
  snapshot: TestLeadReferenceSnapshot
  classification: TestLeadReferenceClassification
  auditRetention: TestLeadAuditRetentionPlan
  systemAuditEventWritten: boolean
}

/**
 * Relatorio PII-free: apenas ids (uuid), contadores e codigos. Nenhum nome,
 * telefone, documento, e-mail ou endereco entra aqui — a rota nem os le na
 * consulta de trava. A lista de chaves e fechada e verificada pelos testes
 * contra `TEST_LEAD_PURGE_REPORT_KEYS`.
 */
export type TestLeadPurgeReport = {
  success: boolean
  purged: boolean
  outcome: TestLeadPurgeOutcome
  leadId: string
  runId: string | null
  allowed: boolean
  blockers: string[]
  counts: Record<(typeof TEST_LEAD_PURGE_COUNT_KEYS)[number], number>
  deletions: { leadAddresses: number; leads: number }
  audit: {
    leadAuditEventsRetained: number
    leadAuditEventsRetainableDetached: boolean
    retentionReason: TestLeadAuditRetentionReason
    systemEventWritten: boolean
  }
}
export function buildTestLeadPurgeReport(input: TestLeadPurgeReportInput): TestLeadPurgeReport {
  const purged = input.outcome === 'purged'

  return {
    success: purged,
    purged,
    outcome: input.outcome,
    leadId: input.leadId,
    runId: input.testRunId,
    allowed: input.plan.allowed,
    blockers: [...input.plan.blockers, ...input.classification.blockers],
    counts: {
      addresses: input.snapshot.addressCount,
      proposals: input.snapshot.proposalCount,
      documents: input.snapshot.documentCount,
      serviceRequests: input.snapshot.serviceRequestCount,
      auditEvents: input.snapshot.auditEventCount,
      externalAuditEvents: input.snapshot.externalAuditEventCount,
      unclassifiedReferences: input.snapshot.unclassifiedReferenceCount,
      blockingReferences: input.classification.blockingCount,
    },
    deletions: {
      leadAddresses: purged ? input.classification.disposableAddressCount : 0,
      leads: purged ? 1 : 0,
    },
    audit: {
      leadAuditEventsRetained: input.classification.retainedAuditEventCount,
      leadAuditEventsRetainableDetached: input.auditRetention.retainable,
      retentionReason: input.auditRetention.reason,
      systemEventWritten: purged && input.systemAuditEventWritten,
    },
  }
}
