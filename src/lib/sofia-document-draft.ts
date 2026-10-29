import { resolveDocumentIdentity } from './document-identity'
import { isFinancialCalendarDate } from './validation/financeiro'

const text = (value: unknown) => typeof value === 'string' ? value.trim() : ''
const supplied = (value: unknown) => text(value).toLocaleLowerCase('pt-BR') !== 'não informado' ? text(value) : ''

// Structured scalar parsing only. Conversation intent and consent are interpreted by the caller/model.
function amount(value: unknown): string {
  const raw = text(value).replace(/^R\$\s*/, '')
  if (!/^(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d{1,2})?$/.test(raw) && !/^\d+\.\d{1,2}$/.test(raw)) return ''
  const number = Number(raw.includes(',') || /^\d{1,3}(?:\.\d{3})+$/.test(raw) ? raw.replace(/\./g, '').replace(',', '.') : raw)
  return Number.isFinite(number) && number > 0 && number <= 99_999_999.99 ? number.toFixed(2).replace('.', ',') : ''
}

const record = (value: unknown): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
export type SofiaDocumentDraftPayload = Record<string, unknown> & {
  address?: Record<string, unknown>
  documentFields: Record<string, unknown>
  optionalFieldConsent: Record<string, unknown>
}
const aliases: Record<string, string[]> = {
  customerName: ['clientName', 'contractorName', 'contractor'],
  customerDocument: ['clientDoc', 'clientDocument', 'contractorDocument'],
  amount: ['totalAmount', 'totalValue', 'amount'],
  documentDate: ['issueDate', 'paymentDate', 'executionDate'],
  problemReported: ['serviceScope', 'serviceDescription', 'includedDescription', 'technicalNotes'],
  paymentMethod: ['paymentMethod'],
}
const date = (value: unknown) => {
  const raw = text(value)
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(raw)
  return match ? `${match[3]}-${match[2]}-${match[1]}` : raw
}

/** Compare aliases by their domain without rewriting the reviewed JSON. */
export function conflictingDocumentAliases(payload: Record<string, unknown>): string[] {
  const fields = record(payload.documentFields)
  const canonical = (key: string, value: unknown): string => {
    const scalar = typeof value === 'number' && Number.isFinite(value) ? String(value) : text(value)
    if (key === 'amount') return amount(scalar) || scalar
    if (key === 'documentDate') return date(scalar)
    if (key === 'customerDocument') return resolveDocumentIdentity(scalar)?.document || scalar
    return scalar.normalize('NFC')
  }
  return Object.entries(aliases).flatMap(([key, names]) => names.filter(name => Object.hasOwn(fields, name) && canonical(key, fields[name]) !== canonical(key, payload[key])))
}

export const OPTIONAL_FIELD_CONSENT = 'Não informado'
const present = (payload: Record<string, unknown>, field: string) => {
  const [scope, key] = field.split('.')
  if (scope === 'customer') return supplied(payload[key === 'name' ? 'customerName' : key === 'document' ? 'customerDocument' : `customer${key[0].toUpperCase()}${key.slice(1)}`]) !== ''
  if (scope === 'service') return supplied(payload[key || 'serviceType']) !== '' || supplied(record(payload.address)[key || ''] ?? record(payload.documentFields)[key || '']) !== ''
  return supplied(record(payload.address)[key]) !== '' || supplied(record(payload.documentFields)[key]) !== ''
}

/** JSON-compatible draft only; never creates or fills a CRM record. Omitted values preserve earlier turns. */
export function normalizeDocumentDraft(previous: Record<string, unknown>, patch: Record<string, unknown>): SofiaDocumentDraftPayload {
  const fields = { ...record(previous.documentFields), ...record(patch.documentFields) }
  const payload: SofiaDocumentDraftPayload = {
    ...previous, ...Object.fromEntries(Object.entries(patch).filter(([, value]) => value !== undefined)),
    address: { ...record(previous.address), ...record(patch.address) }, documentFields: fields, optionalFieldConsent: {},
  }
  // A newly supplied template alias wins over a canonical value cached by a prior turn.
  for (const [key, names] of Object.entries(aliases)) {
    const incoming = record(patch.documentFields)
    const incomingAlias = names.find(name => incoming[name] !== undefined)
    const storedAlias = names.find(name => fields[name] !== undefined)
    const raw = patch[key] !== undefined ? patch[key] : incomingAlias ? incoming[incomingAlias] : previous[key] ?? (storedAlias ? fields[storedAlias] : '')
    let value = supplied(raw)
    if (key === 'amount') value = amount(value) || value
    if (key === 'documentDate') value = date(value)
    if (key === 'customerDocument' && /^[\d.\-/\s]+$/.test(value)) value = resolveDocumentIdentity(value)?.document || value
    payload[key] = value
    // Synchronize only aliases already in this template; never inject unknown template keys.
    for (const name of names) if (Object.hasOwn(fields, name)) fields[name] = key === 'documentDate' && isFinancialCalendarDate(value) ? value.split('-').reverse().join('/') : value
  }
  // Consent applies only while the corresponding optional value really is absent.
  const incomingConsent = record(patch.optionalFieldConsent)
  const consent = { ...record(previous.optionalFieldConsent) }
  for (const [field, value] of Object.entries(incomingConsent)) { if (value === null) delete consent[field]; else if (value === OPTIONAL_FIELD_CONSENT) consent[field] = value }
  for (const field of Object.keys(consent)) if (present(payload, field)) delete consent[field]
  payload.optionalFieldConsent = consent
  return payload
}

const optionalFields: Array<{ field: string; label: string; required: boolean }> = [
  { field: 'customer.name', label: 'Nome do cliente', required: true },
  { field: 'customer.document', label: 'CPF ou CNPJ válido', required: true },
  { field: 'amount', label: 'Valor positivo', required: true },
  { field: 'documentDate', label: 'Data válida e explícita', required: true },
  { field: 'service.problemReported', label: 'Escopo / observações', required: true },
  { field: 'customer.phone', label: 'Telefone do cliente', required: false },
  { field: 'address.street', label: 'Logradouro', required: false },
  { field: 'address.number', label: 'Número', required: false },
  { field: 'address.neighborhood', label: 'Bairro', required: false },
  { field: 'address.city', label: 'Cidade', required: false },
  { field: 'address.complement', label: 'Complemento', required: false },
  { field: 'address.referencePoint', label: 'Ponto de referência', required: false },
  { field: 'service.paymentMethod', label: 'Forma de pagamento', required: false },
  { field: 'service.priority', label: 'Prioridade', required: false },
]

/** Stable Hub contract: confirmed values, missing fields, whether omission was explicitly consented, and the next action. */
/** Consentimento explícito do operador: emitir mesmo com dados mínimos ausentes. */
export function missingDataAcknowledged(payload: Record<string, unknown>) {
  return payload.missingDataAcknowledged === true
}

export function documentDraftContract(payload: Record<string, unknown>) {
  const acknowledged = missingDataAcknowledged(payload)
  const consent = Object.fromEntries(Object.entries(record(payload.optionalFieldConsent)).filter(([, value]) => value === OPTIONAL_FIELD_CONSENT))
  const missing = acknowledged ? [] : requiredDocumentDraftFields(payload)
  const missingRequiredFields = missing.map(({ field, label }) => ({ field, label, required: true }))
  const missingOptionalFields: typeof optionalFields = []
  const confirmedValues: Record<string, unknown> = {}
  for (const item of optionalFields) {
    const key = item.field.split('.')[1]
    const value = item.field === 'service.priority' ? payload.priority : item.field === 'service.paymentMethod' ? payload.paymentMethod : item.field.split('.')[0] === 'address' ? record(payload.address)[key] : item.field.split('.')[0] === 'customer' ? payload[key === 'name' ? 'customerName' : key === 'document' ? 'customerDocument' : `customer${key[0].toUpperCase()}${key.slice(1)}`] : payload[key === 'problemReported' ? key : item.field]
    if (item.field === 'service.problemReported') { confirmedValues[item.field] = payload.problemReported; continue }
    if (!item.required) { if (supplied(value) !== '') confirmedValues[item.field] = value; else missingOptionalFields.push(item) }
    else if (supplied(value) !== '') confirmedValues[item.field] = value
  }
  const unconsentedOptionalFields = acknowledged ? [] : missingOptionalFields.filter(item => consent[item.field] !== OPTIONAL_FIELD_CONSENT)
  const nextAction = missingRequiredFields.length ? 'collect_missing_fields' : unconsentedOptionalFields.length ? 'confirm_optional_omissions' : 'review_draft'
  return {
    confirmedValues, missingRequiredFields, missingOptionalFields, unconsentedOptionalFields,
    optionalOmissionConsent: consent, nextAction,
  }
}

export function requiredDocumentDraftFields(input: Record<string, unknown>) {
  const missing: Array<{ field: string; label: string; requiredFor: string }> = []
  const add = (field: string, label: string) => missing.push({ field, label, requiredFor: 'document_issue' })
  if (!supplied(input.customerName)) add('customer.name', 'Nome do cliente')
  if (!/^[\d.\-/\s]+$/.test(text(input.customerDocument)) || !resolveDocumentIdentity(text(input.customerDocument))) add('customer.document', 'CPF ou CNPJ válido')
  if (!amount(input.amount)) add('amount', 'Valor positivo')
  if (!isFinancialCalendarDate(text(input.documentDate))) add('documentDate', 'Data válida e explícita')
  if (!supplied(input.problemReported)) add('service.problemReported', 'Escopo / observações')
  return missing
}
