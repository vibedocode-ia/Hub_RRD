import { z } from 'zod'

const optionalText = z.string().trim().max(2000).optional().nullable()
const optionalUrl = z.string().url().max(2048).optional().nullable()
const optionalUuid = z.string().uuid().optional().nullable()
const datetime = z.string().datetime({ offset: true })

export const CreateContactSchema = z.object({
  name: z.string().trim().min(2).max(160),
  phone: z.string().trim().max(40).optional().nullable(),
  email: z.string().trim().email().max(254).optional().nullable(),
  title: z.string().trim().max(120).optional().nullable(),
  photoUrl: optionalUrl,
  linkedinUrl: optionalUrl,
  instagramUrl: optionalUrl,
  websiteUrl: optionalUrl,
  clientId: optionalUuid,
  notes: optionalText,
}).strict()

export const UpdateContactSchema = CreateContactSchema.partial().extend({ isActive: z.boolean().optional() }).strict()

export const CreateAgendaEventSchema = z.object({
  title: z.string().trim().min(2).max(200),
  description: optionalText,
  location: z.string().trim().max(300).optional().nullable(),
  startsAt: datetime,
  endsAt: datetime,
  contactId: optionalUuid,
  clientId: optionalUuid,
  serviceRequestId: optionalUuid,
}).strict().superRefine((data, ctx) => {
  if (Date.parse(data.endsAt) <= Date.parse(data.startsAt)) ctx.addIssue({ code: 'custom', path: ['endsAt'], message: 'O fim deve ser posterior ao início.' })
})

export const UpdateAgendaEventSchema = z.object({
  title: z.string().trim().min(2).max(200).optional(),
  description: optionalText,
  location: z.string().trim().max(300).optional().nullable(),
  startsAt: datetime.optional(),
  endsAt: datetime.optional(),
  contactId: optionalUuid,
  clientId: optionalUuid,
  serviceRequestId: optionalUuid,
  status: z.enum(['SCHEDULED', 'CANCELLED']).optional(),
}).strict()

export function normalizeGoogleSettings(value: unknown) {
  const parsed = z.object({ primaryEmail: z.string().trim().email().max(254) }).strict().safeParse(value)
  if (!parsed.success) throw new Error('GOOGLE_PRIMARY_EMAIL_INVALID')
  return parsed.data
}
