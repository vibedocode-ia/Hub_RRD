import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'node:crypto'
import { asc, eq } from 'drizzle-orm'
import { db, documentTemplates } from '@/db'
import { requireLocalPermission } from '@/lib/require-local-permission'
import { parseDocumentTemplateInput } from '@/lib/document-template-contract'

const MAX_PDF_BYTES = 10 * 1024 * 1024
const safeName = (name: string) => name.replace(/[^a-zA-Z0-9._ -]/g, '_').slice(0, 160) || 'modelo.pdf'
const response = (template: typeof documentTemplates.$inferSelect) => ({ id: template.id, slug: template.slug, name: template.name, docType: template.docType, version: template.version, description: template.description, fields: template.fieldSchema, sourceFilename: template.sourceFilename, sourceSha256: template.sourceSha256, isActive: template.isActive, archivedAt: template.archivedAt, createdAt: template.createdAt, updatedAt: template.updatedAt })

export async function GET() {
  const authorized = await requireLocalPermission('documents.issue')
  if (!authorized) return NextResponse.json({ error: 'Permissão insuficiente para consultar modelos.' }, { status: 403 })
  if (!db) return NextResponse.json({ error: 'Banco de dados indisponível.' }, { status: 503 })
  const rows = await db.select().from(documentTemplates).orderBy(asc(documentTemplates.docType), asc(documentTemplates.name), asc(documentTemplates.version))
  return NextResponse.json({ templates: rows.map(response) })
}

export async function POST(req: NextRequest) {
  const authorized = await requireLocalPermission('documents.issue')
  if (!authorized) return NextResponse.json({ error: 'Permissão insuficiente para adicionar modelos.' }, { status: 403 })
  if (!db) return NextResponse.json({ error: 'Banco de dados indisponível.' }, { status: 503 })
  const form = await req.formData().catch(() => null)
  const file = form?.get('file')
  const raw = form?.get('definition')
  if (!(file instanceof File) || typeof raw !== 'string') return NextResponse.json({ error: 'Envie o PDF e a definição do modelo.' }, { status: 400 })
  if (file.size < 5 || file.size > MAX_PDF_BYTES || file.type !== 'application/pdf') return NextResponse.json({ error: 'Envie apenas PDF de até 10 MB.' }, { status: 422 })
  const definition = parseDocumentTemplateInput(JSON.parse(raw || 'null'))
  if (!definition.ok) return NextResponse.json({ error: definition.error }, { status: 422 })
  const bytes = Buffer.from(await file.arrayBuffer())
  if (!bytes.subarray(0, 5).equals(Buffer.from('%PDF-'))) return NextResponse.json({ error: 'Arquivo PDF inválido.' }, { status: 422 })
  const slug = `${definition.data.docType.toLowerCase()}-${definition.data.version.toLowerCase()}`
  const [created] = await db.insert(documentTemplates).values({ slug, name: definition.data.name, docType: definition.data.docType, version: definition.data.version, description: definition.data.description || null, fieldSchema: definition.data.fields, sourcePdfBase64: bytes.toString('base64'), sourceFilename: safeName(file.name), sourceMime: 'application/pdf', sourceSha256: createHash('sha256').update(bytes).digest('hex'), createdById: authorized.access.id }).returning()
  return NextResponse.json({ success: true, template: response(created) }, { status: 201 })
}
