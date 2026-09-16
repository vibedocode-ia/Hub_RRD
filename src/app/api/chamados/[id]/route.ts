import { NextRequest, NextResponse } from 'next/server';
import { and, eq, isNull } from 'drizzle-orm';
import { db, serviceRequests, auditEvents } from '@/db';
import { requireLocalPermission } from '@/lib/require-local-permission';

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const authorized = await requireLocalPermission('operations.write');
  if (!authorized) return NextResponse.json({ error: 'Permissão insuficiente para editar chamado' }, { status: 403 });
  if (!db) return NextResponse.json({ error: 'Banco de dados não disponível' }, { status: 500 });
  const { id } = await params;
  const body = await req.json();
  const { serviceType, priority, problemReported, problemFound, status, totalAmount, paymentMethod, internalNotes, customerNotes, warrantyDays, cancelReason } = body;
  if (!problemReported) return NextResponse.json({ error: 'Descrição do problema é obrigatória.' }, { status: 400 });
  const [updated] = await db.update(serviceRequests).set({
    serviceType: serviceType || 'DESENTUPIMENTO',
    priority: priority || 'NORMAL',
    problemReported,
    problemFound: problemFound || null,
    status: status || 'AGENDADO',
    totalAmount: totalAmount || '0.00',
    paymentMethod: paymentMethod || 'Pix',
    internalNotes: internalNotes || null,
    customerNotes: customerNotes || null,
    warrantyDays: Number(warrantyDays || 30),
    cancelReason: cancelReason || null,
    updatedAt: new Date(),
  }).where(and(eq(serviceRequests.id, id), isNull(serviceRequests.archivedAt))).returning();
  if (!updated) return NextResponse.json({ error: 'Chamado não encontrado' }, { status: 404 });
  return NextResponse.json({ success: true, requestId: id });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const authorized = await requireLocalPermission('settings.manage');
  if (!authorized) return NextResponse.json({ error: 'Permissão administrativa obrigatória para arquivar chamado' }, { status: 403 });
  if (!db) return NextResponse.json({ error: 'Banco de dados não disponível' }, { status: 503 });
  const { id } = await params;

  const archiveResult = await db.transaction(async (tx) => {
    const [existing] = await tx.select({
      id: serviceRequests.id,
      status: serviceRequests.status,
      archivedAt: serviceRequests.archivedAt,
    }).from(serviceRequests).where(eq(serviceRequests.id, id));
    if (!existing) return { kind: 'missing' as const };
    if (existing.archivedAt) return { kind: 'already_archived' as const };

    const [request] = await tx.update(serviceRequests).set({
      archivedAt: new Date(),
      archivedById: authorized.access.id,
      updatedAt: new Date(),
    }).where(and(eq(serviceRequests.id, id), isNull(serviceRequests.archivedAt))).returning();
    if (!request) return { kind: 'already_archived' as const };

    await tx.insert(auditEvents).values({
      actorUserId: authorized.access.id,
      action: 'service_request.archived',
      targetType: 'service_request',
      targetId: request.id,
      metadata: { previousStatus: existing.status },
    });
    return { kind: 'archived' as const };
  });

  if (archiveResult.kind === 'missing') return NextResponse.json({ error: 'Chamado não encontrado' }, { status: 404 });
  return NextResponse.json({ success: true, archived: archiveResult.kind === 'archived', alreadyArchived: archiveResult.kind === 'already_archived' });
}
