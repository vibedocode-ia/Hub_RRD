import { NextRequest, NextResponse } from 'next/server';
import { and, eq, isNull, or } from 'drizzle-orm';
import { db, clients, clientAddresses, contacts } from '@/db';
import { requireLocalPermission } from '../../../../lib/require-local-permission';
import { normalizeCrmInput } from '../../../../lib/crm-profile';
import { clientPurgeCounts, clientPurgeHasHistory, purgeClientRecords } from '../../../../lib/client-purge';

type Params = { params: Promise<{ id: string }> };
class ContactUnavailableError extends Error {}

export async function PATCH(req: NextRequest, { params }: Params) {
  const authorized = await requireLocalPermission('crm.write');
  if (!authorized) return NextResponse.json({ error: 'Permissão insuficiente para editar CRM' }, { status: 403 });
  if (!db) return NextResponse.json({ error: 'Banco de dados não disponível' }, { status: 500 });

  const { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return NextResponse.json({ error: 'Cliente inválido.' }, { status: 422 });
  const parsed = await req.json().catch(() => null);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return NextResponse.json({ error: 'Dados inválidos.' }, { status: 422 });
  if ('isActive' in parsed) {
    if (Object.keys(parsed).length !== 1 || parsed.isActive !== true) return NextResponse.json({ error: 'Use a ação de arquivar para desativar o cliente.' }, { status: 422 });
    const [client] = await db.update(clients).set({ isActive: true, updatedAt: new Date() }).where(eq(clients.id, id)).returning({ id: clients.id });
    return client ? NextResponse.json({ success: true, clientId: id }) : NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 });
  }
  const { name, type, phone, document, email, contactPerson, contactId, notes, source, recurrence, customerSince, lastContactAt, nextVisitAt, street, number, complement, neighborhood, city, state, referencePoint, serviceAccessNotes } = parsed as Record<string, any>;
  let crm;
  try { crm = normalizeCrmInput({ type, source, recurrence, customerSince, lastContactAt, nextVisitAt, notes }); }
  catch { return NextResponse.json({ error: 'Dados de relacionamento CRM inválidos.' }, { status: 400 }); }
  if (!name || !phone) return NextResponse.json({ error: 'Nome e telefone são obrigatórios' }, { status: 400 });
  if (contactId !== undefined && contactId !== null && contactId !== '') {
    if (typeof contactId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(contactId)) return NextResponse.json({ error: 'Contato inválido.' }, { status: 422 });
    const [contact] = await db.select({ id: contacts.id, clientId: contacts.clientId, isActive: contacts.isActive }).from(contacts).where(eq(contacts.id, contactId)).limit(1);
    if (!contact || !contact.isActive || (contact.clientId && contact.clientId !== id)) return NextResponse.json({ error: 'Contato não disponível para este cliente.' }, { status: 422 });
  }
  const linkedContactId = contactId || null;
  let updated;
  try {
    [updated] = await db.transaction(async tx => {
      const [client] = await tx.update(clients).set({ type: type || 'PF', name, phone, normalizedPhone: String(phone).replace(/\D/g, ''), document: document || null, email: email || null, ...(contactPerson !== undefined ? { contactPerson: contactPerson || null } : {}), ...crm, updatedAt: new Date() }).where(eq(clients.id, id)).returning();
      if (client) {
        const existingAddress = await tx.select().from(clientAddresses).where(eq(clientAddresses.clientId, id)).limit(1);
        const addressPayload = { street: street || 'Endereço a confirmar', number: number || 'S/N', complement: complement || '', neighborhood: neighborhood || 'Niterói', city: city || 'Niterói', state: state || 'RJ', referencePoint: referencePoint || '', serviceAccessNotes: serviceAccessNotes || '', updatedAt: new Date() };
        if (existingAddress.length > 0) await tx.update(clientAddresses).set(addressPayload).where(eq(clientAddresses.id, existingAddress[0].id));
        else await tx.insert(clientAddresses).values({ clientId: id, ...addressPayload, isMain: true });
        if (linkedContactId) {
          const claimed = await tx.update(contacts).set({ clientId: id, updatedAt: new Date() }).where(and(eq(contacts.id, linkedContactId), eq(contacts.isActive, true), or(isNull(contacts.clientId), eq(contacts.clientId, id)))).returning({ id: contacts.id });
          if (!claimed.length) throw new ContactUnavailableError();
        }
      }
      return [client];
    });
  } catch (error) {
    if (error instanceof ContactUnavailableError) return NextResponse.json({ error: 'Contato já vinculado a outro cliente.' }, { status: 409 });
    console.error('Falha ao editar cliente', error);
    return NextResponse.json({ error: 'Falha interna ao editar cliente.' }, { status: 500 });
  }

  if (!updated) return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 });
  return NextResponse.json({ success: true, clientId: id });
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const authorized = await requireLocalPermission('crm.write');
  if (!authorized) return NextResponse.json({ error: 'Permissão insuficiente para excluir cliente' }, { status: 403 });
  if (!db) return NextResponse.json({ error: 'Banco de dados não disponível' }, { status: 500 });
  const { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return NextResponse.json({ error: 'Cliente inválido.' }, { status: 422 });

  const query = req.nextUrl.searchParams;
  const truthy = (value: string | null) => value === '1' || value?.toLowerCase() === 'true';
  const hard = truthy(query.get('hard'));
  const force = truthy(query.get('force'));

  // Sem `hard`: comportamento histórico — apenas arquiva, preservando todo o histórico.
  if (!hard) {
    const [archived] = await db.update(clients).set({ isActive: false, updatedAt: new Date() }).where(eq(clients.id, id)).returning({ id: clients.id });
    if (!archived) return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 });
    return NextResponse.json({ success: true, archived: true, clientId: id });
  }

  const [existing] = await db.select({ id: clients.id, name: clients.name }).from(clients).where(eq(clients.id, id)).limit(1);
  if (!existing) return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 });

  const blockers = await clientPurgeCounts(id);
  if (clientPurgeHasHistory(blockers) && !force) {
    return NextResponse.json({
      error: 'Este cliente tem histórico vinculado (documentos, chamados, propostas ou anexos). Confirme a exclusão definitiva para apagar tudo.',
      blockers,
      hint: 'Repita com force=1 para excluir o histórico junto, ou use o arquivamento para preservá-lo.',
    }, { status: 409 });
  }

  try {
    const removed = await purgeClientRecords(id, { actorUserId: authorized.access.id, reason: 'portal-crm-delete' });
    if (!removed.client) return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 });
    return NextResponse.json({ success: true, deleted: true, clientId: id, removed });
  } catch (error) {
    console.error('Falha ao excluir cliente', error);
    return NextResponse.json({ error: 'Não foi possível excluir o cliente; nada foi apagado.' }, { status: 500 });
  }
}
