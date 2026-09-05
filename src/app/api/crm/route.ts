import { NextRequest, NextResponse } from 'next/server';
import { db, clients, clientAddresses } from '../../../db';
import { getSessionUser } from '../../../lib/auth';

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await req.json();
    const { name, type, phone, document, email, contactPerson, notes, street, number, complement, neighborhood, city, state, referencePoint, serviceAccessNotes } = body;

    if (!name || !phone) {
      return NextResponse.json({ error: 'Nome e telefone são obrigatórios' }, { status: 400 });
    }

    if (!db) {
      return NextResponse.json({ error: 'Banco de dados não disponível' }, { status: 500 });
    }

    const normalizedPhone = phone.replace(/\D/g, '');

    const [newClient] = await db
      .insert(clients)
      .values({
        type: type || 'PF',
        name,
        phone,
        normalizedPhone,
        document: document || null,
        email: email || null,
        contactPerson: contactPerson || null,
        notes: notes || null,
        createdById: user.id,
      })
      .returning();

    await db.insert(clientAddresses).values({
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

    return NextResponse.json({ success: true, clientId: newClient.id }, { status: 201 });
  } catch (error: any) {
    console.error('Erro ao cadastrar cliente:', error);
    return NextResponse.json({ error: 'Falha interna ao salvar cliente.' }, { status: 500 });
  }
}
