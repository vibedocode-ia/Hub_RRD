import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db, sofiaEvents, clients, clientAddresses, serviceRequests, REQUEST_STATUS, CLIENT_SOURCES, LEAD_STATUS } from '../../../../db';
import { SofiaDispatchSchema } from '../../../../lib/validation/sofia';

export async function POST(req: NextRequest) {
  try {
    // 1. Validação do Secret Bearer Token
    const authHeader = req.headers.get('authorization');
    const expectedSecret = process.env.SOFIA_HUB_SECRET || 'sofia_rrd_secret_key_2026';
    if (!authHeader || !authHeader.startsWith('Bearer ') || authHeader.split(' ')[1] !== expectedSecret) {
      return NextResponse.json(
        { error: 'Acesso não autorizado ao endpoint da Sofia.' },
        { status: 401 }
      );
    }

    // 2. Validação da Idempotency-Key
    const idempotencyKey = req.headers.get('idempotency-key');
    if (!idempotencyKey) {
      return NextResponse.json(
        { error: 'Header Idempotency-Key é obrigatório para evitar duplicações.' },
        { status: 400 }
      );
    }

    const rawBody = await req.json().catch(() => null);
    if (!rawBody) {
      return NextResponse.json(
        { error: 'Payload JSON inválido.' },
        { status: 400 }
      );
    }

    // 3. Validação do Schema com Zod
    const validation = SofiaDispatchSchema.safeParse(rawBody);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Payload em formato incompatível.', details: validation.error.format() },
        { status: 422 }
      );
    }

    const payload = validation.data;

    // 4. Validação do Número do Remetente Autorizado (Rafael)
    const normalizedSender = payload.senderPhone.replace(/\D/g, '');
    if (!normalizedSender.includes('5521996699191') && normalizedSender !== '5521996699191') {
      return NextResponse.json(
        { error: 'Apenas comandos disparados pelo número autorizado do Rafael são aceitos.' },
        { status: 403 }
      );
    }

    if (!db) {
      return NextResponse.json({
        success: true,
        message: 'Rascunho recebido em modo de contingência.',
        idempotencyKey,
        draftUrl: '/portal/sofia-drafts',
      });
    }

    // 5. Verificação de Idempotência no Banco
    const existingEvents = await db
      .select()
      .from(sofiaEvents)
      .where(eq(sofiaEvents.idempotencyKey, idempotencyKey))
      .limit(1);

    if (existingEvents.length > 0) {
      return NextResponse.json({
        success: true,
        alreadyProcessed: true,
        eventId: existingEvents[0].id,
        createdRequestId: existingEvents[0].createdRequestId,
        message: 'Esta requisição já foi processada anteriormente.',
      });
    }

    // 6. Normalização e Vínculo de Cliente / Endereço
    const clientPhone = payload.customerPhone || payload.senderPhone;
    const normalizedClientPhone = clientPhone.replace(/\D/g, '');

    let clientId: string;
    let addressId: string;

    const existingClients = await db
      .select()
      .from(clients)
      .where(eq(clients.normalizedPhone, normalizedClientPhone))
      .limit(1);

    if (existingClients.length > 0) {
      clientId = existingClients[0].id;
      const addresses = await db
        .select()
        .from(clientAddresses)
        .where(eq(clientAddresses.clientId, clientId))
        .limit(1);

      if (addresses.length > 0) {
        addressId = addresses[0].id;
      } else {
        const [newAddr] = await db
          .insert(clientAddresses)
          .values({
            clientId,
            street: payload.address.street || 'Endereço a confirmar',
            number: payload.address.number || 'S/N',
            complement: payload.address.complement || '',
            neighborhood: payload.address.neighborhood || 'Centro',
            city: payload.address.city || 'Niterói',
            referencePoint: payload.address.referencePoint || '',
          })
          .returning();
        addressId = newAddr.id;
      }
    } else {
      const [newClient] = await db
        .insert(clients)
        .values({
          name: payload.customerName,
          phone: clientPhone,
          normalizedPhone: normalizedClientPhone,
          document: payload.customerDocument || null,
          source: CLIENT_SOURCES.WHATSAPP_SOFIA,
        })
        .returning();

      clientId = newClient.id;

      const [newAddr] = await db
        .insert(clientAddresses)
        .values({
          clientId,
          street: payload.address.street || 'Endereço a confirmar',
          number: payload.address.number || 'S/N',
          complement: payload.address.complement || '',
          neighborhood: payload.address.neighborhood || 'Centro',
          city: payload.address.city || 'Niterói',
          referencePoint: payload.address.referencePoint || '',
        })
        .returning();

      addressId = newAddr.id;
    }

    // 7. Geração do Código do Chamado & Criação da Solicitação Rascunho
    const randomCode = Math.floor(1000 + Math.random() * 9000);
    const requestCode = `OS-2026-${randomCode}`;

    const [newRequest] = await db
      .insert(serviceRequests)
      .values({
        code: requestCode,
        clientId,
        addressId,
        sourceChannel: CLIENT_SOURCES.WHATSAPP_SOFIA,
        leadStatus: LEAD_STATUS.NOVO,
        priority: payload.priority,
        serviceType: payload.serviceType,
        problemReported: payload.problemReported,
        status: REQUEST_STATUS.PENDING_REVIEW,
        totalAmount: payload.estimatedAmount || '0.00',
        customerNotes: `Rascunho capturado pela Sofia no WhatsApp.`,
      })
      .returning();

    // 8. Registro do Evento da Sofia no Log de Auditoria
    const [event] = await db
      .insert(sofiaEvents)
      .values({
        senderPhone: payload.senderPhone,
        idempotencyKey,
        rawPayload: rawBody,
        intentDetected: payload.intentDetected,
        status: 'PENDING_REVIEW',
        createdRequestId: newRequest.id,
      })
      .returning();

    return NextResponse.json(
      {
        success: true,
        message: 'Rascunho registrado com sucesso na fila de revisão do Hub RR.',
        requestId: newRequest.id,
        code: newRequest.code,
        eventId: event.id,
        draftUrl: `/portal/sofia-drafts?id=${newRequest.id}`,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Erro no dispatch da Sofia:', error);
    return NextResponse.json(
      { error: 'Falha interna ao registrar rascunho da Sofia.' },
      { status: 500 }
    );
  }
}
