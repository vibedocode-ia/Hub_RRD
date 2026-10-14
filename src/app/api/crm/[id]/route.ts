import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db, clients, clientAddresses, contacts } from '@/db';
import { requireLocalPermission } from '../../../../lib/require-local-permission';
import { normalizeCrmInput } from '../../../../lib/crm-profile';

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const authorized = await requireLocalPermission('crm.write');
  if (!authorized) return NextResponse.json({ error: 'Permissão insuficiente para editar CRM' }, { status: 403 });
  if (!db) return NextResponse.json({ error: 'Banco de dados não disponível' }, { status: 500 });

  const { id } = await params;
  const parsed = await req.json().catch(() => null);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return NextResponse.json({ error: 'Dados inválidos.' }, { status: 422 });
  const { name, type, phone, document, email, contactPerson, contactId, notes, source, recurrence, customerSince, lastContactAt, nextVisitAt, street, number, complement, neighborhood, city, state, referencePoint, serviceAccessNotes } = parsed as Record<string, any>;
  let crm;
  try { crm = normalizeCrmInput({ type, source, recurrence, customerSince, lastContactAt, nextVisitAt, notes }); }
  catch { return NextResponse.json({ error: 'Dados de relacionamento CRM inválidos.' }, { status: 400 }); }
  if (!name || !phone) return NextResponse.json({ error: 'Nome e telefone são obrigatórios' }, { status: 400 });
  if (contactId !== undefined && contactId !== null && contactId !== '') {
    if (typeof contactId !== 'string' || !/^[0-9a-f-]{36}$/i.test(contactId)) return NextResponse.json({ error: 'Contato inválido.' }, { status: 422 });
    const [contact] = await db.select({ id: contacts.id, clientId: contacts.clientId, isActive: contacts.isActive }).from(contacts).where(eq(contacts.id, contactId)).limit(1);
    if (!contact || !contact.isActive || (contact.clientId && contact.clientId !== id)) return NextResponse.json({ error: 'Contato não disponível para este cliente.' }, { status: 422 });
  }
  const linkedContactId = contactId || null;
  const [updated] = await db.transaction(async tx => {
    const [client] = await tx.update(clients).set({ type: type || 'PF', name, phone, normalizedPhone: String(phone).replace(/\\D/g, ''), document: document || null, email: email || null, contactPerson: linkedContactId ? null : (contactPerson || null), ...crm, updatedAt: new Date() }).where(eq(clients.id, id)).returning();
    if (client) {
      const existingAddress = await tx.select().from(clientAddresses).where(eq(clientAddresses.clientId, id)).limit(1);
      const addressPayload = { street: street || 'Endereço a confirmar', number: number || 'S/N', complement: complement || '', neighborhood: neighborhood || 'Niterói', city: city || 'Niterói', state: state || 'RJ', referencePoint: referencePoint || '', serviceAccessNotes: serviceAccessNotes || '', updatedAt: new Date() };
      if (existingAddress.length > 0) await tx.update(clientAddresses).set(addressPayload).where(eq(clientAddresses.id, existingAddress[0].id));
      else await tx.insert(clientAddresses).values({ clientId: id, ...addressPayload, isMain: true });
      if (linkedContactId) {
        await tx.update(contacts).set({ clientId: null, updatedAt: new Date() }).where(eq(contacts.clientId, id));
        await tx.update(contacts).set({ clientId: id, updatedAt: new Date() }).where(eq(contacts.id, linkedContactId));
      } else if (contactId === '') await tx.update(contacts).set({ clientId: null, updatedAt: new Date() }).where(eq(contacts.clientId, id));
    }
    return [client];
  });

  if (!updated) return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 });
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
