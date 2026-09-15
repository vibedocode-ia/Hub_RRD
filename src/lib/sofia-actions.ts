import { z } from 'zod'

const central = z.object({
  centralContactId: z.string().uuid(),
  centralClientId: z.string().uuid(),
  centralHubId: z.string().uuid(),
  centralRole: z.enum(['hub_owner', 'hub_admin', 'hub_operator']),
  senderPhone: z.string().regex(/^\+[1-9]\d{7,14}$/),
}).strict()

export const SofiaListServicesRequest = central.extend({ action: z.literal('list_services') }).strict()
export const SofiaListActiveTeamsRequest = central.extend({ action: z.literal('list_active_teams') }).strict()
export const SofiaCreateDraftRequest = central.extend({
  action: z.literal('create_service_draft'),
  intentDetected: z.enum(['CRIAR_ORCAMENTO', 'CRIAR_OS']).default('CRIAR_ORCAMENTO'),
  customerName: z.string().trim().min(1).max(160).optional(),
  customerPhone: z.string().trim().regex(/^\+?[1-9]\d{7,14}$/).optional(),
  address: z.object({
    street: z.string().trim().min(1).max(160).optional(),
    number: z.string().trim().min(1).max(32).optional(),
    complement: z.string().trim().max(120).optional(),
    neighborhood: z.string().trim().min(1).max(120).optional(),
    city: z.string().trim().max(120).optional(),
    referencePoint: z.string().trim().max(200).optional(),
  }).strict().optional(),
  serviceType: z.enum(['DESENTUPIMENTO', 'HIDROJATEAMENTO', 'CAIXA_GORDURA', 'LIMPA_FOSSA', 'DEDETIZACAO']).optional(),
  problemReported: z.string().trim().min(1).max(2000).optional(),
  priority: z.enum(['NORMAL', 'URGENTE_24H']).optional(),
  conversationSummary: z.string().trim().min(1).max(4000),
}).strict()

export const SofiaActionRequest = z.union([SofiaListServicesRequest, SofiaListActiveTeamsRequest, SofiaCreateDraftRequest])
export type SofiaActionRequest = z.infer<typeof SofiaActionRequest>

export function pendingDraftFields(input: z.infer<typeof SofiaCreateDraftRequest>) {
  const missing: Array<{ field: string; label: string; requiredFor: string }> = []
  if (!input.customerName) missing.push({ field: 'customer.name', label: 'Nome do cliente', requiredFor: 'service_request' })
  if (!input.address?.street) missing.push({ field: 'address.street', label: 'Logradouro', requiredFor: 'service_request' })
  if (!input.address?.number) missing.push({ field: 'address.number', label: 'Número', requiredFor: 'service_request' })
  if (!input.address?.neighborhood) missing.push({ field: 'address.neighborhood', label: 'Bairro', requiredFor: 'service_request' })
  if (!input.problemReported) missing.push({ field: 'service.problemReported', label: 'Problema relatado', requiredFor: 'service_request' })
  return missing
}


// CRM Sofia: contrato fechado para clientes, separado das ações operacionais.
export type SofiaClientAction = 'list_clients' | 'get_client_profile' | 'create_client' | 'update_client' | 'archive_client'

const ACTIONS = new Set<SofiaClientAction>(['list_clients', 'get_client_profile', 'create_client', 'update_client', 'archive_client'])
const clean = (value: unknown, limit: number) => typeof value === 'string' ? value.trim().slice(0, limit) : ''

export function digits(value: unknown) { return clean(value, 32).replace(/\D/g, '') }

export function validCpf(value: unknown) {
  const cpf = digits(value)
  if (!/^\d{11}$/.test(cpf) || /^(\d)\1{10}$/.test(cpf)) return false
  const check = (size: number) => {
    const sum = cpf.slice(0, size).split('').reduce((total, digit, index) => total + Number(digit) * (size + 1 - index), 0)
    const result = (sum * 10) % 11
    return result === 10 ? 0 : result
  }
  return check(9) === Number(cpf[9]) && check(10) === Number(cpf[10])
}

export function parseSofiaClientAction(raw: unknown): { ok: true; action: SofiaClientAction; data: Record<string, unknown> } | { ok: false; error: string } {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { ok: false, error: 'Payload inválido.' }
  const body = raw as Record<string, unknown>
  if (!ACTIONS.has(body.action as SofiaClientAction)) return { ok: false, error: 'Operação Sofia não suportada.' }
  if (!['hub_owner', 'hub_admin', 'hub_operator'].includes(clean(body.centralRole, 32))) return { ok: false, error: 'Papel central não autorizado.' }
  if (!/^\+?[1-9]\d{7,14}$/.test(clean(body.senderPhone, 20))) return { ok: false, error: 'Identidade de origem inválida.' }
  const action = body.action as SofiaClientAction
  const data = body.data && typeof body.data === 'object' && !Array.isArray(body.data) ? body.data as Record<string, unknown> : {}
  if (action === 'get_client_profile') {
    const hasId = /^[0-9a-f-]{36}$/i.test(clean(data.clientId, 40))
    const name = clean(data.name, 160)
    if (hasId === Boolean(name)) return { ok: false, error: 'Informe exatamente nome ou ID do cliente.' }
  }
  if (action === 'create_client') {
    if (!clean(data.name, 160) || !digits(data.phone)) return { ok: false, error: 'Nome e telefone são obrigatórios.' }
    if (data.document && !validCpf(data.document)) return { ok: false, error: 'CPF inválido. Corrija o documento antes de cadastrar.' }
  }
  if (action === 'update_client') {
    if (!/^[0-9a-f-]{36}$/i.test(clean(data.clientId, 40))) return { ok: false, error: 'Cliente inválido.' }
    const editable = ['name', 'phone', 'document', 'email', 'contactPerson', 'notes', 'type', 'source', 'recurrence', 'customerSince', 'lastContactAt', 'nextVisitAt', 'street', 'number', 'complement', 'floorOrUnit', 'neighborhood', 'city', 'state', 'zipCode', 'referencePoint', 'serviceAccessNotes', 'propertyType', 'needsCondominiumAuthorization']
    const unknown = Object.keys(data).filter(key => key !== 'clientId' && !editable.includes(key))
    if (unknown.length) return { ok: false, error: 'Campo CRM não permitido.' }
    if (!editable.some(key => data[key] !== undefined)) return { ok: false, error: 'Nenhum campo CRM informado para atualização.' }
    for (const field of ['street', 'number', 'neighborhood', 'city', 'state'] as const) if (data[field] !== undefined && !clean(data[field], field === 'state' ? 2 : 160)) return { ok: false, error: 'Campo de endereço inválido.' }
    for (const field of ['complement', 'floorOrUnit', 'zipCode', 'referencePoint', 'serviceAccessNotes', 'propertyType'] as const) if (data[field] !== undefined && typeof data[field] !== 'string') return { ok: false, error: 'Campo de endereço inválido.' }
    if (data.needsCondominiumAuthorization !== undefined && typeof data.needsCondominiumAuthorization !== 'boolean') return { ok: false, error: 'Autorização de condomínio inválida.' }
    if (data.phone !== undefined && !digits(data.phone)) return { ok: false, error: 'Telefone inválido.' }
    if (data.document && !validCpf(data.document)) return { ok: false, error: 'CPF inválido. Corrija o documento antes de atualizar.' }
  }
  if (action === 'archive_client' && !/^[0-9a-f-]{36}$/i.test(clean(data.clientId, 40))) return { ok: false, error: 'Cliente inválido.' }
  return { ok: true, action, data }
}

export function safeClientSummary(client: { id: string; name: string; phone: string; isActive: boolean }) {
  return { id: client.id, name: client.name, phone: `***${digits(client.phone).slice(-4)}`, active: client.isActive }
}
export type SofiaDomainAction =
  | 'list_stock' | 'adjust_stock' | 'create_financial_entry' | 'list_financial_entries' | 'get_financial_summary' | 'update_financial_entry'
  | 'list_vehicles' | 'create_vehicle' | 'update_vehicle' | 'archive_vehicle'
  | 'list_teams' | 'create_team' | 'update_team'
  | 'list_equipment' | 'create_equipment' | 'update_equipment'
  | 'list_service_requests' | 'update_service_request'
  | 'list_documents' | 'update_document' | 'archive_document'
  | 'create_catalog_service' | 'update_catalog_service' | 'archive_catalog_service'

const DOMAIN_ACTIONS = new Set<SofiaDomainAction>([
  'list_stock', 'adjust_stock', 'create_financial_entry', 'list_financial_entries', 'get_financial_summary', 'update_financial_entry',
  'list_vehicles', 'create_vehicle', 'update_vehicle', 'archive_vehicle',
  'list_teams', 'create_team', 'update_team', 'list_equipment', 'create_equipment', 'update_equipment',
  'list_service_requests', 'update_service_request', 'list_documents', 'update_document', 'archive_document',
  'create_catalog_service', 'update_catalog_service', 'archive_catalog_service',
])
const isUuid = (value: unknown) => /^[0-9a-f-]{36}$/i.test(clean(value, 40))
const decimal = (value: unknown) => {
  const normalized = clean(value, 32).replace(',', '.')
  const number = Number(normalized)
  return Number.isFinite(number) && number > 0 && number <= 10000000 ? normalized : null
}
const trustedDomainEnvelope = (body: Record<string, unknown>) =>
  ['hub_owner', 'hub_admin', 'hub_operator'].includes(clean(body.centralRole, 32)) &&
  /^\+?[1-9]\d{7,14}$/.test(clean(body.senderPhone, 20)) &&
  isUuid(body.centralContactId) && isUuid(body.centralClientId) && isUuid(body.centralHubId)

export function parseSofiaDomainAction(raw: unknown): { ok: true; action: SofiaDomainAction; data: Record<string, unknown> } | { ok: false; error: string } {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { ok: false, error: 'Payload inválido.' }
  const body = raw as Record<string, unknown>
  if (!DOMAIN_ACTIONS.has(body.action as SofiaDomainAction)) return { ok: false, error: 'Operação Sofia não suportada.' }
  if (!trustedDomainEnvelope(body)) return { ok: false, error: 'Contexto central não autorizado.' }
  const action = body.action as SofiaDomainAction
  const data = body.data && typeof body.data === 'object' && !Array.isArray(body.data) ? body.data as Record<string, unknown> : {}
  if (action === 'list_stock' && clean(data.query, 160).length > 160) return { ok: false, error: 'Consulta de estoque inválida.' }
  if (action === 'adjust_stock') {
    if (!isUuid(data.itemId) || !decimal(data.quantity) || !['ENTRADA', 'SAIDA'].includes(clean(data.direction, 16))) return { ok: false, error: 'Ajuste de estoque inválido.' }
  }
  if (action === 'create_financial_entry') {
    if (!['RECEITA', 'DESPESA'].includes(clean(data.type, 16)) || !decimal(data.amount) || !clean(data.description, 300)) return { ok: false, error: 'Lançamento financeiro inválido.' }
    if (data.status && !['PENDENTE', 'EFETIVADO'].includes(clean(data.status, 16))) return { ok: false, error: 'Status financeiro inválido.' }
  }
  if (action === 'archive_vehicle') {
    const hasId = isUuid(data.vehicleId)
    const vehicleName = clean(data.vehicleName, 160)
    if (hasId === Boolean(vehicleName)) return { ok: false, error: 'Veículo inválido.' }
  }
  if (action === 'create_catalog_service') {
    if (!clean(data.name, 160) || !clean(data.description, 2000) || !decimal(data.basePrice)) return { ok: false, error: 'Serviço inválido: nome, descrição e valor base são obrigatórios.' }
  }
  if (action === 'update_catalog_service') {
    if (!isUuid(data.serviceId)) return { ok: false, error: 'Serviço inválido.' }
    if (!['name', 'category', 'description', 'basePrice', 'priceNotes', 'warrantyDays', 'defaultDurationMinutes', 'requiresInspection', 'isEmergencyEligible', 'displayOrder', 'status'].some(key => data[key] !== undefined)) return { ok: false, error: 'Nenhum campo de serviço informado.' }
  }
  if (action === 'archive_catalog_service' && !isUuid(data.serviceId)) return { ok: false, error: 'Serviço inválido.' }
  if (['list_financial_entries', 'get_financial_summary'].includes(action) && data.period !== undefined && !['HOJE', 'SEMANA_ATUAL', 'MES_ATUAL', 'TODOS'].includes(clean(data.period, 16))) return { ok: false, error: 'Período financeiro inválido.' }
  if (action === 'update_financial_entry') {
    if (!isUuid(data.entryId) || !['type', 'amount', 'description', 'category', 'status', 'date'].some(key => data[key] !== undefined)) return { ok: false, error: 'Lançamento financeiro inválido.' }
    if (data.type !== undefined && !['RECEITA', 'DESPESA'].includes(clean(data.type, 16))) return { ok: false, error: 'Tipo financeiro inválido.' }
    if (data.status !== undefined && !['PENDENTE', 'EFETIVADO', 'CANCELADO'].includes(clean(data.status, 16))) return { ok: false, error: 'Status financeiro inválido.' }
    if (data.amount !== undefined && !decimal(data.amount)) return { ok: false, error: 'Valor financeiro inválido.' }
  }
  if (action === 'create_team' && (!clean(data.name, 160) || !clean(data.leaderName, 160))) return { ok: false, error: 'Equipe inválida.' }
  if (action === 'update_team' && (!isUuid(data.teamId) || !['name', 'leaderName', 'phone', 'isActive'].some(key => data[key] !== undefined))) return { ok: false, error: 'Equipe inválida.' }
  if (action === 'create_vehicle' && (!clean(data.name, 160) || !clean(data.type, 64))) return { ok: false, error: 'Veículo inválido.' }
  if (action === 'update_vehicle' && (!isUuid(data.vehicleId) || !['name', 'plate', 'type', 'isActive'].some(key => data[key] !== undefined))) return { ok: false, error: 'Veículo inválido.' }
  if (action === 'create_equipment' && !clean(data.name, 160)) return { ok: false, error: 'Equipamento inválido.' }
  if (action === 'update_equipment' && (!isUuid(data.equipmentId) || !['name', 'code', 'isActive'].some(key => data[key] !== undefined))) return { ok: false, error: 'Equipamento inválido.' }
  if (action === 'update_service_request' && (!isUuid(data.requestId) || !['leadStatus', 'priority', 'serviceType', 'problemReported', 'problemFound', 'status', 'scheduledAt', 'assignedTeamId', 'vehicleId', 'equipmentId', 'totalAmount', 'paymentMethod', 'internalNotes', 'customerNotes', 'warrantyDays', 'cancelReason'].some(key => data[key] !== undefined))) return { ok: false, error: 'Chamado inválido.' }
  if (action === 'list_documents' && data.docType !== undefined && !['ORCAMENTO', 'ORCAMENTO_TECNICO', 'RECIBO_GARANTIA', 'LAUDO_TECNICO'].includes(clean(data.docType, 32))) return { ok: false, error: 'Tipo de documento inválido.' }
  if (action === 'update_document' && (!isUuid(data.documentId) || !['status', 'paymentMethod', 'warrantyTerms', 'technicalNotes'].some(key => data[key] !== undefined))) return { ok: false, error: 'Documento inválido.' }
  if (action === 'archive_document' && !isUuid(data.documentId)) return { ok: false, error: 'Documento inválido.' }
  return { ok: true, action, data }
}

export function safeStockSummary(item: { id: string; nome: string; categoria: string; quantidade: string; unidade: string; nivelCritico: string }) {
  const quantity = Number(item.quantidade)
  return { id: item.id, name: item.nome, category: item.categoria, quantity: item.quantidade, unit: item.unidade, lowStock: Number.isFinite(quantity) && quantity <= Number(item.nivelCritico) }
}

export function safeVehicleSummary(vehicle: { id: string; name: string; plate: string | null; type: string; isActive: boolean }) {
  return { id: vehicle.id, name: vehicle.name, plate: vehicle.plate ? `***${vehicle.plate.slice(-3)}` : null, type: vehicle.type, active: vehicle.isActive }
}
