import { createHash } from 'node:crypto'

/** JSONB key order is not stable; bind the confirmation to canonical reviewed content. */
export function draftReviewVersion(payload: unknown, template?: { id: string; version: string; fieldSchema: unknown; sourceSha256: string; sourcePdfBase64: string }): string {
  const canonical = (value: unknown): unknown => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object' ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, canonical(item)])) : value
  return createHash('sha256').update(JSON.stringify(canonical(template ? { payload, template: { id: template.id, version: template.version, fieldSchema: template.fieldSchema, sourceSha256: template.sourceSha256, actualSourceHash: createHash('sha256').update(Buffer.from(template.sourcePdfBase64, 'base64')).digest('hex') } } : payload))).digest('hex')
}
