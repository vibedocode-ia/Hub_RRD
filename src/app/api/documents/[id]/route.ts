import { NextRequest, NextResponse } from 'next/server';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { db, officialDocuments, serviceRequests } from '@/db';
import { requireLocalPermission } from '@/lib/require-local-permission';

type Params = { params: Promise<{ id: string }> };
const hasActiveRequest = sql`exists (select 1 from ${serviceRequests} where ${serviceRequests.id} = ${officialDocuments.serviceRequestId} and ${serviceRequests.archivedAt} is null)`;

export async function PATCH(req: NextRequest, { params }: Params) {
  const authorized = await requireLocalPermission('documents.issue');
  if (!authorized) return NextResponse.json({ error: 'Permissão insuficiente para alterar documentos' }, { status: 403 });
  if (!db) return NextResponse.json({ error: 'Banco de dados não disponível' }, { status: 500 });
  const { id } = await params;
  const body = await req.json();
  const active = await db.select({ id: officialDocuments.id }).from(officialDocuments).innerJoin(serviceRequests, eq(officialDocuments.serviceRequestId, serviceRequests.id)).where(and(eq(officialDocuments.id, id), isNull(serviceRequests.archivedAt))).limit(1);
  if (!active.length) return NextResponse.json({ error: 'Documento não encontrado ou chamado arquivado' }, { status: 404 });
  const [updated] = await db.update(officialDocuments).set({
    status: body.status || 'EMITIDO',
    paymentMethod: body.paymentMethod || undefined,
    warrantyTerms: body.warrantyTerms ?? undefined,
    technicalNotes: body.technicalNotes ?? undefined,
    sentAt: body.status === 'ENVIADO' ? new Date() : undefined,
    updatedAt: new Date(),
  }).where(and(eq(officialDocuments.id, id), hasActiveRequest)).returning({ id: officialDocuments.id });
  if (!updated) return NextResponse.json({ error: 'Documento não encontrado' }, { status: 404 });
  return NextResponse.json({ success: true, documentId: id });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const authorized = await requireLocalPermission('documents.issue');
  if (!authorized) return NextResponse.json({ error: 'Permissão insuficiente para arquivar documentos' }, { status: 403 });
  if (!db) return NextResponse.json({ error: 'Banco de dados não disponível' }, { status: 500 });
  const { id } = await params;
  const active = await db.select({ id: officialDocuments.id }).from(officialDocuments).innerJoin(serviceRequests, eq(officialDocuments.serviceRequestId, serviceRequests.id)).where(and(eq(officialDocuments.id, id), isNull(serviceRequests.archivedAt))).limit(1);
  if (!active.length) return NextResponse.json({ error: 'Documento não encontrado ou chamado arquivado' }, { status: 404 });
  const [archived] = await db.update(officialDocuments).set({ status: 'ARQUIVADO', updatedAt: new Date() }).where(and(eq(officialDocuments.id, id), hasActiveRequest)).returning({ id: officialDocuments.id });
  if (!archived) return NextResponse.json({ error: 'Documento não encontrado' }, { status: 404 });
  return NextResponse.json({ success: true, archived: true, documentId: id });
}
