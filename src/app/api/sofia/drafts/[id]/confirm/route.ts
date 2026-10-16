import { NextRequest, NextResponse } from 'next/server'
import { requireLocalPermission } from '@/lib/require-local-permission'
import { issuePortalDraftDocument } from '@/lib/sofia-issue-draft'

type Params = { params: Promise<{ id: string }> }

/** The only actor accepted here is the current server-side local session. */
export async function POST(req: NextRequest, { params }: Params) {
  const authorized = await requireLocalPermission('sofia.drafts.review')
  if (!authorized || !authorized.access.permissions.includes('documents.issue')) return NextResponse.json({ error: 'Permissão insuficiente para revisar e emitir documentos.' }, { status: 403 })
  const body = await req.json().catch(() => null)
  if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).some(key => !['confirmation', 'reviewVersion'].includes(key)) || body.confirmation !== 'CONFIRMO' || typeof body.reviewVersion !== 'string' || !/^[a-f0-9]{64}$/.test(body.reviewVersion)) return NextResponse.json({ error: 'Confirmação explícita e versão revisada obrigatórias; não envie ator ou campos de emissão.' }, { status: 422 })
  const { id } = await params
  try {
    const issued = await issuePortalDraftDocument({ draftId: id, actorUserId: authorized.access.id, reviewVersion: body.reviewVersion })
    if (!issued.ok) return NextResponse.json({ error: issued.error, pendingFields: issued.pendingFields }, { status: issued.status })
    return NextResponse.json({ success: true, alreadyProcessed: issued.alreadyProcessed === true, documentId: issued.result.documentId, docNumber: issued.result.docNumber, previewUrl: `/portal/documentos/preview/${issued.result.documentId}` }, { status: issued.alreadyProcessed ? 200 : 201 })
  } catch {
    // No SQL parameters, payloads or credentials are exposed to the browser/logs.
    return NextResponse.json({ error: 'Emissão não concluída. Tente novamente com os mesmos dados revisados.' }, { status: 503 })
  }
}
