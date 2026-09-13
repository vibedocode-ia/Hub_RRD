import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db, serviceCatalog } from '@/db';
import { requireLocalPermission } from '@/lib/require-local-permission';

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const authorized = await requireLocalPermission('settings.manage');
  if (!authorized) return NextResponse.json({ error: 'Permissão insuficiente' }, { status: 403 });
  if (!db) return NextResponse.json({ error: 'Banco de dados não disponível' }, { status: 500 });
  const { id } = await params;
  const body = await req.json();
  if (!body.name) return NextResponse.json({ error: 'Nome do serviço é obrigatório.' }, { status: 400 });
  const [updated] = await db.update(serviceCatalog).set({
    name: body.name,
    category: body.category || 'DESENTUPIMENTO',
    description: body.description || '',
    basePrice: body.basePrice || '0.00',
    priceNotes: body.priceNotes || '',
    warrantyDays: Number(body.warrantyDays || 30),
    defaultDurationMinutes: Number(body.defaultDurationMinutes || 90),
    requiresInspection: Boolean(body.requiresInspection),
    isEmergencyEligible: body.isEmergencyEligible !== false,
    status: body.status || 'ACTIVE',
    displayOrder: Number(body.displayOrder || 0),
    updatedAt: new Date(),
  }).where(eq(serviceCatalog.id, id)).returning();
  if (!updated) return NextResponse.json({ error: 'Serviço não encontrado.' }, { status: 404 });
  return NextResponse.json({ success: true, service: updated });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const authorized = await requireLocalPermission('settings.manage');
  if (!authorized) return NextResponse.json({ error: 'Permissão insuficiente' }, { status: 403 });
  if (!db) return NextResponse.json({ error: 'Banco de dados não disponível' }, { status: 500 });
  const { id } = await params;
  const [archived] = await db.update(serviceCatalog).set({ status: 'INACTIVE', updatedAt: new Date() }).where(eq(serviceCatalog.id, id)).returning({ id: serviceCatalog.id });
  if (!archived) return NextResponse.json({ error: 'Serviço não encontrado.' }, { status: 404 });
  return NextResponse.json({ success: true, archived: true });
}
