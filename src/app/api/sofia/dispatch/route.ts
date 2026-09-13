import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { eq } from 'drizzle-orm';
import { db, sofiaEvents, sofiaDrafts, SOFIA_DRAFT_STATUS } from '../../../../db';
import { SofiaDispatchSchema } from '../../../../lib/validation/sofia';
import { VERSION } from '../../../../lib/version';

const SOFIA_ALLOWED_DISPATCH_ROLES = ['hub_owner', 'hub_admin', 'hub_operator'];

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
  let payloadBody: any = null;
  const correlationIdFromHeader = req.headers.get('idempotency-key') || req.headers.get('x-correlation-id') || '';

  try {
    // 1. Validação do Bearer token (timing-safe)
    const auth = validateBearer(req);
    if (!auth.valid) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status, headers: { 'X-Hub-Version': VERSION } }
      );
    }

    // Fail-closed: banco obrigatório
    if (!db) {
      return NextResponse.json(
        { error: 'Banco de dados indisponível.' },
        { status: 503, headers: { 'X-Hub-Version': VERSION } }
      );
    }

    payloadBody = await req.json().catch(() => null);
    if (!payloadBody) {
      return NextResponse.json(
        { error: 'Payload JSON inválido.' },
        { status: 400, headers: { 'X-Hub-Version': VERSION } }
      );
    }

    // 2. Validação do Schema com Zod
    const validation = SofiaDispatchSchema.safeParse(payloadBody);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Payload em formato incompatível.', details: validation.error.format() },
        { status: 422, headers: { 'X-Hub-Version': VERSION } }
      );
    }

    const payload = validation.data;
    const correlationId = payload.correlationId || correlationIdFromHeader;

    if (!correlationId) {
      return NextResponse.json(
        { error: 'correlationId é obrigatório no payload ou via header.' },
        { status: 400, headers: { 'X-Hub-Version': VERSION } }
      );
    }

    // 3. Comparar centralHubId com RRD_HUB_ID
    const expectedHubId = process.env.RRD_HUB_ID || '00000000-0000-0000-0000-000000000000'; // Define fallback if not in env para testes
    if (payload.centralHubId !== expectedHubId) {
      return NextResponse.json(
        { error: 'Central Hub ID não autorizado para este tenant.' },
        { status: 403, headers: { 'X-Hub-Version': VERSION, 'X-Correlation-Id': correlationId } }
      );
    }

    // 4. Autorizar pela role central
    if (!SOFIA_ALLOWED_DISPATCH_ROLES.includes(payload.centralRole)) {
      return NextResponse.json(
        { error: 'Papel central não autorizado para disparar rascunhos.' },
        { status: 403, headers: { 'X-Hub-Version': VERSION, 'X-Correlation-Id': correlationId } }
      );
    }

    // 5. Verificar Idempotência em sofiaDrafts
    const existingDraft = await db
      .select()
      .from(sofiaDrafts)
      .where(eq(sofiaDrafts.correlationId, correlationId))
      .limit(1);

    if (existingDraft.length > 0) {
      const draft = existingDraft[0];
      return NextResponse.json(
        {
          success: true,
          alreadyProcessed: true,
          draftId: draft.id,
          idempotencyKey: correlationId,
          draftUrl: `/portal/sofia-drafts?id=${draft.id}`,
          pendingFields: draft.pendingFields,
          nextAction: draft.status === SOFIA_DRAFT_STATUS.COLLECTING ? 'collect_missing_fields' : 'none',
        },
        { status: draft.status === SOFIA_DRAFT_STATUS.COLLECTING ? 202 : 200, headers: { 'X-Hub-Version': VERSION, 'X-Correlation-Id': correlationId } }
      );
    }

    // 6. Calcular campos pendentes
    const pendingFields: Array<{ field: string; label: string; requiredFor: string }> = [];
    
    if (!payload.customerName) {
      pendingFields.push({ field: 'customer.name', label: 'Nome do cliente', requiredFor: 'service_request' });
    }
    if (!payload.address?.street) {
      pendingFields.push({ field: 'address.street', label: 'Logradouro', requiredFor: 'service_request' });
    }
    if (!payload.address?.number) {
      pendingFields.push({ field: 'address.number', label: 'Número', requiredFor: 'service_request' });
    }
    if (!payload.address?.neighborhood) {
      pendingFields.push({ field: 'address.neighborhood', label: 'Bairro', requiredFor: 'service_request' });
    }
    if (!payload.problemReported) {
      pendingFields.push({ field: 'service.problemReported', label: 'Problema relatado', requiredFor: 'service_request' });
    }

    const draftStatus = pendingFields.length > 0 ? SOFIA_DRAFT_STATUS.COLLECTING : SOFIA_DRAFT_STATUS.PENDING_REVIEW;

    // 7. Persistir evento em sofiaEvents para auditoria (imutável)
    const [event] = await db
      .insert(sofiaEvents)
      .values({
        senderPhone: payload.senderPhone,
        idempotencyKey: correlationId,
        rawPayload: payloadBody,
        intentDetected: payload.intentDetected,
        status: draftStatus, // O status no evento reflete o status de criação inicial
      })
      .returning();

    // 8. Salvar em sofiaDrafts
    const [newDraft] = await db
      .insert(sofiaDrafts)
      .values({
        correlationId: correlationId,
        centralContactId: payload.centralContactId,
        centralClientId: payload.centralClientId,
        centralHubId: payload.centralHubId,
        centralRole: payload.centralRole,
        senderPhone: payload.senderPhone,
        intent: payload.intentDetected,
        status: draftStatus,
        draftPayload: payload,
        pendingFields: pendingFields,
        conversationSummary: payload.conversationSummary || null,
        sourceEventId: event.id,
      })
      .returning();

    // 9. Retornar 202 ou 201
    const statusCode = draftStatus === SOFIA_DRAFT_STATUS.COLLECTING ? 202 : 201;

    return NextResponse.json(
      {
        success: true,
        message: draftStatus === SOFIA_DRAFT_STATUS.COLLECTING 
          ? 'Rascunho recebido, aguardando campos obrigatórios.' 
          : 'Rascunho completo, aguardando revisão humana.',
        draftId: newDraft.id,
        idempotencyKey: correlationId,
        draftUrl: `/portal/sofia-drafts?id=${newDraft.id}`,
        pendingFields,
        nextAction: draftStatus === SOFIA_DRAFT_STATUS.COLLECTING ? 'collect_missing_fields' : 'none',
      },
      { status: statusCode, headers: { 'X-Hub-Version': VERSION, 'X-Correlation-Id': correlationId } }
    );
  } catch (error: unknown) {
    console.error('Erro no dispatch da Sofia:', error);
    return NextResponse.json(
      { error: 'Falha interna ao processar requisição.' },
      { status: 500, headers: { 'X-Hub-Version': VERSION } }
    );
  }
}
