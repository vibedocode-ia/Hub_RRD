import { NextRequest, NextResponse } from 'next/server';
import { and, eq, isNull, sql } from 'drizzle-orm'
import { archiveOfficialDocument } from '@/lib/official-document-lifecycle'

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

export async function DELETE(_req: NextRequest, { params }: Params) {
  const authorized = await requireLocalPermission('documents.issue');
  if (!authorized) return NextResponse.json({ error: 'Permissão insuficiente para arquivar documentos' }, { status: 403 });
  const { id } = await params;
  const archived = await archiveOfficialDocument(id, authorized.access.id, `portal-document-archive:${id}:${Date.now()}`)
  if (!archived.ok) return NextResponse.json({ error: archived.error }, { status: archived.status })
  return NextResponse.json({ success: true, archived: true, documentId: id, document: archived.document });
}
