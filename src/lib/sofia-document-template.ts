import { and, desc, eq, isNull } from 'drizzle-orm'
import { db, documentTemplates } from '@/db'
import { normalizeTemplateFields } from '@/lib/document-template-contract'

/** Same selector for schema discovery and issuance. Explicit IDs cannot cross docType. */
export async function selectSofiaDocumentTemplate(docType: string, templateId?: string) {
  if (!db) return null
  const [template] = await db.select().from(documentTemplates).where(and(
    eq(documentTemplates.docType, docType), eq(documentTemplates.isActive, true),
    isNull(documentTemplates.archivedAt), ...(templateId ? [eq(documentTemplates.id, templateId)] : []),
  )).orderBy(desc(documentTemplates.updatedAt), desc(documentTemplates.id)).limit(1)
  return template ?? null
}

export function publicSofiaDocumentTemplate(template: { id: string; version: string; docType: string; fieldSchema: unknown }) {
  const fields = normalizeTemplateFields(template.fieldSchema)
  return { id: template.id, version: template.version, docType: template.docType,
    fields: fields.map(({ key, label, type, required, defaultValue }) => ({ key, label, type, required, ...(typeof defaultValue === 'string' ? { defaultValue } : {}) })) }
}

export function unknownDocumentFields(schema: unknown, values: Record<string, string> = {}) {
  const allowed = new Set(normalizeTemplateFields(schema).map(field => field.key))
  return Object.keys(values).filter(key => !allowed.has(key))
}
