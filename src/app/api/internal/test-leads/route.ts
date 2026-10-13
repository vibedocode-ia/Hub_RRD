import { randomUUID } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { and, desc, eq, isNotNull } from 'drizzle-orm'
import { auditEvents, db, leadAddresses, leads } from '@/db'
import { requireLocalPermission } from '@/lib/require-local-permission'
import {
  buildSyntheticTestLeadAddress,
  buildSyntheticTestLeadIdentity,
  findUntrustedTestLeadFields,
  isUuidLike,
  sanitizeTestLeadListItem,
  TEST_LEAD_NOTE,
} from '@/lib/test-lead-identity'

/**
 * Rota INTERNA (admin-only) de dado de teste do modulo comercial.
 *
 * Cria um Lead explicitamente sintético, isolado por `leads.test_run_id`, para
 * permitir um E2E de ponta a ponta sem jamais tocar dado real:
 *
 *   - exige a permissao `settings.manage` (fail-closed);
 *   - o corpo da requisicao NAO e confiavel: testRunId, telefone, documento,
 *     nome, normalized* e afins sao gerados no servidor (randomUUID()) e
 *     qualquer tentativa de envia-los responde 422;
 *   - documento sempre nulo, sourceChannel INTERNAL_TEST, status NEW;
 *   - nome "TESTE E2E <run id curto>", telefone no namespace alfabético
 *     não discável TEST: (nenhum dígito, nem após normalização);
 *   - lead + endereco ficticio + evento de auditoria GENERICA em uma unica
 *     transacao;
 *   - a auditoria de teste NAO vai para `lead_audit_events` (append-only, FK
 *     NOT NULL + ON DELETE cascade: um evento ali poluiria a trilha real e o
 *     DELETE do lead arrastaria o evento junto). O registro sintético entra em
 *     `audit_events` (target_id ANULAVEL, sem FK para `leads`), acao
 *     `lead.test_created`, com metadata { testRunId, synthetic, sourceChannel }
 *     — apenas IDs/flags sintéticos, sem PII — para que o runId da execucao de
 *     teste continue recuperavel mesmo depois da purga do lead;
 *   - resposta sem PII: apenas runId e leadId.
 *
 * O GET lista SOMENTE leads de sessao de teste (test_run_id preenchido) e
 * devolve apenas id, runId, status e createdAt.
 *
 * A purga controlada (DELETE) vive em uma etapa separada e nao esta aqui.
 */

const MAX_LIST = 200

const readJsonBody = async (req: NextRequest): Promise<unknown> => {
  const raw = await req.text().catch(() => '')
  if (!raw.trim()) return {}
  try {
    return JSON.parse(raw) as unknown
  } catch {
    return null
  }
}

export async function GET(req: NextRequest) {
  const authorized = await requireLocalPermission('settings.manage')
  if (!authorized) return NextResponse.json({ error: 'Permissão insuficiente' }, { status: 403 })
  if (!db) return NextResponse.json({ error: 'Banco indisponível' }, { status: 503 })

  const runIdFilter = (new URL(req.url).searchParams.get('runId') ?? '').trim()
  if (runIdFilter && !isUuidLike(runIdFilter)) {
    return NextResponse.json({ error: 'runId inválido.' }, { status: 422 })
  }

  const scope = isNotNull(leads.testRunId)
  const rows = await db
    .select({
      id: leads.id,
      testRunId: leads.testRunId,
      status: leads.status,
      createdAt: leads.createdAt,
    })
    .from(leads)
    .where(runIdFilter ? and(scope, eq(leads.testRunId, runIdFilter)) : scope)
    .orderBy(desc(leads.createdAt))
    .limit(MAX_LIST)

  return NextResponse.json({ success: true, leads: rows.map(sanitizeTestLeadListItem) })
}

export async function POST(req: NextRequest) {
  const authorized = await requireLocalPermission('settings.manage')
  if (!authorized) return NextResponse.json({ error: 'Permissão insuficiente' }, { status: 403 })
  if (!db) return NextResponse.json({ error: 'Banco indisponível' }, { status: 503 })

  const payload = await readJsonBody(req)
  if (payload === null || typeof payload !== 'object' || Array.isArray(payload)) {
    return NextResponse.json({ error: 'Corpo inválido: envie POST sem dados de Lead.' }, { status: 422 })
  }

  const untrusted = findUntrustedTestLeadFields(payload)
  if (untrusted.length > 0) {
    return NextResponse.json(
      {
        error:
          `Campos não aceitos nesta rota (gerados no servidor): ${untrusted.join(', ')}. ` +
          'O Lead de teste é sintético e não recebe dado real de pessoa.',
      },
      { status: 422 },
    )
  }

  const runId = randomUUID()
  const leadId = randomUUID()
  const identity = buildSyntheticTestLeadIdentity(runId, leadId)
  const address = buildSyntheticTestLeadAddress()

  try {
    await db.transaction(async (tx) => {
      await tx.insert(leads).values({
        id: leadId,
        name: identity.name,
        phone: identity.phone,
        normalizedPhone: identity.normalizedPhone,
        email: null,
        document: null,
        normalizedDocument: null,
        sourceChannel: identity.sourceChannel,
        status: identity.status,
        notes: TEST_LEAD_NOTE,
        testRunId: runId,
        createdById: authorized.access.id,
      })

      await tx.insert(leadAddresses).values({
        leadId,
        street: address.street,
        number: address.number,
        complement: address.complement,
        neighborhood: address.neighborhood,
        city: address.city,
        state: address.state,
        zipCode: address.zipCode,
        referencePoint: address.referencePoint,
        propertyType: address.propertyType,
        isMain: true,
      })

      // Auditoria do dado de teste: trilha GENERICA `audit_events`, nunca
      // `lead_audit_events` (append-only). `audit_events` nao tem FK para
      // `leads` e tem target_id ANULAVEL, entao o evento nunca e arrastado por
      // cascade ao purgar o lead. O runId fica no metadata (so IDs/flags
      // sinteticos, sem PII) para recuperar a execucao de teste.
      await tx.insert(auditEvents).values({
        actorUserId: authorized.access.id,
        action: 'lead.test_created',
        targetType: 'lead',
        targetId: null,
        metadata: {
          testRunId: runId,
          synthetic: true,
          sourceChannel: identity.sourceChannel,
        },
      })
    })

    // Sem PII na resposta: apenas o escopo da sessao de teste e o id do Lead.
    return NextResponse.json({ success: true, runId, leadId }, { status: 201 })
  } catch (error: any) {
    if (error?.code === '23505') {
      return NextResponse.json(
        { error: 'Colisão de identificador sintético. Repita a operação.' },
        { status: 409 },
      )
    }
    console.error('Falha ao criar Lead de teste', error)
    return NextResponse.json({ error: 'Falha interna ao criar Lead de teste.' }, { status: 500 })
  }
}
