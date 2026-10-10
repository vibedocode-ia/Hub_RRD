import { createHash } from 'node:crypto'
import { normalizeTemplateFields } from '@/lib/document-template-contract'
import { renderStoredDocumentTemplate } from '@/lib/stored-document-template'
import { resolveTemplateValues } from './template-values'

export async function renderRegisteredTemplate(template: { sourcePdfBase64: string; fieldSchema: unknown; sourceSha256: string }, data: Record<string, unknown>, explicit: Record<string, unknown> = {}) {
  const hash = createHash('sha256').update(Buffer.from(template.sourcePdfBase64, 'base64')).digest('hex')
  if (hash !== template.sourceSha256) return { ok: false as const, error: { code: 'SOURCE_HASH_MISMATCH', message: 'A integridade do PDF modelo não foi confirmada.' } }
  const fields = normalizeTemplateFields(template.fieldSchema)
  const resolved = resolveTemplateValues(data, explicit)
  const values: Record<string, string> = Object.create(null)
  for (const field of fields) {
    const value = resolved[field.key] ?? field.defaultValue
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      const formatted = Array.isArray(value) ? value.join('\n') : String(value)
      values[field.key] = field.type === 'currency' ? `R$ ${formatted.replace(/^R\$\s*/, '')}` : formatted
    }
  }
  const rendered = await renderStoredDocumentTemplate({ sourcePdfBase64: template.sourcePdfBase64, fieldSchema: fields, values })
  if (!rendered.ok) {
    const label = fields.find(field => field.key === rendered.error.field)?.label
    return { ...rendered, error: { ...rendered.error, message: label ? `${rendered.error.message} Campo: ${label}.` : rendered.error.message } }
  }
  return { ...rendered, fieldSchemaSnapshot: fields, fieldValuesSnapshot: values }
}
