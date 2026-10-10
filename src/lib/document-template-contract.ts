import { z } from 'zod'

const placement = z.object({
  page: z.number().int().nonnegative(),
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  width: z.number().gt(0).max(1),
  height: z.number().gt(0).max(1),
  fontSize: z.number().min(4).max(72).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  background: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
}).strict().refine(p => p.x + p.width <= 1 + 1e-9 && p.y + p.height <= 1 + 1e-9, 'Área fora da página.')

const field = z.object({
  key: z.string().regex(/^[a-z][a-zA-Z0-9_]{1,63}$/).refine(value => !['__proto__', 'constructor', 'prototype'].includes(value)),
  label: z.string().trim().min(1).max(120),
  type: z.enum(['text', 'textarea', 'currency', 'date', 'items']),
  required: z.boolean(),
  defaultValue: z.string().max(2000).optional(),
  placements: z.array(placement).max(20).optional(),
}).strict()

const fieldsSchema = z.preprocess(value => {
  if (typeof value !== 'string') return value
  try { return JSON.parse(value) } catch { return value }
}, z.array(field).min(1).max(80).refine(values => new Set(values.map(value => value.key)).size === values.length, 'Campos duplicados.'))

const input = z.object({
  name: z.string().trim().min(2).max(120),
  docType: z.enum(['RECIBO_GARANTIA', 'LAUDO_TECNICO', 'ORCAMENTO', 'ORCAMENTO_TECNICO']),
  version: z.string().regex(/^[A-Z][A-Z0-9_]{2,63}$/),
  description: z.string().trim().max(500).optional(),
  fields: fieldsSchema,
}).strict()

export type DocumentTemplateInput = z.infer<typeof input>
export type DocumentTemplateField = z.infer<typeof field>
export type DocumentTemplatePlacement = z.infer<typeof placement>
export function normalizeTemplateFields(raw: unknown): DocumentTemplateField[] {
  if (raw === '[]' || (Array.isArray(raw) && raw.length === 0)) return []
  return fieldsSchema.parse(raw)
}
export function parseDocumentTemplateInput(raw: unknown): { ok: true; data: DocumentTemplateInput } | { ok: false; error: string } {
  const parsed = input.safeParse(raw)
  return parsed.success ? { ok: true, data: parsed.data } : { ok: false, error: 'Definição de modelo inválida.' }
}
