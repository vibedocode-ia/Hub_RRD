/**
 * Testes focados da identidade sintética de Lead de teste + contrato da rota
 * interna POST/GET /api/internal/test-leads.
 *
 * Sem banco de dados: o modulo testado eh puro e o contrato da rota eh lido do
 * proprio arquivo-fonte.
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import {
  buildReservedTestPhone,
  buildSyntheticTestLeadAddress,
  buildSyntheticTestLeadIdentity,
  buildSyntheticTestLeadName,
  findUntrustedTestLeadFields,
  isUuidLike,
  sanitizeTestLeadListItem,
  shortTestRunId,
  TEST_LEAD_NAME_PREFIX,
  TEST_LEAD_SOURCE_CHANNEL,
  TEST_LEAD_STATUS,
} from '../test-lead-identity'

const RUN_ID = '2f1c9a44-9f0b-4d1e-8a77-6b0e2c4d5e6f'

const readRouteSource = (): string =>
  readFileSync(path.join(process.cwd(), 'src/app/api/internal/test-leads/route.ts'), 'utf8')

/* -------------------------------------------------------------------------- *
 * Nome sintético
 * -------------------------------------------------------------------------- */

test('nome do Lead de teste usa o prefixo TESTE E2E com o run id curto', () => {
  const name = buildSyntheticTestLeadName(RUN_ID)
  assert.equal(name, `${TEST_LEAD_NAME_PREFIX} ${shortTestRunId(RUN_ID)}`)
  assert.match(name, /^TESTE E2E [0-9A-Z]{1,8}$/)
})

test('shortTestRunId limita a 8 caracteres, normaliza e nunca fica vazio', () => {
  assert.equal(shortTestRunId(RUN_ID), '2F1C9A44')
  assert.equal(shortTestRunId(''), 'SEMID')
  assert.equal(shortTestRunId('   '), 'SEMID')
})

/* -------------------------------------------------------------------------- *
 * Telefone reservado-sintético
 * -------------------------------------------------------------------------- */

test('telefone sintético não contém nenhum dígito discável', () => {
  const phone = buildReservedTestPhone()
  assert.match(phone, /^TEST:[a-p]{32}$/)
  assert.equal(phone.replace(/\D/g, ''), '')
})

test('telefone sintético preserva todos os bits do UUID em namespace alfabético', () => {
  const uuid = '00000000-0000-4000-8000-123456789012'
  assert.equal(buildReservedTestPhone(uuid), 'TEST:aaaaaaaaaaaaeaaaiaaabcdefghijabc')
})

test('UUID sem dígitos continua único no namespace não discável', () => {
  const phone = buildReservedTestPhone('abcdefab-cdef-abcd-efab-cdefabcdefab')
  assert.match(phone, /^TEST:[a-p]{32}$/)
})

test('telefones sintéticos de UUIDs diferentes praticamente nunca colidem', () => {
  const phones = new Set(Array.from({ length: 200 }, () => buildReservedTestPhone()))
  assert.ok(phones.size >= 199, `esperado quase nenhuma colisao, obtido ${phones.size}/200 unicos`)
})

/* -------------------------------------------------------------------------- *
 * Identidade completa (sem PII)
 * -------------------------------------------------------------------------- */

test('identidade sintética expõe apenas nome, telefone e metadados de isolamento', () => {
  const identity = buildSyntheticTestLeadIdentity(RUN_ID, RUN_ID)
  assert.deepEqual(Object.keys(identity).sort(), [
    'name',
    'normalizedPhone',
    'phone',
    'sourceChannel',
    'status',
  ])
  assert.equal(identity.normalizedPhone, identity.phone)
  assert.equal(identity.sourceChannel, TEST_LEAD_SOURCE_CHANNEL)
  assert.equal(identity.status, TEST_LEAD_STATUS)
  assert.equal('document' in identity, false)
  assert.equal('email' in identity, false)
})

test('endereço sintético usa rótulos explicitamente fictícios', () => {
  const address = buildSyntheticTestLeadAddress()
  assert.equal(address.complement, null)
  for (const value of Object.values(address)) {
    if (value === null) continue
    assert.equal(typeof value, 'string')
    assert.ok(value.length > 0)
  }
  assert.match(address.street, /fict|sint/i)
  assert.match(String(address.city), /teste/i)
})

/* -------------------------------------------------------------------------- *
 * Corpo da requisição nunca é fonte de identidade
 * -------------------------------------------------------------------------- */

test('findUntrustedTestLeadFields detecta campos de identidade/PII em camelCase e snake_case', () => {
  const found = findUntrustedTestLeadFields({
    testRunId: RUN_ID,
    phone: '21999999999',
    normalized_phone: '21999999999',
    document: '12345678909',
    normalizedDocument: '12345678909',
    name: 'Fulano Real',
    id: 'algum-id',
  })
  assert.deepEqual(found, [
    'document',
    'id',
    'name',
    'normalizedDocument',
    'normalized_phone',
    'phone',
    'testRunId',
  ])
})

test('findUntrustedTestLeadFields libera corpo vazio, nulo ou sem campos de identidade', () => {
  assert.deepEqual(findUntrustedTestLeadFields({}), [])
  assert.deepEqual(findUntrustedTestLeadFields(null), [])
  assert.deepEqual(findUntrustedTestLeadFields(undefined), [])
  assert.deepEqual(findUntrustedTestLeadFields({ label: 'execucao 1', dryRun: true }), [])
  assert.deepEqual(findUntrustedTestLeadFields([]), [])
})

/* -------------------------------------------------------------------------- *
 * Projeção sanitizada do GET
 * -------------------------------------------------------------------------- */

test('sanitizeTestLeadListItem descarta tudo menos id, runId, status e createdAt', () => {
  const createdAt = new Date('2026-10-13T12:00:00.000Z')
  const row = {
    id: 'lead-1',
    testRunId: RUN_ID,
    status: 'NEW',
    createdAt,
    name: 'TESTE E2E 2F1C9A44',
    phone: '91234567890',
    document: null,
  }
  const item = sanitizeTestLeadListItem(row)
  assert.deepEqual(Object.keys(item).sort(), ['createdAt', 'id', 'runId', 'status'])
  assert.equal(item.createdAt, '2026-10-13T12:00:00.000Z')
  assert.equal(JSON.stringify(item).includes('91234567890'), false)
})

test('sanitizeTestLeadListItem zera runId vazio', () => {
  const item = sanitizeTestLeadListItem({ id: 'lead-1', testRunId: '', status: 'NEW', createdAt: 'x' })
  assert.equal(item.runId, null)
})

test('isUuidLike aceita apenas uuid e rejeita o resto', () => {
  assert.equal(isUuidLike(RUN_ID), true)
  assert.equal(isUuidLike('run-2026-10-13-001'), false)
  assert.equal(isUuidLike(null), false)
})

/* -------------------------------------------------------------------------- *
 * Contrato da rota (leitura do fonte, sem banco)
 * -------------------------------------------------------------------------- */

test('rota interna de criação de Lead de teste existe no caminho canônico', () => {
  assert.match(readRouteSource(), /export async function POST\(/)
})

test('rota nunca lê telefone, documento, nome ou testRunId do corpo', () => {
  const source = readRouteSource()
  const identityRead =
    /(payload|body)\s*(?:\?\.|\.)\s*(?:phone|normalizedPhone|normalized_phone|document|normalizedDocument|normalized_document|name|testRunId|test_run_id|id)\b/
  assert.equal(identityRead.test(source), false, 'a rota não pode ler identidade do corpo da requisição')
  assert.match(source, /findUntrustedTestLeadFields\(payload\)/, 'a rota deve rejeitar campos de identidade enviados no corpo')
})

test('rota grava lead + endereço + auditoria genérica na mesma transação e responde só runId+leadId', () => {
  const source = readRouteSource()
  const transaction = source.indexOf('db.transaction(')
  const leadInsert = source.indexOf('tx.insert(leads)')
  const addressInsert = source.indexOf('tx.insert(leadAddresses)')
  const auditInsert = source.indexOf('tx.insert(auditEvents)')
  const response = source.indexOf('{ success: true, runId, leadId }')

  assert.ok(transaction >= 0, 'a criação deve rodar em db.transaction(...)')
  assert.ok(leadInsert > transaction && addressInsert > transaction && auditInsert > transaction, 'inserções dentro da transação')
  assert.ok(leadInsert < addressInsert && addressInsert < auditInsert, 'ordem: lead, endereço, auditoria')
  assert.ok(response > auditInsert, 'a resposta só deve sair depois da transação')
})

test('auditoria de teste usa o audit_events genérico e nunca a trilha append-only lead_audit_events', () => {
  const source = readRouteSource()

  assert.equal(
    /insert\(\s*leadAuditEvents\s*\)/.test(source),
    false,
    'a rota de teste não pode inserir em lead_audit_events (auditoria de Lead append-only)',
  )
  assert.equal(
    /\bleadAuditEvents\b/.test(source),
    false,
    'a rota de teste não deve nem referenciar lead_audit_events — o evento sintético vive em audit_events',
  )
  assert.match(
    source,
    /insert\(\s*auditEvents\s*\)/,
    'a rota deve inserir o evento de teste na trilha genérica audit_events',
  )
  assert.match(
    source,
    /action:\s*'lead\.test_created'/,
    'o evento genérico deve registrar a ação lead.test_created',
  )
})

test('evento genérico não aponta para o lead (sem FK) e carrega só IDs/flags sintéticos, com runId recuperável', () => {
  const source = readRouteSource()
  const auditInsert = source.indexOf('tx.insert(auditEvents)')
  const response = source.indexOf('{ success: true, runId, leadId }')
  assert.ok(auditInsert >= 0 && response > auditInsert, 'bloco do evento genérico não identificado')

  const valueBlock = source.slice(auditInsert, source.indexOf('metadata:', auditInsert))
  const metadataBlock = source.slice(source.indexOf('metadata:', auditInsert), response)

  // audit_events não tem FK para leads: o evento não é arrastado por cascade na purga.
  assert.equal(/\bleadId\b/.test(valueBlock), false, 'audit_events não tem lead_id; o evento genérico não pode referenciar a FK do lead')
  assert.match(valueBlock, /targetId:\s*null/, 'targetId é anulável: o evento de teste não aponta para o lead')
  assert.match(valueBlock, /targetType:\s*'lead'/, 'o evento genérico deve declarar o domínio (targetType lead)')

  // runId recuperável a partir da trilha genérica, sem PII.
  assert.match(metadataBlock, /testRunId:\s*runId/, 'o metadata deve levar o testRunId (runId recuperável do audit_events)')
  assert.match(metadataBlock, /synthetic:\s*true/, 'o metadata deve marcar synthetic: true')
  assert.match(metadataBlock, /sourceChannel:\s*identity\.sourceChannel/, 'o metadata deve levar o sourceChannel')
  assert.equal(
    /(phone|normalizedPhone|normalized_phone|document|normalizedDocument|normalized_document|email|name|address)/.test(metadataBlock),
    false,
    'o metadata do evento não pode carregar PII (só IDs/flags sintéticos)',
  )
})

test('GET devolve apenas id, runId, status e createdAt de leads de sessão de teste', () => {
  const source = readRouteSource()
  assert.match(source, /isNotNull\(leads\.testRunId\)/, 'o GET deve listar apenas leads com test_run_id preenchido')
  assert.match(source, /sanitizeTestLeadListItem\)/, 'o GET deve projetar os campos via sanitizeTestLeadListItem')
  assert.equal(/leads\.phone|leads\.document|leads\.email/.test(source), false, 'o GET não pode expor telefone, documento ou e-mail')
})

test('rotas internas exigem settings.manage e checam banco indisponível', () => {
  const source = readRouteSource()
  const guards = source.match(/requireLocalPermission\('settings\.manage'\)/g) ?? []
  assert.equal(guards.length, 2, 'POST e GET devem exigir settings.manage')
  assert.equal((source.match(/if \(!db\)/g) ?? []).length, 2, 'POST e GET devem tratar banco indisponível')
})
