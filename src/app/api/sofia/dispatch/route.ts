import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { eq } from 'drizzle-orm';
import { db, sofiaEvents, clients, clientAddresses, serviceRequests, REQUEST_STATUS, CLIENT_SOURCES, LEAD_STATUS } from '../../../../db';
import { SofiaDispatchSchema } from '../../../../lib/validation/sofia';
import { VERSION } from '../../../../lib/version';

const RAFAEL_PHONE = '5521996699191';

function normalizePhone(raw: string): string {
  return raw.replace(/\D/g, '');
}

function isTimingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a, 'utf8'), Buffer.from(b, 'utf8'));
}

function validateBearer(req: NextRequest): { valid: boolean; status: number; error?: string } {
  const secret = process.env.SOFIA_HUB_SECRET;
  if (!secret) {
    return { valid: false, status: 503, error: 'Endpoint não configurado. SOFIA_HUB_SECRET ausente.' };
  }

  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { valid: false, status: 401, error: 'Authorization Bearer obrigatório.' };
  }

  const token = authHeader.slice(7);
  if (!isTimingSafeEqual(token, secret)) {
    return { valid: false, status: 401, error: 'Token inválido.' };
  }

  return { valid: true, status: 200 };
}

export async function POST(req: NextRequest) {
  const correlationId = req.headers.get('idempotency-key') || req.headers.get('x-correlation-id') || '';

  try {
    // 1. Validação do Bearer token (timing-safe)
    const auth = validateBearer(req);
    if (!auth.valid) {
      return NextResponse.json(
        { error: auth.error },
        {
          status: auth.status,
          headers: { 'X-Hub-Version': VERSION, ...(correlationId ? { 'X-Correlation-Id': correlationId } : {}) },
        }
      );
    }

    // 2. Validação de Idempotency-Key ou X-Correlation-Id
    if (!correlationId) {
      return NextResponse.json(
        { error: 'Header Idempotency-Key ou X-Correlation-Id é obrigatório.' },
        { status: 400, headers: { 'X-Hub-Version': VERSION } }
      );
    }

    // 3. Fail-closed: banco obrigatório em produção
    if (!db) {
      if (process.env.NODE_ENV === 'production') {
        return NextResponse.json(
          { error: 'Banco de dados indisponível. Rascunho não pode ser registrado sem persistência.' },
          { status: 503, headers: { 'X-Hub-Version': VERSION, 'X-Correlation-Id': correlationId } }
        );
      }
      // DEV-ONLY: contingência local sem banco
      console.warn('[DEV-ONLY] Sofia dispatch sem banco conectado. Rascunho não persistido.');
      return NextResponse.json(
        {
          success: true,
          devOnly: true,
          message: '[DEV] Rascunho recebido em modo de desenvolvimento (não persistido).',
          idempotencyKey: correlationId,
          draftUrl: '/portal/sofia-drafts',
        },
        { headers: { 'X-Hub-Version': VERSION, 'X-Correlation-Id': correlationId } }
      );
    }

    const rawBody = await req.json().catch(() => null);
    if (!rawBody) {
      return NextResponse.json(
        { error: 'Payload JSON inválido.' },
        { status: 400, headers: { 'X-Hub-Version': VERSION, 'X-Correlation-Id': correlationId } }
      );
    }

    // 4. Validação do Schema com Zod
    const validation = SofiaDispatchSchema.safeParse(rawBody);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Payload em formato incompatível.', details: validation.error.format() },
        { status: 422, headers: { 'X-Hub-Version': VERSION, 'X-Correlation-Id': correlationId } }
      );
    }

    const payload = validation.data;

    // 5. Validação exata do senderPhone (Rafael autorizado)
    const normalizedSender = normalizePhone(payload.senderPhone);
    if (normalizedSender !== RAFAEL_PHONE) {
      return NextResponse.json(
        { error: 'Apenas comandos disparados pelo número autorizado do Rafael são aceitos.' },
        { status: 403, headers: { 'X-Hub-Version': VERSION, 'X-Correlation-Id': correlationId } }
      );
    }

    // 6. Verificação de Idempotência no Banco
    const existingEvents = await db
      .select()
      .from(sofiaEvents)
      .where(eq(sofiaEvents.idempotencyKey, correlationId))
      .limit(1);

    if (existingEvents.length > 0) {
      return NextResponse.json(
        {
          success: true,
          alreadyProcessed: true,
          eventId: existingEvents[0].id,
          createdRequestId: existingEvents[0].createdRequestId,
          idempotencyKey: correlationId,
          message: 'Esta requisição já foi processada anteriormente.',
        },
        { headers: { 'X-Hub-Version': VERSION, 'X-Correlation-Id': correlationId } }
      );
    }

    // 7. Normalização e Vínculo de Cliente / Endereço
    const clientPhone = payload.customerPhone || payload.senderPhone;
    const normalizedClientPhone = normalizePhone(clientPhone);

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

    // 8. Geração do Código do Chamado & Criação da Solicitação Rascunho
    const year = new Date().getFullYear();
    const randomCode = Math.floor(1000 + Math.random() * 9000);
    const requestCode = `OS-${year}-${randomCode}`;

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
        customerNotes: 'Rascunho capturado pela Sofia no WhatsApp.',
      })
      .returning();

    // 9. Registro do Evento da Sofia no Log de Auditoria
    const [event] = await db
      .insert(sofiaEvents)
      .values({
        senderPhone: payload.senderPhone,
        idempotencyKey: correlationId,
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
        idempotencyKey: correlationId,
        draftUrl: `/portal/sofia-drafts?id=${newRequest.id}`,
      },
      { status: 201, headers: { 'X-Hub-Version': VERSION, 'X-Correlation-Id': correlationId } }
    );
  } catch (error: unknown) {
    console.error('Erro no dispatch da Sofia:', error);
    return NextResponse.json(
      { error: 'Falha interna ao registrar rascunho da Sofia.' },
      { status: 500, headers: { 'X-Hub-Version': VERSION, ...(correlationId ? { 'X-Correlation-Id': correlationId } : {}) } }
    );
  }
}
