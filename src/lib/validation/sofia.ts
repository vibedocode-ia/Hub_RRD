import { z } from 'zod';

export const SofiaDispatchSchema = z.object({
  senderPhone: z.string().min(10, 'Telefone do remetente é obrigatório'),
  customerName: z.string().min(2, 'Nome do cliente é obrigatório'),
  customerPhone: z.string().optional(),
  customerDocument: z.string().optional(), // CPF ou CNPJ se houver
  address: z.object({
    street: z.string().optional(),
    number: z.string().optional(),
    complement: z.string().optional(),
    neighborhood: z.string().optional(),
    city: z.string().default('Niterói'),
    referencePoint: z.string().optional(),
  }),
  serviceType: z.enum([
    'DESENTUPIMENTO',
    'HIDROJATEAMENTO',
    'CAIXA_GORDURA',
    'LIMPA_FOSSA',
    'DEDETIZACAO',
  ]).default('DESENTUPIMENTO'),
  problemReported: z.string().min(3, 'Descrição do problema é obrigatória'),
  estimatedAmount: z.string().optional(),
  priority: z.enum(['NORMAL', 'URGENTE_24H']).default('NORMAL'),
  intentDetected: z.string().default('CRIAR_ORCAMENTO'),
});

export type SofiaDispatchPayload = z.infer<typeof SofiaDispatchSchema>;
