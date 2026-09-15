import { z } from 'zod'

const field = z.object({
  key: z.string().regex(/^[a-z][a-zA-Z0-9_]{1,63}$/).refine(value => !['__proto__', 'constructor', 'prototype'].includes(value)),
  label: z.string().trim().min(1).max(120),
  type: z.enum(['text', 'textarea', 'currency', 'date', 'items']),
  required: z.boolean(),
  defaultValue: z.string().max(2000).optional(),
}).strict()

const input = z.object({
  name: z.string().trim().min(2).max(120),
  docType: z.enum(['RECIBO_GARANTIA', 'LAUDO_TECNICO', 'ORCAMENTO', 'ORCAMENTO_TECNICO']),
  version: z.string().regex(/^[A-Z][A-Z0-9_]{2,63}$/),
  description: z.string().trim().max(500).optional(),
  fields: z.array(field).min(1).max(80).refine(values => new Set(values.map(value => value.key)).size === values.length, 'Campos duplicados.'),
}).strict()

export type DocumentTemplateInput = z.infer<typeof input>
export function parseDocumentTemplateInput(raw: unknown): { ok: true; data: DocumentTemplateInput } | { ok: false; error: string } {
  const parsed = input.safeParse(raw)
  return parsed.success ? { ok: true, data: parsed.data } : { ok: false, error: 'Definição de modelo inválida.' }
}
