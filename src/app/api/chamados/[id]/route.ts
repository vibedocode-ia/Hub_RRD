import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db, serviceRequests, officialDocuments, attachments, sofiaEvents } from '@/db';
import { getSessionUser } from '@/lib/auth';

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
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
  }).where(eq(serviceRequests.id, id)).returning();
  if (!updated) return NextResponse.json({ error: 'Chamado não encontrado' }, { status: 404 });
  return NextResponse.json({ success: true, requestId: id });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  if (!db) return NextResponse.json({ error: 'Banco de dados não disponível' }, { status: 500 });
  const { id } = await params;
  await db.delete(sofiaEvents).where(eq(sofiaEvents.createdRequestId, id));
  await db.delete(officialDocuments).where(eq(officialDocuments.serviceRequestId, id));
  await db.delete(attachments).where(eq(attachments.serviceRequestId, id));
  const deleted = await db.delete(serviceRequests).where(eq(serviceRequests.id, id)).returning({ id: serviceRequests.id });
  if (deleted.length === 0) return NextResponse.json({ error: 'Chamado não encontrado' }, { status: 404 });
  return NextResponse.json({ success: true });
}
