/**
 * Contratos de origem (source contract) da DESCOBERTA DE CATALOGO de FKs do
 * ciclo de vida de dado de teste de Lead — etapa RED.
 *
 * Este arquivo NAO toca banco de dados: ele le os arquivos-fonte reais do
 * repositorio (a rota interna de purga e o modulo puro de planejamento) e afirma
 * o contrato que a rota precisa cumprir para descobrir TODAS as FKs que
 * referenciam as tabelas pai do modulo comercial, em vez de adivinhar um
 * conjunto fixo de tabelas filhas.
 *
 * Contrato coberto (a implementar na rota — hoje AUSENTE, por isso RED):
 *
 *   1. Descoberta pelo PAI referenciado, nunca por filho fixo.
 *      A consulta de catalogo usa `pg_constraint` e filtra pelo alvo da FK:
 *         c.confrelid = to_regclass(<tabela pai>)
 *      Ela NUNCA pode fixar a tabela filha (`conrelid = to_regclass(...)`):
 *      fixar a filha e exatamente o que deixa uma FK nova passar despercebida.
 *
 *   2. A descoberta resolve o NOME da tabela filha (conrelid::regclass /
 *      pg_class.relname) e a COLUNA filha (pg_attribute.attname) para poder
 *      classificar cada relacao descoberta.
 *
 *   3. A descoberta cobre TODAS as tabelas pai do modulo comercial:
 *      `leads` e `lead_addresses`. O modulo puro precisa nomear o segundo pai
 *      (TEST_LEAD_ADDRESS_PARENT_TABLE) e a lista fechada de pais
 *      (TEST_LEAD_REFERENCED_PARENT_TABLES); a rota precisa usar essa lista.
 *
 *   4. Classificacao DETERMINISTICA contra uma allowlist fechada: apenas
 *      `lead_addresses` (unica tabela descartavel) e as tabelas filhas
 *      conhecidas do lead. A rota precisa consultar essa allowlist
 *      (TEST_LEAD_KNOWN_CHILD_TABLES / isKnownLeadReferenceTable / isLeadAddresses).
 *
 *   5. Filha DESCONHECIDA (fora da allowlist) e CONTADA e BLOQUEIA. O contador
 *      `unclassifiedReferenceCount` NUNCA pode ser hardcoded em 0: ele precisa
 *      vir da classificacao das relacoes descobertas no catalogo.
 *
 *   6. Casamento EXATO da coluna da FK: só é relacao de filha do lead quando
 *      childColumn === 'lead_id' (igualdade exata — nunca includes/startsWith).
 *
 * Enquanto a rota nao implementar a descoberta de catalogo, estes testes falham
 * (RED). Eles NAO devem ser "consertados" enfraquecendo a assercao.
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import {
  TEST_LEAD_DISPOSABLE_CHILD_TABLE,
  TEST_LEAD_KNOWN_CHILD_TABLES,
  TEST_LEAD_LEAD_COLUMN,
  TEST_LEAD_PARENT_TABLE,
} from '../test-lead-lifecycle'

const repoRoot = process.cwd()
const readSource = (relativePath: string): string => readFileSync(path.join(repoRoot, relativePath), 'utf8')

const ROUTE = 'src/app/api/internal/test-leads/[id]/route.ts'
const MODULE = 'src/lib/test-lead-lifecycle.ts'

const routeSource = (): string => readSource(ROUTE)
const moduleSource = (): string => readSource(MODULE)

/* -------------------------------------------------------------------------- *
 * 1. Descoberta pelo PAI referenciado (confrelid), nunca por filho fixo
 * -------------------------------------------------------------------------- */

test('catalogo: a descoberta de FK usa pg_constraint filtrando pelo PAI (confrelid = to_regclass)', () => {
  const route = routeSource()

  assert.match(
    route,
    /pg_constraint/,
    `${ROUTE}: a purga deve descobrir as relacoes no catalogo do Postgres (pg_constraint)`,
  )
  assert.match(
    route,
    /confrelid\s*=\s*to_regclass\(/,
    `${ROUTE}: a descoberta deve fixar o ALVO da FK (confrelid = to_regclass(<tabela pai>))`,
  )
})

test('catalogo: a descoberta NUNCA fixa a tabela filha (conrelid = to_regclass)', () => {
  const route = routeSource()

  // Uma consulta por tabela filha fixa e o defeito: toda FK nova que referencie
  // o lead passa despercebida. A descoberta tem de ser dirigida pelo PAI.
  assert.ok(
    !/conrelid\s*=\s*to_regclass\(/.test(route),
    `${ROUTE}: a descoberta de catalogo nao pode fixar a tabela FILHA ` +
      '(conrelid = to_regclass(...)); ela deve fixar o PAI (confrelid) e classificar as filhas descobertas',
  )
})

/* -------------------------------------------------------------------------- *
 * 2. A descoberta resolve o nome da tabela filha e a coluna filha
 * -------------------------------------------------------------------------- */

test('catalogo: a descoberta resolve o NOME da tabela filha para classificar cada relacao', () => {
  const route = routeSource()

  const resolvesChildName =
    /conrelid\s*::\s*regclass/.test(route) ||
    (/pg_class/.test(route) && /relname/.test(route))

  assert.ok(
    resolvesChildName,
    `${ROUTE}: a descoberta deve resolver o NOME da tabela filha ` +
      '(conrelid::regclass ou pg_class.relname) para classificar cada relacao contra a allowlist',
  )
  assert.match(
    route,
    /attname/,
    `${ROUTE}: a descoberta deve ler a COLUNA filha (pg_attribute.attname) para aplicar o casamento exato`,
  )
})

/* -------------------------------------------------------------------------- *
 * 3. Todas as tabelas pai: leads E lead_addresses
 * -------------------------------------------------------------------------- */

test('catalogo: o modulo nomeia o segundo pai (lead_addresses) e a lista fechada de pais', () => {
  const module = moduleSource()

  assert.equal(
    TEST_LEAD_PARENT_TABLE,
    'leads',
    'modulo: TEST_LEAD_PARENT_TABLE deve continuar sendo o pai comercial `leads`',
  )
  assert.match(
    module,
    /export const TEST_LEAD_ADDRESS_PARENT_TABLE\s*=\s*'lead_addresses'/,
    `${MODULE}: deve exportar TEST_LEAD_ADDRESS_PARENT_TABLE = 'lead_addresses' ` +
      '(segundo pai cujas FKs tambem precisam ser descobertas)',
  )
  assert.match(
    module,
    /export const TEST_LEAD_REFERENCED_PARENT_TABLES\s*=\s*\[[^\]]*TEST_LEAD_PARENT_TABLE[^\]]*TEST_LEAD_ADDRESS_PARENT_TABLE[^\]]*\]/,
    `${MODULE}: deve exportar TEST_LEAD_REFERENCED_PARENT_TABLES listando os dois pais (leads + lead_addresses)`,
  )
})

test('catalogo: a rota descobre FKs para TODAS as tabelas pai a partir da lista fechada', () => {
  const route = routeSource()

  assert.match(
    route,
    /TEST_LEAD_REFERENCED_PARENT_TABLES/,
    `${ROUTE}: a descoberta deve iterar a lista fechada de pais ` +
      '(TEST_LEAD_REFERENCED_PARENT_TABLES), nao fixar um unico pai',
  )
  assert.match(
    route,
    /lead_addresses|TEST_LEAD_ADDRESS_PARENT_TABLE/,
    `${ROUTE}: a descoberta precisa cobrir tambem as FKs que referenciam o segundo pai (lead_addresses)`,
  )
})

/* -------------------------------------------------------------------------- *
 * 4. Allowlist deterministica e fechada de classificacao
 * -------------------------------------------------------------------------- */

test('catalogo: a allowlist de classificacao contem apenas lead_addresses e as filhas conhecidas', () => {
  assert.deepEqual(
    [...TEST_LEAD_KNOWN_CHILD_TABLES].sort(),
    ['lead_addresses', 'lead_audit_events', 'lead_documents', 'lead_proposals', 'lead_service_requests', 'official_documents'].sort(),
    'modulo: TEST_LEAD_KNOWN_CHILD_TABLES deve ser exatamente a allowlist fechada conhecida',
  )
  assert.equal(
    TEST_LEAD_DISPOSABLE_CHILD_TABLE,
    'lead_addresses',
    'modulo: lead_addresses deve ser a unica tabela filha descartavel (allowlist de DELETE)',
  )
})

test('catalogo: a rota classifica cada relacao descoberta contra a allowlist deterministica', () => {
  const route = routeSource()

  const usesAllowlist =
    /TEST_LEAD_KNOWN_CHILD_TABLES/.test(route) ||
    /isKnownLeadReferenceTable\s*\(/.test(route) ||
    /isLeadAddresses\s*\(/.test(route)

  assert.ok(
    usesAllowlist,
    `${ROUTE}: a rota deve classificar as relacoes do catalogo contra a allowlist ` +
      '(TEST_LEAD_KNOWN_CHILD_TABLES / isKnownLeadReferenceTable / isLeadAddresses) — nada de palpite',
  )
})

/* -------------------------------------------------------------------------- *
 * 5. Filha desconhecida e contada e bloqueia; nada de hardcode em 0
 * -------------------------------------------------------------------------- */

test('catalogo: unclassifiedReferenceCount NUNCA e hardcoded em 0', () => {
  const route = routeSource()

  const assigned = /unclassifiedReferenceCount\s*:\s*([^,\n]+)/.exec(route)
  assert.ok(
    assigned !== null,
    `${ROUTE}: a rota deve alimentar referenceSnapshot.unclassifiedReferenceCount`,
  )
  const value = assigned[1].trim()

  assert.ok(
    !/^0\b/.test(value),
    `${ROUTE}: unclassifiedReferenceCount nao pode ser fixado em 0 — ` +
      `ele deve vir da classificacao das relacoes descobertas no catalogo (valor atual: ${value})`,
  )
  assert.match(
    value,
    /\.length|classif|unknown|unclassified/i,
    `${ROUTE}: unclassifiedReferenceCount deve derivar da classificacao do catalogo ` +
      `(contagem de relacoes fora da allowlist), nao de um literal`,
  )
})

test('catalogo: filha desconhecida (fora da allowlist) e contada e bloqueia a purga', () => {
  const route = routeSource()

  assert.match(
    route,
    /unclassifiedReferenceCount/,
    `${ROUTE}: a filha desconhecida deve entrar no snapshot como unclassifiedReferenceCount`,
  )
  // A classificacao pura ja converte >0 em bloqueio; a rota precisa apenas
  // entregar o valor contado e decidir pelo plano/classificacao.
  assert.match(
    route,
    /classifyTestLeadReferences\s*\(/,
    `${ROUTE}: a contagem de referencias deve passar por classifyTestLeadReferences()`,
  )
  assert.match(
    route,
    /plan\.allowed|classification\.blockers/,
    `${ROUTE}: a purga so pode prosseguir quando a classificacao (com a filha desconhecida) nao bloquear`,
  )
})

/* -------------------------------------------------------------------------- *
 * 6. Casamento EXATO da coluna da FK (childColumn === 'lead_id')
 * -------------------------------------------------------------------------- */

test('contrato: o casamento da coluna da FK e por igualdade EXATA (childColumn === lead_id)', () => {
  const module = moduleSource()
  const route = routeSource()

  assert.equal(TEST_LEAD_LEAD_COLUMN, 'lead_id', 'modulo: a coluna filha canonica e `lead_id`')
  assert.match(
    module,
    /childColumn\s*===\s*TEST_LEAD_LEAD_COLUMN/,
    `${MODULE}: a relacao de filha do lead exige igualdade exata (childColumn === TEST_LEAD_LEAD_COLUMN)`,
  )
  assert.ok(
    !/childColumn\s*\.(?:includes|startsWith|endsWith|indexOf)\(/.test(module + route),
    'nenhum caminho pode casar a coluna da FK por substring/prefixo; exige igualdade exata com lead_id',
  )
})

test('contrato: a rota aplica o casamento EXATO da coluna ao classificar o catalogo', () => {
  const route = routeSource()

  assert.match(
    route,
    /(?:childColumn|attname)\s*===\s*(?:TEST_LEAD_LEAD_COLUMN|'lead_id')/,
    `${ROUTE}: ao classificar as relacoes do catalogo, a coluna da FK deve casar exatamente ` +
      '(childColumn === TEST_LEAD_LEAD_COLUMN / lead_id)',
  )
})
