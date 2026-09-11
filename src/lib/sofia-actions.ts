import { z } from 'zod'

const central = z.object({
  centralContactId: z.string().uuid(),
  centralClientId: z.string().uuid(),
  centralHubId: z.string().uuid(),
  centralRole: z.enum(['hub_owner', 'hub_admin']),
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
