import { z } from 'zod'

const publicUrl = z.string().trim().url().refine((value) => /^https?:\/\//i.test(value), 'Use uma URL http(s).').nullable().optional()
const photoValue = z.string().max(2800000).refine((value) => /^(https?:\/\/|data:image\/(png|jpeg|webp);base64,)/i.test(value), 'Use uma URL http(s) ou uma imagem JPG, PNG ou WebP.').nullable().optional()
export const ProfileSchema = z.object({
  name: z.string().trim().min(2).max(160), email: z.string().trim().email().max(254).nullable().optional(),
  phone: z.string().trim().regex(/^\d{10,15}$/, 'Informe o WhatsApp apenas com dígitos, incluindo DDI e DDD.'),
  jobTitle: z.string().trim().max(120).nullable().optional(), photoUrl: photoValue,
  company: z.string().trim().max(160).nullable().optional(), city: z.string().trim().max(120).nullable().optional(),
  state: z.string().trim().regex(/^[A-Za-z]{2}$/).nullable().optional(), instagramUrl: publicUrl,
  websiteUrl: publicUrl, personalNotes: z.string().trim().max(1000).nullable().optional(),
}).strict()
