import { NextRequest, NextResponse } from 'next/server'
import { and, asc, eq, isNull } from 'drizzle-orm'
import { clients, clientAddresses, contacts, db } from '@/db'
import { normalizeCrmInput } from '@/lib/crm-profile'
import { requireLocalPermission } from '@/lib/require-local-permission'

class ContactUnavailableError extends Error {}
export async function GET(request: Request) {
  const auth = await requireLocalPermission('crm.read')
  if (!auth) return NextResponse.json({ error: 'Permissão insuficiente' }, { status: 403 })
  if (!db) return NextResponse.json({ error: 'Banco indisponível' }, { status: 503 })
  const archived = new URL(request.url).searchParams.get('archived') === 'true'
  const rows = await db.select().from(clients).where(eq(clients.isActive, !archived)).orderBy(asc(clients.name))
  return NextResponse.json({ success: true, clients: rows })
}

export async function POST(req: NextRequest) {
  try {
    const authorized = await requireLocalPermission('crm.write');
    if (!authorized) return NextResponse.json({ error: 'Permissão insuficiente para editar CRM' }, { status: 403 });
    const user = authorized.access;

    const body = await req.json();
    const { name, type, phone, document, email, contactPerson, contactId, notes, source, recurrence, customerSince, lastContactAt, nextVisitAt, street, number, complement, neighborhood, city, state, referencePoint, serviceAccessNotes } = body;
    let crm;
    try { crm = normalizeCrmInput({ type, source, recurrence, customerSince, lastContactAt, nextVisitAt, notes }); }
    catch { return NextResponse.json({ error: 'Dados de relacionamento CRM inválidos.' }, { status: 400 }); }

    if (!name || !phone) {
      return NextResponse.json({ error: 'Nome e telefone são obrigatórios' }, { status: 400 });
    }

    if (!db) {
      return NextResponse.json({ error: 'Banco de dados não disponível' }, { status: 500 });
    }

    if (contactId && (typeof contactId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(contactId))) return NextResponse.json({ error: 'Contato inválido.' }, { status: 422 });
    const linkedContact = contactId ? await db.select().from(contacts).where(eq(contacts.id, contactId)).limit(1) : [];
    if (contactId && (!linkedContact[0] || !linkedContact[0].isActive || linkedContact[0].clientId)) return NextResponse.json({ error: 'Contato não disponível.' }, { status: 422 });
    const normalizedPhone = phone.replace(/\D/g, '');

    const newClient = await db.transaction(async tx => {
    const [newClient] = await tx
      .insert(clients)
      .values({
        type: type || 'PF',
        name,
        phone,
        normalizedPhone,
        document: document || null,
        email: email || null,
        contactPerson: contactId ? null : (contactPerson || null),
        ...crm,
        createdById: user.id,
      })
      .returning();

    await tx.insert(clientAddresses).values({
      clientId: newClient.id,
      street: street || 'Endereço a confirmar',
      number: number || 'S/N',
      complement: complement || '',
      neighborhood: neighborhood || 'Niterói',
      city: city || 'Niterói',
      state: state || 'RJ',
      referencePoint: referencePoint || '',
      serviceAccessNotes: serviceAccessNotes || '',
      isMain: true,
    });

    if (contactId) {
      const claimed = await tx.update(contacts).set({ clientId: newClient.id, updatedAt: new Date() }).where(and(eq(contacts.id, contactId), eq(contacts.isActive, true), isNull(contacts.clientId))).returning({ id: contacts.id });
      if (claimed.length === 0) throw new ContactUnavailableError();
    }
    return newClient;
    });
    return NextResponse.json({ success: true, clientId: newClient.id }, { status: 201 });
  } catch (error: any) {
    if (error instanceof ContactUnavailableError) return NextResponse.json({ error: 'Contato já vinculado a outro cliente.' }, { status: 409 });
    console.error('Erro ao cadastrar cliente:', error);
    return NextResponse.json({ error: 'Falha interna ao salvar cliente.' }, { status: 500 });
  }
}
