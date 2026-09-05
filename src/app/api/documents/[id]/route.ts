import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db, officialDocuments, attachments } from '@/db';
import { getSessionUser } from '@/lib/auth';

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  if (!db) return NextResponse.json({ error: 'Banco de dados não disponível' }, { status: 500 });
  const { id } = await params;
  const body = await req.json();
  const [updated] = await db.update(officialDocuments).set({
    status: body.status || 'EMITIDO',
    paymentMethod: body.paymentMethod || undefined,
    warrantyTerms: body.warrantyTerms ?? undefined,
    technicalNotes: body.technicalNotes ?? undefined,
    sentAt: body.status === 'ENVIADO' ? new Date() : undefined,
    updatedAt: new Date(),
  }).where(eq(officialDocuments.id, id)).returning({ id: officialDocuments.id });
  if (!updated) return NextResponse.json({ error: 'Documento não encontrado' }, { status: 404 });
  return NextResponse.json({ success: true, documentId: id });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  if (!db) return NextResponse.json({ error: 'Banco de dados não disponível' }, { status: 500 });
  const { id } = await params;
  await db.delete(attachments).where(eq(attachments.documentId, id));
  const deleted = await db.delete(officialDocuments).where(eq(officialDocuments.id, id)).returning({ id: officialDocuments.id });
  if (deleted.length === 0) return NextResponse.json({ error: 'Documento não encontrado' }, { status: 404 });
  return NextResponse.json({ success: true });
}
