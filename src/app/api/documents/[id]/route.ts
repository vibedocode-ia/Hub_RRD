import { NextRequest, NextResponse } from 'next/server';
import { and, eq, isNull, sql } from 'drizzle-orm'
import { archiveOfficialDocument } from '@/lib/official-document-lifecycle'
import { documentPurgeCounts, purgeDocumentRecord } from '@/lib/document-purge'

import { db, officialDocuments, serviceRequests } from '@/db';
import { requireLocalPermission } from '@/lib/require-local-permission';

type Params = { params: Promise<{ id: string }> };
const hasActiveRequest = sql`exists (select 1 from ${serviceRequests} where ${serviceRequests.id} = ${officialDocuments.serviceRequestId} and ${serviceRequests.archivedAt} is null)`;
const eligibleRequest = sql`(${isNull(officialDocuments.serviceRequestId)} or ${hasActiveRequest})`;

/** Official snapshots are immutable. Delivery is exclusively POST /delivery. */
export async function PATCH(_req: NextRequest, { params }: Params) {
  const authorized = await requireLocalPermission('documents.issue');
  if (!authorized) return NextResponse.json({ error: 'Permissão insuficiente para alterar documentos' }, { status: 403 });
  const { id } = await params;
  return NextResponse.json({ error: 'Documento oficial é imutável. Emita uma nova versão ou use a entrega protegida.' , documentId: id }, { status: 409 });
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const authorized = await requireLocalPermission('documents.issue');
  if (!authorized) return NextResponse.json({ error: 'Permissão insuficiente para excluir documentos' }, { status: 403 });
  const { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return NextResponse.json({ error: 'Documento inválido.' }, { status: 422 });

  const query = req.nextUrl.searchParams;
  const truthy = (value: string | null) => value === '1' || value?.toLowerCase() === 'true';
  const hard = truthy(query.get('hard'));
  const force = truthy(query.get('force'));

  // Sem `hard`: comportamento histórico — arquiva o snapshot preservando tudo.
  if (!hard) {
    const archived = await archiveOfficialDocument(id, authorized.access.id, `portal-document-archive:${id}:${Date.now()}`)
    if (!archived.ok) return NextResponse.json({ error: archived.error }, { status: archived.status })
    return NextResponse.json({ success: true, archived: true, documentId: id, document: archived.document });
  }

  if (!db) return NextResponse.json({ error: 'Banco de dados não disponível' }, { status: 500 });
  const [existing] = await db.select({ id: officialDocuments.id }).from(officialDocuments).where(eq(officialDocuments.id, id)).limit(1);
  if (!existing) return NextResponse.json({ error: 'Documento não encontrado' }, { status: 404 });

  const blockers = await documentPurgeCounts(id);
  if (blockers.attachments > 0 && !force) {
    return NextResponse.json({
      error: 'Este documento tem anexos vinculados. Confirme a exclusão definitiva para apagar tudo.',
      blockers,
      hint: 'Repita com force=1 para excluir o documento e os anexos, ou use o arquivamento para preservá-los.',
    }, { status: 409 });
  }

  try {
    const removed = await purgeDocumentRecord(id, { actorUserId: authorized.access.id, reason: 'portal-document-delete' });
    if (!removed.document) return NextResponse.json({ error: 'Documento não encontrado' }, { status: 404 });
    return NextResponse.json({ success: true, deleted: true, documentId: id, removed });
  } catch (error) {
    console.error('Falha ao excluir documento', error);
    return NextResponse.json({ error: 'Não foi possível excluir o documento; nada foi apagado.' }, { status: 500 });
  }
}
