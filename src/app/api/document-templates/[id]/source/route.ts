import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db, documentTemplates } from '@/db'
import { requireLocalPermission } from '@/lib/require-local-permission'

type Params = { params: Promise<{ id: string }> }
export async function GET(_req: NextRequest, { params }: Params) {
  const authorized = await requireLocalPermission('documents.issue')
  if (!authorized) return NextResponse.json({ error: 'Permissão insuficiente para acessar PDF do modelo.' }, { status: 403 })
  if (!db) return NextResponse.json({ error: 'Banco de dados indisponível.' }, { status: 503 })
  const { id } = await params
  const [row] = await db.select({ sourcePdfBase64: documentTemplates.sourcePdfBase64, sourceFilename: documentTemplates.sourceFilename }).from(documentTemplates).where(eq(documentTemplates.id, id)).limit(1)
  if (!row) return NextResponse.json({ error: 'Modelo não encontrado.' }, { status: 404 })
  return new NextResponse(Buffer.from(row.sourcePdfBase64, 'base64'), { headers: { 'content-type': 'application/pdf', 'content-disposition': `inline; filename="${row.sourceFilename.replace(/["\\]/g, '_')}"`, 'cache-control': 'private, no-store' } })
}
