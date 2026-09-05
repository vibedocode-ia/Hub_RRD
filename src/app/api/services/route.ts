import { NextRequest, NextResponse } from 'next/server';
import { asc } from 'drizzle-orm';
import { db, serviceCatalog } from '@/db';
import { getSessionUser } from '@/lib/auth';

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  if (!db) return NextResponse.json({ error: 'Banco de dados não disponível' }, { status: 500 });
  const rows = await db.select().from(serviceCatalog).orderBy(asc(serviceCatalog.displayOrder), asc(serviceCatalog.name));
  return NextResponse.json({ success: true, services: rows });
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  if (!['SUPER_ADMIN', 'ADMIN'].includes(user.role)) return NextResponse.json({ error: 'Permissão insuficiente' }, { status: 403 });
  if (!db) return NextResponse.json({ error: 'Banco de dados não disponível' }, { status: 500 });
  const body = await req.json();
  if (!body.name) return NextResponse.json({ error: 'Nome do serviço é obrigatório.' }, { status: 400 });
  const [created] = await db.insert(serviceCatalog).values({
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
  }).returning();
  return NextResponse.json({ success: true, service: created }, { status: 201 });
}
