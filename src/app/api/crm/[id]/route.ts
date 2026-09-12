import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db, clients, clientAddresses } from '@/db';
import { requireLocalPermission } from '../../../../lib/require-local-permission';

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const authorized = await requireLocalPermission('crm.write');
  if (!authorized) return NextResponse.json({ error: 'Permissão insuficiente para editar CRM' }, { status: 403 });
  if (!db) return NextResponse.json({ error: 'Banco de dados não disponível' }, { status: 500 });

  const { id } = await params;
  const body = await req.json();
  const { name, type, phone, document, email, contactPerson, notes, street, number, complement, neighborhood, city, state, referencePoint, serviceAccessNotes } = body;
  if (!name || !phone) return NextResponse.json({ error: 'Nome e telefone são obrigatórios' }, { status: 400 });

  const [updated] = await db.update(clients).set({
    type: type || 'PF',
    name,
    phone,
    normalizedPhone: String(phone).replace(/\D/g, ''),
    document: document || null,
    email: email || null,
    contactPerson: contactPerson || null,
    notes: notes || null,
    updatedAt: new Date(),
  }).where(eq(clients.id, id)).returning();

  if (!updated) return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 });

  const existingAddress = await db.select().from(clientAddresses).where(eq(clientAddresses.clientId, id)).limit(1);
  const addressPayload = {
    street: street || 'Endereço a confirmar',
    number: number || 'S/N',
    complement: complement || '',
    neighborhood: neighborhood || 'Niterói',
    city: city || 'Niterói',
    state: state || 'RJ',
    referencePoint: referencePoint || '',
    serviceAccessNotes: serviceAccessNotes || '',
    updatedAt: new Date(),
  };
  if (existingAddress.length > 0) {
    await db.update(clientAddresses).set(addressPayload).where(eq(clientAddresses.id, existingAddress[0].id));
  } else {
    await db.insert(clientAddresses).values({ clientId: id, ...addressPayload, isMain: true });
  }

  return NextResponse.json({ success: true, clientId: id });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const authorized = await requireLocalPermission('crm.write');
  if (!authorized) return NextResponse.json({ error: 'Permissão insuficiente para arquivar cliente' }, { status: 403 });
  if (!db) return NextResponse.json({ error: 'Banco de dados não disponível' }, { status: 500 });
  const { id } = await params;
  const [archived] = await db.update(clients).set({ isActive: false, updatedAt: new Date() }).where(eq(clients.id, id)).returning({ id: clients.id });
  if (!archived) return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 });
  return NextResponse.json({ success: true, archived: true, clientId: id });
}
