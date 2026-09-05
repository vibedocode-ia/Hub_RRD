import { NextRequest, NextResponse } from 'next/server';
import { db, serviceRequests, clients, clientAddresses, REQUEST_STATUS, LEAD_STATUS } from '../../../db';
import { getSessionUser } from '../../../lib/auth';

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await req.json();
    const { clientId, addressId, serviceType, priority, problemReported, totalAmount, internalNotes } = body;

    if (!clientId || !addressId || !problemReported) {
      return NextResponse.json({ error: 'Informe o cliente, o endereço e a descrição do problema.' }, { status: 400 });
    }

    if (!db) {
      return NextResponse.json({ error: 'Banco de dados não disponível' }, { status: 500 });
    }

    const randomCode = Math.floor(1000 + Math.random() * 9000);
    const requestCode = `OS-2026-${randomCode}`;

    const [newRequest] = await db
      .insert(serviceRequests)
      .values({
        code: requestCode,
        clientId,
        addressId,
        sourceChannel: 'PORTAL_MANUAL',
        leadStatus: LEAD_STATUS.NOVO,
        priority: priority || 'NORMAL',
        serviceType: serviceType || 'DESENTUPIMENTO',
        problemReported,
        status: REQUEST_STATUS.AGENDADO,
        totalAmount: totalAmount || '0.00',
        internalNotes: internalNotes || null,
      })
      .returning();

    return NextResponse.json({ success: true, requestId: newRequest.id, code: newRequest.code }, { status: 201 });
  } catch (error: any) {
    console.error('Erro ao cadastrar chamado:', error);
    return NextResponse.json({ error: 'Falha interna ao criar chamado.' }, { status: 500 });
  }
}
