import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db, documentTemplates } from '@/db'
import { requireLocalPermission } from '@/lib/require-local-permission'
import { parseDocumentTemplateInput } from '@/lib/document-template-contract'

type Params = { params: Promise<{ id: string }> }
const publicTemplate = (row: typeof documentTemplates.$inferSelect) => ({ id: row.id, slug: row.slug, name: row.name, docType: row.docType, version: row.version, description: row.description, fields: row.fieldSchema, sourceFilename: row.sourceFilename, sourceSha256: row.sourceSha256, isActive: row.isActive, archivedAt: row.archivedAt, createdAt: row.createdAt, updatedAt: row.updatedAt })

export async function GET(_req: NextRequest, { params }: Params) {
  const authorized = await requireLocalPermission('documents.issue')
  if (!authorized) return NextResponse.json({ error: 'Permissão insuficiente para consultar modelo.' }, { status: 403 })
  if (!db) return NextResponse.json({ error: 'Banco de dados indisponível.' }, { status: 503 })
  const { id } = await params
  const [row] = await db.select().from(documentTemplates).where(eq(documentTemplates.id, id)).limit(1)
  return row ? NextResponse.json({ template: publicTemplate(row) }) : NextResponse.json({ error: 'Modelo não encontrado.' }, { status: 404 })
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const authorized = await requireLocalPermission('documents.issue')
  if (!authorized) return NextResponse.json({ error: 'Permissão insuficiente para editar modelo.' }, { status: 403 })
  if (!db) return NextResponse.json({ error: 'Banco de dados indisponível.' }, { status: 503 })
  const body = await req.json().catch(() => null)
  const parsed = parseDocumentTemplateInput(body)
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 422 })
  const { id } = await params
  const [updated] = await db.update(documentTemplates).set({ name: parsed.data.name, description: parsed.data.description || null, fieldSchema: parsed.data.fields, updatedAt: new Date() }).where(eq(documentTemplates.id, id)).returning()
  return updated ? NextResponse.json({ success: true, template: publicTemplate(updated) }) : NextResponse.json({ error: 'Modelo não encontrado.' }, { status: 404 })
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const authorized = await requireLocalPermission('documents.issue')
  if (!authorized) return NextResponse.json({ error: 'Permissão insuficiente para arquivar modelo.' }, { status: 403 })
  if (!db) return NextResponse.json({ error: 'Banco de dados indisponível.' }, { status: 503 })
  const { id } = await params
  const [archived] = await db.update(documentTemplates).set({ isActive: false, archivedAt: new Date(), updatedAt: new Date() }).where(eq(documentTemplates.id, id)).returning()
  return archived ? NextResponse.json({ success: true, template: publicTemplate(archived) }) : NextResponse.json({ error: 'Modelo não encontrado.' }, { status: 404 })
}
