import { NextResponse } from 'next/server'
import { requireLocalPermission } from '@/lib/require-local-permission'

export const runtime = 'nodejs'

// Transport is intentionally absent from this release. A PDF/hash is not delivery evidence.
async function unavailable() {
  const allowed = await requireLocalPermission('documents.send')
  if (!allowed) {
    return NextResponse.json({ error: 'Permissão insuficiente para entregar documentos.' }, { status: 403 })
  }
  return NextResponse.json({
    code: 'DOCUMENT_TRANSPORT_NOT_CONFIGURED',
    error: 'Transporte de documentos não configurado; nenhum envio realizado ou confirmado.',
  }, { status: 503, headers: { 'cache-control': 'no-store' } })
}

export async function POST() { return unavailable() }
export async function GET() { return unavailable() }
