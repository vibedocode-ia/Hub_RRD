/**
 * Identidade sintética de Lead de teste (modulo puro, sem I/O de banco).
 *
 * Este modulo existe para que a criacao de dado de teste (rota interna
 * POST /api/internal/test-leads) nunca dependa do corpo da requisicao: nome,
 * telefone, documento, endereco, status e canal sao derivados aqui, no
 * servidor, a partir de um testRunId gerado por randomUUID().
 *
 * Garantias:
 *   - o nome sempre comeca com "TESTE E2E " e traz um pedaco curto do run id;
 *   - telefone no namespace TEST: + 32 letras a-p (UUID completo), sem
 *     qualquer dígito discável, nunca vindo de dado real de pessoa;
 *   - documento e sempre nulo (quem decide isso e a rota);
 *   - campos de identidade/PII enviados no corpo sao detectados e rejeitados.
 */

import { randomUUID } from 'crypto'

export const TEST_LEAD_NAME_PREFIX = 'TESTE E2E'
export const TEST_LEAD_SOURCE_CHANNEL = 'INTERNAL_TEST'
export const TEST_LEAD_STATUS = 'NEW'
export const TEST_LEAD_NOTE =
  'Registro sintético de teste E2E — não corresponde a pessoa real. Pode ser purgado pela sessão de teste.'
export const TEST_LEAD_SHORT_RUN_ID_LENGTH = 8

/** Campos que NUNCA podem vir do corpo: o servidor os gera. */
export const TEST_LEAD_UNTRUSTED_BODY_FIELDS = [
  'id',
  'leadId',
  'lead_id',
  'testRunId',
  'test_run_id',
  'name',
  'phone',
  'normalizedPhone',
  'normalized_phone',
  'document',
  'normalizedDocument',
  'normalized_document',
  'email',
  'address',
  'status',
  'sourceChannel',
  'source_channel',
  'convertedClientId',
  'converted_client_id',
] as const

const normalizeFieldName = (value: string): string => value.trim().toLowerCase().replace(/[^a-z0-9]/g, '')

const UNTRUSTED_FIELD_SET: ReadonlySet<string> = new Set(
  TEST_LEAD_UNTRUSTED_BODY_FIELDS.map(normalizeFieldName),
)

export type SyntheticTestLeadIdentity = {
  name: string
  phone: string
  normalizedPhone: string
  sourceChannel: string
  status: string
}

export type SyntheticTestLeadAddress = {
  street: string
  number: string
  complement: null
  neighborhood: string
  city: string
  state: string
  zipCode: string
  referencePoint: string
  propertyType: string
}

export type TestLeadListItem = {
  id: string
  runId: string | null
  status: string
  createdAt: string
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isUuidLike(value: unknown): boolean {
  return typeof value === 'string' && UUID_PATTERN.test(value)
}

/** Pedaco curto e legivel do testRunId, usado no nome sintético. */
export function shortTestRunId(runId: string): string {
  const cleaned = typeof runId === 'string' ? runId.replace(/[^0-9a-zA-Z]/g, '') : ''
  const short = cleaned.slice(0, TEST_LEAD_SHORT_RUN_ID_LENGTH)
  return (short || 'SEMID').toUpperCase()
}

export function buildSyntheticTestLeadName(runId: string): string {
  return `${TEST_LEAD_NAME_PREFIX} ${shortTestRunId(runId)}`
}

/**
 * Identidade não discável: prefixo TEST: + UUID codificado em letras a-p.
 * Mesmo um normalizador que remova caracteres não numéricos obtém vazio.
 */
export function buildReservedTestPhone(uuid: string = randomUUID()): string {
  // Alphabetic encoding keeps even digits-only normalizers from finding a dialable number.
  const hex = isUuidLike(uuid) ? uuid.replace(/-/g, '').toLowerCase() : randomUUID().replace(/-/g, '')
  return 'TEST:' + [...hex].map(char => String.fromCharCode(97 + parseInt(char, 16))).join('')
}

export function buildSyntheticTestLeadIdentity(
  runId: string,
  phoneSource: string = randomUUID(),
): SyntheticTestLeadIdentity {
  const phone = buildReservedTestPhone(phoneSource)
  return {
    name: buildSyntheticTestLeadName(runId),
    phone,
    normalizedPhone: phone,
    sourceChannel: TEST_LEAD_SOURCE_CHANNEL,
    status: TEST_LEAD_STATUS,
  }
}

/** Endereco minimo, com rotulos explicitamente ficticios (nunca PII real). */
export function buildSyntheticTestLeadAddress(): SyntheticTestLeadAddress {
  return {
    street: 'Rua Sintética de Teste (fictícia)',
    number: '0',
    complement: null,
    neighborhood: 'Bairro Fictício (teste)',
    city: 'Cidade de Teste',
    state: 'XX',
    zipCode: '00000-000',
    referencePoint: 'Registro sintético de teste E2E — não é endereço real.',
    propertyType: 'TESTE',
  }
}

/**
 * Campos de identidade/PII presentes no corpo, na grafia original recebida.
 * Detecta camelCase e snake_case. Lista vazia = corpo sem nada critico.
 */
export function findUntrustedTestLeadFields(payload: unknown): string[] {
  if (payload === null || typeof payload !== 'object' || Array.isArray(payload)) return []
  const found = new Set<string>()
  for (const key of Object.keys(payload as Record<string, unknown>)) {
    if (UNTRUSTED_FIELD_SET.has(normalizeFieldName(key))) found.add(key)
  }
  return [...found].sort()
}

/**
 * Projecao sanitizada usada pelo GET: apenas id, runId, status e createdAt.
 * Qualquer outro campo do registro (nome, telefone, documento, endereco) eh
 * descartado aqui, no servidor.
 */
export function sanitizeTestLeadListItem(row: {
  id: string
  testRunId: string | null
  status: string
  createdAt: Date | string
}): TestLeadListItem {
  return {
    id: row.id,
    runId: typeof row.testRunId === 'string' && row.testRunId.length > 0 ? row.testRunId : null,
    status: row.status,
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
  }
}
