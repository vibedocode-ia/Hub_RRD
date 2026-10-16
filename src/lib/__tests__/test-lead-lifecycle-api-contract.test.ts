/**
 * Contratos de origem (source contract) do ciclo de vida de dado de teste de Lead.
 *
 * Este arquivo NAO toca banco de dados: ele le os arquivos-fonte reais do repositorio
 * (schema.ts, migracoes drizzle, rotas internas) e importa apenas o modulo PURO de
 * planejamento (src/lib/test-lead-lifecycle.ts, sem I/O) para afirmar o contrato que o
 * codigo de producao precisa cumprir para que dado criado por uma sessao de teste fique
 * isolado e purgavel, sem jamais virar proposta, cliente ou dado real.
 *
 * Contrato coberto (migracao 0021_test_lead_lifecycle):
 *
 *   schema.ts        leads.test_run_id  -> uuid ANULAVEL + indice leads_test_run_id_idx
 *   _journal.json    ultima entrada     -> 0021_test_lead_lifecycle
 *
 *   schema.ts + 0020_leads_isolated.sql
 *     lead_audit_events.lead_id -> uuid NOT NULL REFERENCES leads(id) ON DELETE cascade
 *
 *     A auditoria do lead e APPEND-ONLY: a FK nunca destaca nem preserva o evento, e o
 *     DELETE do lead arrastaria a trilha inteira junto. Esse arranjo e classificado como
 *     BLOQUEIO da purga automatica ("hard purge"): qualquer lead com evento de auditoria
 *     nao pode ser purgado, e a rota deve contar os eventos, bloquear e NUNCA apaga-los.
 *
 *   rota interna de criacao (src/app/api/internal/.../route.ts)
 *     - exige permissao settings.manage
 *     - gera o UUID do lead no SERVIDOR (randomUUID()), nunca a partir do corpo
 *     - marca o lead com o testRunId da sessao
 *
 *   rota interna de item (src/app/api/internal/.../[id]/route.ts)
 *     - exige permissao settings.manage
 *     - trava o lead com FOR UPDATE dentro da transacao
 *     - conta propostas, documentos, referencias externas e EVENTOS DE AUDITORIA
 *     - decide a retencao da auditoria (NOT NULL + cascade => bloqueia)
 *     - chama planTestLeadPurge(...) e so entao deleta o lead, na mesma transacao
 *     - nunca deleta nem reescreve evento de auditoria
 *
 *   POST /api/leads (porta comercial normal)
 *     - NUNCA le body.testRunId: dado de teste nao entra pela porta normal
 *
 *   POST /api/leads/[id]/proposals + src/lib/lead-conversion.ts
 *     - consultam assertLeadNotTestData com lead.testRunId antes de mutar
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import {
  TEST_LEAD_AUDIT_CHILD_TABLE,
  TEST_LEAD_LEAD_COLUMN,
  classifyTestLeadReferences,
  mapFkDeleteAction,
  planTestLeadAuditRetention,
  planTestLeadPurge,
  type TestLeadFkDeleteAction,
  type TestLeadFkFacts,
} from '../test-lead-lifecycle'

const repoRoot = process.cwd()

const toAbsolute = (relativePath: string): string => path.join(repoRoot, relativePath)
const exists = (relativePath: string): boolean => existsSync(toAbsolute(relativePath))
const readSource = (relativePath: string): string => readFileSync(toAbsolute(relativePath), 'utf8')

/** Todas as rotas internas existentes hoje (route.ts sob src/app/api/internal). */
const listInternalRouteFiles = (): string[] => {
  const base = 'src/app/api/internal'
  if (!exists(base)) return []
  const found: string[] = []
  const walk = (current: string): void => {
    for (const entry of readdirSync(toAbsolute(current), { withFileTypes: true })) {
      const next = `${current}/${entry.name}`
      if (entry.isDirectory()) walk(next)
      else if (entry.name === 'route.ts') found.push(next)
    }
  }
  walk(base)
  return found.sort()
}

const INTERNAL_ROUTE_FILES = listInternalRouteFiles()

const CANONICAL_INTERNAL_CREATION_ROUTE = 'src/app/api/internal/test-leads/route.ts'
const CANONICAL_INTERNAL_ITEM_ROUTE = 'src/app/api/internal/test-leads/[id]/route.ts'

const isCollectionRoute = (relativePath: string): boolean => !relativePath.includes('[')

const CREATION_ROUTE_CONTRACT = (source: string): boolean =>
  /requireLocalPermission\(\s*'settings\.manage'\s*\)/.test(source) &&
  /randomUUID\(\)/.test(source) &&
  /testRunId|test_run_id/.test(source)

const ITEM_ROUTE_CONTRACT = (source: string): boolean => /planTestLeadPurge\(/.test(source)

type ResolvedRoute = { relativePath: string; source: string }

/**
 * Resolve a rota interna pelo caminho canonico; se ela ainda nao existe, procura
 * qualquer route.ts sob src/app/api/internal que ja cumpra o contrato. Quando
 * nada existe, falha listando o inventario atual (RED explicito, sem falso verde).
 */
const resolveInternalRoute = (
  label: string,
  canonicalPath: string,
  matchesContract: (source: string) => boolean,
  pathFilter: (relativePath: string) => boolean,
): ResolvedRoute => {
  if (exists(canonicalPath)) {
    return { relativePath: canonicalPath, source: readSource(canonicalPath) }
  }
  for (const candidate of INTERNAL_ROUTE_FILES) {
    if (!pathFilter(candidate)) continue
    const source = readSource(candidate)
    if (matchesContract(source)) return { relativePath: candidate, source }
  }
  const inventory = INTERNAL_ROUTE_FILES.length > 0 ? INTERNAL_ROUTE_FILES.join(', ') : 'nenhuma'
  return assert.fail(
    `${label}: rota interna ausente. Esperado ${canonicalPath} ` +
      `(ou rota equivalente sob src/app/api/internal cumprindo o contrato). ` +
      `Rotas internas existentes hoje: ${inventory}`,
  )
}

/* -------------------------------------------------------------------------- *
 * 1. Schema: coluna anulavel + indice
 * -------------------------------------------------------------------------- */

test('schema: leads.testRunId e coluna uuid ANULAVEL com indice leads_test_run_id_idx', () => {
  const schema = readSource('src/db/schema.ts')

  const leadsStart = schema.indexOf("pgTable('leads'")
  const leadsEnd = schema.indexOf('export const leadAddresses')
  assert.ok(leadsStart >= 0 && leadsEnd > leadsStart, 'schema: bloco da tabela leads nao identificado')
  const leadsBlock = schema.slice(leadsStart, leadsEnd)

  const columnLine = leadsBlock.split('\n').find((line) => line.includes("uuid('test_run_id')"))
  assert.ok(
    columnLine !== undefined,
    "schema: coluna leads.testRunId (uuid('test_run_id')) ausente na tabela leads",
  )
  assert.ok(
    !/notNull\(\)/.test(columnLine as string),
    `schema: leads.testRunId deve ser anulavel (lead real nao tem marcador de teste). Linha atual: ${(columnLine as string).trim()}`,
  )

  assert.match(
    leadsBlock,
    /index\('leads_test_run_id_idx'\)\.on\(table\.testRunId\)/,
    'schema: indice leads_test_run_id_idx sobre table.testRunId ausente',
  )
})

/* -------------------------------------------------------------------------- *
 * 1b. FK de auditoria do lead — append-only, lida do codigo-fonte real
 *
 * O schema real define `lead_audit_events.lead_id` como NOT NULL REFERENCES
 * leads(id) ON DELETE cascade (schema.ts e 0020_leads_isolated.sql). A auditoria e
 * append-only: nao existe arranjo em que o DELETE do lead preserve o evento — o
 * cascade apagaria a trilha. Consequencia contratual: todo lead com evento de
 * auditoria e BLOQUEIO da purga automatica, nunca um cascade tolerado.
 * -------------------------------------------------------------------------- */

const LEAD_AUDIT_TABLE_PATTERN = "pgTable('lead_audit_events'"
const LEAD_AUDIT_MIGRATION_PATTERN = 'CREATE TABLE "lead_audit_events"'

const auditEventsTableBlock = (schema: string): string => {
  const start = schema.indexOf(LEAD_AUDIT_TABLE_PATTERN)
  assert.ok(start >= 0, 'schema: bloco da tabela lead_audit_events nao identificado')
  const next = schema.indexOf('export const ', start + LEAD_AUDIT_TABLE_PATTERN.length)
  return next > start ? schema.slice(start, next) : schema.slice(start)
}

const auditEventsMigrationBlock = (migration: string): string => {
  const start = migration.indexOf(LEAD_AUDIT_MIGRATION_PATTERN)
  assert.ok(start >= 0, 'migracao 0020: bloco CREATE TABLE "lead_audit_events" nao identificado')
  const next = migration.indexOf('lead_audit_events_lead_created_idx', start)
  return next > start ? migration.slice(start, next) : migration.slice(start)
}

/** Texto do onDelete declarado no schema drizzle -> acao de delecao da FK. */
const onDeleteFromSchema = (raw: string | undefined): TestLeadFkDeleteAction => {
  switch ((raw ?? '').trim().toLowerCase()) {
    case 'cascade':
      return 'cascade'
    case 'set null':
      return 'set null'
    case 'restrict':
      return 'restrict'
    case 'no action':
      return 'no action'
    case 'set default':
      return 'set default'
    default:
      return 'unknown'
  }
}

/** Fatos da FK de auditoria derivados do schema REAL (nao de constante do teste). */
const deriveAuditFkFactsFromSchema = (): TestLeadFkFacts => {
  const block = auditEventsTableBlock(readSource('src/db/schema.ts'))
  const columnLine = block.split('\n').find((line) => line.includes("uuid('lead_id')"))
  assert.ok(
    columnLine !== undefined,
    "schema: coluna lead_audit_events.leadId (uuid('lead_id')) ausente na tabela lead_audit_events",
  )
  const line = columnLine as string
  return {
    childTable: TEST_LEAD_AUDIT_CHILD_TABLE,
    childColumn: TEST_LEAD_LEAD_COLUMN,
    childColumnNotNull: /\.notNull\(\)/.test(line),
    onDelete: onDeleteFromSchema(/onDelete:\s*'([^']+)'/.exec(line)?.[1]),
  }
}

test('schema: lead_audit_events.leadId e NOT NULL com ON DELETE cascade (auditoria append-only)', () => {
  const facts = deriveAuditFkFactsFromSchema()

  assert.equal(
    facts.childColumnNotNull,
    true,
    'schema: lead_audit_events.leadId deve ser NOT NULL (evento de auditoria nunca fica orfao nem destacado)',
  )
  assert.equal(
    facts.onDelete,
    'cascade',
    'schema: lead_audit_events.leadId deve declarar ON DELETE cascade',
  )
  // O catalogo do Postgres entrega confdeltype = 'c' para cascade: a leitura em
  // runtime (pg_constraint) precisa chegar exatamente nestes mesmos fatos.
  assert.equal(
    mapFkDeleteAction('c'),
    'cascade',
    "runtime: confdeltype 'c' do pg_constraint deve mapear para 'cascade'",
  )
})

test('schema: lead_audit_events nao e destacavel — sem onDelete set null em nenhuma linha da FK', () => {
  const block = auditEventsTableBlock(readSource('src/db/schema.ts'))
  assert.ok(
    !/set null/i.test(block),
    'schema: a FK de auditoria nao pode ser ON DELETE set null (evento nao pode ser retido destacado)',
  )
})

test('migracao 0020: lead_audit_events.lead_id e NOT NULL REFERENCES leads(id) ON DELETE cascade', () => {
  const migration = readSource('src/db/migrations/0020_leads_isolated.sql')

  assert.match(
    migration,
    /"lead_id"\s+uuid\s+NOT NULL\s+REFERENCES\s+"leads"\("id"\)\s+ON DELETE cascade/,
    'migracao 0020: a FK de auditoria deve ser NOT NULL + ON DELETE cascade (append-only)',
  )
  assert.ok(
    !/set null/i.test(auditEventsMigrationBlock(migration)),
    'migracao 0020: a FK de auditoria nao pode ser ON DELETE set null',
  )
})

test('contrato: a FK de auditoria real (NOT NULL + cascade) BLOQUEIA a purga automatica', () => {
  const facts = deriveAuditFkFactsFromSchema()

  const retention = planTestLeadAuditRetention(facts)
  assert.equal(
    retention.retainable,
    false,
    'auditoria append-only: nao existe forma de reter o evento destacado do lead purgado',
  )
  assert.equal(
    retention.reason,
    'fk-column-not-nullable',
    'a razao do bloqueio deve ser a coluna NOT NULL da FK de auditoria',
  )

  const plan = planTestLeadPurge({
    testRunId: 'run-contrato-1',
    lead: { id: 'lead-contrato-1', status: 'NEW', testRunId: 'run-contrato-1', convertedClientId: null },
    proposalCount: 0,
    documentCount: 0,
    externalReferenceCount: 0,
    auditEvents: { count: 1, retainableDetached: retention.retainable },
  })
  assert.equal(plan.allowed, false, 'lead com evento de auditoria nao pode ser purgado')
  assert.ok(
    plan.blockers.includes('audit-events-not-retainable'),
    'o plano deve classificar a auditoria nao-retentavel como bloqueio explicito',
  )

  const classification = classifyTestLeadReferences(
    {
      addressCount: 1,
      proposalCount: 0,
      documentCount: 0,
      serviceRequestCount: 0,
      auditEventCount: 1,
      externalAuditEventCount: 0,
      unclassifiedReferenceCount: 0,
    },
    retention,
  )
  assert.ok(
    classification.blockers.includes('audit-events-linked'),
    'a auditoria nao-retentavel deve entrar como referencia bloqueante',
  )
  assert.equal(
    classification.retainedAuditEventCount,
    0,
    'nenhum evento de auditoria pode ser retido ou apagado pela purga',
  )
  assert.equal(
    classification.addressDeleteAllowed,
    false,
    'com auditoria bloqueante nada e descartado, nem o endereco do dado de teste',
  )
})

test('contrato: o bloqueio e da auditoria — lead de teste sem evento de auditoria continua purgavel', () => {
  const retention = planTestLeadAuditRetention(deriveAuditFkFactsFromSchema())
  const plan = planTestLeadPurge({
    testRunId: 'run-contrato-1',
    lead: { id: 'lead-contrato-1', status: 'NEW', testRunId: 'run-contrato-1', convertedClientId: null },
    proposalCount: 0,
    documentCount: 0,
    externalReferenceCount: 0,
    auditEvents: { count: 0, retainableDetached: retention.retainable },
  })
  assert.equal(plan.allowed, true)
  assert.deepEqual(plan.blockers, [])
})

/* -------------------------------------------------------------------------- *
 * 2. Journal do drizzle + SQL da migracao
 * -------------------------------------------------------------------------- */

test('journal: 0021_test_lead_lifecycle permanece exatamente uma vez antes de migracoes posteriores', () => {
  const journal = JSON.parse(readSource('src/db/migrations/meta/_journal.json')) as {
    entries: Array<{ idx: number; tag: string }>
  }
  assert.ok(Array.isArray(journal.entries) && journal.entries.length > 0, 'journal: entries vazio')
  assert.equal(journal.entries[21]?.tag, '0021_test_lead_lifecycle', 'journal: 0021 deve permanecer na posicao historica')
  assert.equal(
    journal.entries.filter((entry) => entry.tag === '0021_test_lead_lifecycle').length,
    1,
    'journal: 0021_test_lead_lifecycle deve aparecer uma unica vez',
  )
})

test('migracao 0021 adiciona apenas coluna anulavel e indice em leads', () => {
  const migration = readSource('src/db/migrations/0021_test_lead_lifecycle.sql')
  assert.match(
    migration,
    /ALTER TABLE "leads" ADD COLUMN "test_run_id" uuid NULL/,
    'migracao 0021: deve adicionar a coluna anulavel "test_run_id"',
  )
  assert.match(
    migration,
    /CREATE INDEX "leads_test_run_id_idx"/,
    'migracao 0021: deve criar o indice "leads_test_run_id_idx"',
  )
})

/* -------------------------------------------------------------------------- *
 * 3. Rota interna de criacao de lead de teste
 * -------------------------------------------------------------------------- */

test('rota interna de criacao existe e exige settings.manage', () => {
  const route = resolveInternalRoute(
    'criacao de lead de teste',
    CANONICAL_INTERNAL_CREATION_ROUTE,
    CREATION_ROUTE_CONTRACT,
    isCollectionRoute,
  )
  assert.match(
    route.source,
    /requireLocalPermission\(\s*'settings\.manage'\s*\)/,
    `${route.relativePath}: criar dado de teste deve exigir a permissao settings.manage`,
  )
})

test('rota interna de criacao gera o UUID do lead no servidor e marca o testRunId', () => {
  const route = resolveInternalRoute(
    'criacao de lead de teste',
    CANONICAL_INTERNAL_CREATION_ROUTE,
    CREATION_ROUTE_CONTRACT,
    isCollectionRoute,
  )
  assert.match(
    route.source,
    /randomUUID\(\)/,
    `${route.relativePath}: o identificador do lead deve ser gerado no servidor (randomUUID())`,
  )
  assert.ok(
    /testRunId|test_run_id/.test(route.source),
    `${route.relativePath}: a rota deve marcar o lead criado com o testRunId da sessao`,
  )
  assert.ok(
    !/body\s*[?.]+\s*id\b/.test(route.source),
    `${route.relativePath}: a rota nao pode aceitar id de lead vindo do corpo (o UUID e do servidor)`,
  )
})

/* -------------------------------------------------------------------------- *
 * 4. Rota interna de item (purga controlada)
 *
 * Sob a FK real de auditoria (NOT NULL + ON DELETE cascade) a rota precisa contar
 * os eventos do lead, decidir a retencao (impossivel destacar) e BLOQUEAR todo
 * lead com evento de auditoria. Auditoria e append-only: nunca e deletada nem
 * reescrita, nem por cascade tolerado.
 * -------------------------------------------------------------------------- */

test('rota interna de item existe e exige settings.manage', () => {
  const route = resolveInternalRoute(
    'purga de lead de teste',
    CANONICAL_INTERNAL_ITEM_ROUTE,
    ITEM_ROUTE_CONTRACT,
    () => true,
  )
  assert.match(
    route.source,
    /requireLocalPermission\(\s*'settings\.manage'\s*\)/,
    `${route.relativePath}: a purga de dado de teste deve exigir a permissao settings.manage`,
  )
})

test('rota interna de item trava o lead com FOR UPDATE antes de decidir a purga', () => {
  const route = resolveInternalRoute(
    'purga de lead de teste',
    CANONICAL_INTERNAL_ITEM_ROUTE,
    ITEM_ROUTE_CONTRACT,
    () => true,
  )
  assert.match(
    route.source,
    /from leads where id = [^\n]*for update/i,
    `${route.relativePath}: deve reler e travar o lead com LOCK FOR UPDATE`,
  )
  assert.ok(
    route.source.search(/for update/i) < route.source.indexOf('planTestLeadPurge('),
    `${route.relativePath}: o LOCK FOR UPDATE deve acontecer antes da decisao de purga`,
  )
})

test('rota interna de item conta propostas, documentos, referencias externas e eventos de auditoria', () => {
  const route = resolveInternalRoute(
    'purga de lead de teste',
    CANONICAL_INTERNAL_ITEM_ROUTE,
    ITEM_ROUTE_CONTRACT,
    () => true,
  )
  for (const counter of ['proposalCount', 'documentCount', 'externalReferenceCount', 'auditEventCount']) {
    assert.ok(
      route.source.includes(counter),
      `${route.relativePath}: deve contar ${counter} para alimentar planTestLeadPurge`,
    )
  }
  assert.ok(
    /leadAuditEvents|lead_audit_events/.test(route.source),
    `${route.relativePath}: deve ler a tabela de auditoria do lead (lead_audit_events) para contar os eventos`,
  )
})

test('rota interna de item bloqueia lead com eventos de auditoria e nunca deleta auditoria', () => {
  const route = resolveInternalRoute(
    'purga de lead de teste',
    CANONICAL_INTERNAL_ITEM_ROUTE,
    ITEM_ROUTE_CONTRACT,
    () => true,
  )
  const source = route.source

  assert.match(
    source,
    /planTestLeadAuditRetention\(/,
    `${route.relativePath}: deve decidir a retencao da auditoria com planTestLeadAuditRetention()`,
  )
  assert.ok(
    /retainable|auditEvents|auditEventCount/.test(source),
    `${route.relativePath}: deve alimentar planTestLeadPurge com o fato de retencao dos eventos de auditoria`,
  )

  // Auditoria e append-only: nenhum caminho da rota pode apagar ou reescrever evento.
  assert.ok(
    !/delete\(\s*leadAuditEvents\s*\)/.test(source),
    `${route.relativePath}: a purga NUNCA pode deletar eventos de auditoria`,
  )
  assert.ok(
    !/delete\s+from\s+"?lead_audit_events"?/i.test(source),
    `${route.relativePath}: a purga NUNCA pode emitir DELETE FROM lead_audit_events`,
  )
  assert.ok(
    !/update\(\s*leadAuditEvents\s*\)/.test(source),
    `${route.relativePath}: auditoria e append-only; a purga nao pode reescrever eventos`,
  )

  const deletion = source.indexOf('delete(leads)')
  const auditCount = source.indexOf('auditEventCount')
  const retention = source.indexOf('planTestLeadAuditRetention(')
  assert.ok(
    auditCount >= 0 && retention >= 0 && deletion >= 0,
    `${route.relativePath}: contagem de auditoria, decisao de retencao e DELETE de leads devem existir`,
  )
  assert.ok(
    auditCount < deletion && retention < deletion,
    `${route.relativePath}: contar e decidir a auditoria deve preceder o DELETE do lead`,
  )
})

test('rota interna de item chama planTestLeadPurge e deleta o lead dentro da transacao', () => {
  const route = resolveInternalRoute(
    'purga de lead de teste',
    CANONICAL_INTERNAL_ITEM_ROUTE,
    ITEM_ROUTE_CONTRACT,
    () => true,
  )
  const source = route.source

  assert.match(source, /planTestLeadPurge\(/, `${route.relativePath}: deve chamar planTestLeadPurge`)
  assert.match(source, /delete\(leads\)/, `${route.relativePath}: deve deletar o lead purgado`)

  const transaction = source.indexOf('db.transaction(')
  const counts = source.indexOf('proposalCount')
  const purge = source.indexOf('planTestLeadPurge(')
  const lock = source.search(/for update/i)
  const deletion = source.indexOf('delete(leads)')

  assert.ok(transaction >= 0, `${route.relativePath}: a purga deve rodar em db.transaction(...)`)
  assert.ok(
    transaction < counts && transaction < purge && transaction < deletion,
    `${route.relativePath}: contagem, decisao e DELETE devem ocorrer dentro da transacao`,
  )
  assert.ok(lock >= 0 && lock < deletion, `${route.relativePath}: o LOCK FOR UPDATE deve preceder o DELETE`)
  assert.ok(
    purge < deletion,
    `${route.relativePath}: planTestLeadPurge deve ser chamado antes de deletar o lead`,
  )

  // O DELETE do lead so pode acontecer DEPOIS de o plano autorizar: um lead com
  // evento de auditoria nunca e deletado, nem de passagem.
  const gate = /plan\.allowed|plan\.blockers/.exec(source)
  assert.ok(
    gate !== null,
    `${route.relativePath}: a purga deve ser decidida pelo plano (plan.allowed / plan.blockers)`,
  )
  assert.ok(
    source.indexOf((gate as RegExpExecArray)[0]) < deletion,
    `${route.relativePath}: o DELETE do lead so pode ocorrer depois de o plano autorizar (plan.allowed / plan.blockers)`,
  )
})

/* -------------------------------------------------------------------------- *
 * 5. Porta comercial normal nao cria nem le marcador de teste
 * -------------------------------------------------------------------------- */

test('POST /api/leads nao le body.testRunId nem grava marcador de teste', () => {
  const source = readSource('src/app/api/leads/route.ts')

  assert.match(source, /export async function POST\(/, 'POST /api/leads: handler de criacao ausente')
  assert.ok(
    !/testRunId/.test(source),
    'POST /api/leads: a porta comercial normal nao pode referenciar body.testRunId (dado de teste so entra pela rota interna)',
  )
  assert.ok(
    !/test_run_id/.test(source),
    'POST /api/leads: a porta comercial normal nao pode escrever o marcador test_run_id',
  )
})

/* -------------------------------------------------------------------------- *
 * 6. Guarda de operacao comercial sobre dado de teste
 * -------------------------------------------------------------------------- */

const assertGuardWithTestRunId = (relativePath: string, label: string): void => {
  const source = readSource(relativePath)
  const guard = source.indexOf('assertLeadNotTestData(')
  assert.ok(guard >= 0, `${label}: deve chamar assertLeadNotTestData(...)`)
  assert.ok(
    source.slice(guard, guard + 220).includes('testRunId'),
    `${label}: assertLeadNotTestData deve receber o testRunId do lead`,
  )
  assert.ok(source.includes('lead.testRunId'), `${label}: deve ler lead.testRunId do registro travado`)
}

test('rota de criacao de proposta inclui assertLeadNotTestData e testRunId', () => {
  assertGuardWithTestRunId('src/app/api/leads/[id]/proposals/route.ts', 'POST /api/leads/[id]/proposals')
})

test('modulo de conversao de lead inclui assertLeadNotTestData e testRunId', () => {
  assertGuardWithTestRunId('src/lib/lead-conversion.ts', 'lead-conversion')
})

test('rota de proposta barra lead de teste antes de inserir proposta ou mover o lead', () => {
  const source = readSource('src/app/api/leads/[id]/proposals/route.ts')
  const guard = source.indexOf('assertLeadNotTestData(')
  const insert = source.indexOf('tx.insert(leadProposals)')
  const move = source.indexOf('tx.update(leads)')

  assert.ok(guard >= 0, 'proposta: guard de dado de teste ausente')
  assert.ok(insert >= 0, 'proposta: insercao de proposta nao encontrada')
  assert.ok(move >= 0, 'proposta: movimentacao de status do lead nao encontrada')
  assert.ok(guard < insert, 'proposta: o guard deve rodar antes de inserir a proposta')
  assert.ok(guard < move, 'proposta: o guard deve rodar antes de mover o lead')
})
