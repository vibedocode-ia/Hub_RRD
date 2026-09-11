import { z } from 'zod';

export const SofiaDispatchSchema = z.object({
  // Campos obrigatórios da Central (Autorização e Rastreio)
  correlationId: z.string().min(1, 'Correlation ID obrigatório'),
  centralContactId: z.string().min(1, 'Central Contact ID obrigatório'),
  centralClientId: z.string().min(1, 'Central Client ID obrigatório'),
  centralHubId: z.string().min(1, 'Central Hub ID obrigatório'),
  centralRole: z.string().min(1, 'Central Role obrigatória'),
  senderPhone: z.string().min(10, 'Telefone do remetente é obrigatório para rastreio'),
  
  // Campos de Negócio/Operacionais (Podem ser parciais em um rascunho)
  intentDetected: z.string().default('CRIAR_ORCAMENTO'),
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
  customerDocument: z.string().optional(),
  address: z.object({
    street: z.string().optional(),
    number: z.string().optional(),
    complement: z.string().optional(),
    neighborhood: z.string().optional(),
    city: z.string().optional(),
    referencePoint: z.string().optional(),
  }).optional(),
  serviceType: z.enum([
    'DESENTUPIMENTO',
    'HIDROJATEAMENTO',
    'CAIXA_GORDURA',
    'LIMPA_FOSSA',
    'DEDETIZACAO',
  ]).optional(),
  problemReported: z.string().optional(),
  estimatedAmount: z.string().optional(),
  priority: z.enum(['NORMAL', 'URGENTE_24H']).optional(),
  
  conversationSummary: z.string().optional(),
});

export type SofiaDispatchPayload = z.infer<typeof SofiaDispatchSchema>;

