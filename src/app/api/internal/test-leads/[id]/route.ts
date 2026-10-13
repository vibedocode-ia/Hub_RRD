import { NextRequest, NextResponse } from 'next/server'
import { and, eq, isNotNull, sql } from 'drizzle-orm'
import { auditEvents, db, leadAddresses, leads } from '@/db'
import { requireLocalPermission } from '@/lib/require-local-permission'
import { isUuidLike, sanitizeTestLeadListItem } from '@/lib/test-lead-identity'
import {
  TEST_LEAD_ADDRESS_PARENT_TABLE,
  TEST_LEAD_AUDIT_CHILD_TABLE,
  TEST_LEAD_LEAD_COLUMN,
  TEST_LEAD_PARENT_TABLE,
  TEST_LEAD_REFERENCED_PARENT_TABLES,
  classifyTestLeadCatalogReferences,
  classifyTestLeadReferences,
  isLeadAddresses,
  mapFkDeleteAction,
  planTestLeadAuditRetention,
  planTestLeadPurge,
  type TestLeadCatalogReference,
  type TestLeadFkFacts,
  type TestLeadReferenceSnapshot,
} from '@/lib/test-lead-lifecycle'

/**
 * Rota INTERNA (admin-only) de ITEM do dado de teste do modulo comercial.
 *
 * GET -> devolve SOMENTE a projecao sanitizada do item (id, runId, status,
 *        createdAt). Nenhum dado de pessoa (nome, telefone, documento,
 *        endereco) sai daqui; item sem marcador de sessao de teste responde
 *        404 em vez de expor o Lead comercial.
 *
 * DELETE -> purga controlada e fail-closed, escopada ao testRunId da sessao
 *        de teste:
 *
 *   - exige a permissao `settings.manage` (fail-closed);
 *   - exige id e testRunId explicitos, ambos no formato uuid; sem escopo de
 *     sessao nenhuma linha e removida;
 *   - trava a linha do Lead com LOCK FOR UPDATE e a rele dentro da transacao;
 *   - DESCOBRE as FKs no catalogo vivo do Postgres (pg_constraint) DIRIGIDA
 *     PELO PAI (`confrelid = to_regclass(<pai>)`), para cada tabela pai do
 *     modulo comercial (`TEST_LEAD_REFERENCED_PARENT_TABLES`: `leads` e
 *     `lead_addresses`). Nenhuma tabela filha e fixada: uma FK nova que aponte
 *     para um destes pais aparece sozinha na descoberta;
 *   - resolve o NOME da filha (pg_class.relname) e a COLUNA filha exata
 *     (`unnest(conkey)` + pg_attribute.attname) e classifica cada relacao
 *     contra a allowlist fechada (TEST_LEAD_KNOWN_CHILD_TABLES + coluna exata
 *     do pai). Tabela desconhecida, coluna que nao casa, FK composta ou acao
 *     de delecao fora do mapa entram como referencia NAO CLASSIFICADA e
 *     bloqueiam a purga, independente de contagem;
 *   - conta as referencias REAIS de todo filho conhecido nao-descartavel do
 *     Lead: lead_proposals, lead_documents, lead_service_requests (chamados
 *     comerciais) e lead_audit_events, alem do endereco e da auditoria
 *     generica apontando para ele;
 *   - decide a retencao da auditoria lendo o catalogo vivo (a FK real de
 *     `lead_audit_events` descoberta acima);
 *   - so autoriza quando o Lead pertence ao testRunId informado, ainda esta
 *     NEW, nunca virou cliente e NENHUMA referencia conta (nem sobra relacao
 *     nao classificada);
 *   - so entao descarta o endereco de teste (UNICA allowlist de DELETE,
 *     confirmada pelo catalogo) e a propria linha do Lead, na MESMA transacao;
 *   - NUNCA apaga nem reescreve linha de auditoria (nem `lead_audit_events`,
 *     nem `audit_events`) e nunca grava trilha nova;
 *   - resposta de sucesso traz apenas os identificadores.
 */

type Params = { params: Promise<{ id: string }> }

type TestLeadPurgeOutcome =
  | { outcome: 'not-found' }
  | { outcome: 'blocked'; blockers: string[] }
  | { outcome: 'purged'; removedAddresses: number }

/** Linha crua da descoberta de FKs no catalogo (pg_constraint). */
type CatalogFkRow = {
  childSchema?: unknown
  parentColumn?: unknown
  childTable?: unknown
  childColumn?: unknown
  childColumnNotNull?: unknown
  columnCount?: unknown
  onDelete?: unknown
}

/** Escopo da sessao de teste: query (?testRunId= / ?runId=) ou corpo JSON. */
const readTestRunId = async (req: NextRequest): Promise<string | null> => {
  const url = new URL(req.url)
  const fromQuery = (url.searchParams.get('testRunId') ?? url.searchParams.get('runId') ?? '').trim()
  if (fromQuery.length > 0) return fromQuery

  const raw = await req.text().catch(() => '')
  if (!raw.trim()) return null
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null
    const value = (parsed as Record<string, unknown>).testRunId
    return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null
  } catch {
    return null
  }
}

export async function GET(_req: NextRequest, { params }: Params) {
  const authorized = await requireLocalPermission('settings.manage')
  if (!authorized) return NextResponse.json({ error: 'Permissão insuficiente' }, { status: 403 })
  if (!db) return NextResponse.json({ error: 'Banco indisponível' }, { status: 503 })

  const { id } = await params
  if (!isUuidLike(id)) return NextResponse.json({ error: 'Lead inválido.' }, { status: 422 })

  const [row] = await db
    .select({
      id: leads.id,
      testRunId: leads.testRunId,
      status: leads.status,
      createdAt: leads.createdAt,
    })
    .from(leads)
    .where(and(eq(leads.id, id), isNotNull(leads.testRunId)))
    .limit(1)

  if (!row) return NextResponse.json({ error: 'Lead de teste não encontrado.' }, { status: 404 })

  return NextResponse.json({ success: true, lead: sanitizeTestLeadListItem(row) })
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const authorized = await requireLocalPermission('settings.manage')
  if (!authorized) return NextResponse.json({ error: 'Permissão insuficiente' }, { status: 403 })
  if (!db) return NextResponse.json({ error: 'Banco indisponível' }, { status: 503 })

  const { id } = await params
  if (!isUuidLike(id)) return NextResponse.json({ error: 'Lead inválido.' }, { status: 422 })

  const testRunId = await readTestRunId(req)
  if (testRunId === null) {
    return NextResponse.json(
      { error: 'testRunId é obrigatório (escopo da sessão de teste).' },
      { status: 422 },
    )
  }
  if (!isUuidLike(testRunId)) {
    return NextResponse.json({ error: 'testRunId inválido.' }, { status: 422 })
  }

  try {
    const result: TestLeadPurgeOutcome = await db.transaction(
      async (tx): Promise<TestLeadPurgeOutcome> => {
        // Uma mutacao por Lead: serializa a purga contra proposta/conversao.
        await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${id}))`)

        // Freeze inbound-FK DDL and generic audit writes during inventory/delete.
        // Row locks prevent FK inserts against either parent until commit.
        await tx.execute(sql`lock table leads, lead_addresses, audit_events in share row exclusive mode`)
        const lockedRows = await tx.execute(
          sql`select id, status, test_run_id as "testRunId", converted_client_id as "convertedClientId" from leads where id = ${id} for update`,
        )
        const lead = lockedRows[0] as
          | {
              id: string
              status: string
              testRunId: string | null
              convertedClientId: string | null
            }
          | undefined
        if (!lead) return { outcome: 'not-found' }
        await tx.execute(sql`select id from lead_addresses where lead_id = ${id} for update`)

        // Descoberta de FKs DIRIGIDA PELO PAI, uma consulta por tabela pai da
        // lista fechada. O catalogo vive: qualquer tabela que referencie
        // `leads` (ou `lead_addresses`) aparece aqui sem precisar de palpite.
        const discovered: (TestLeadCatalogReference & { childSchema: string; parentColumn: string })[] = []
        for (const parentTable of TEST_LEAD_REFERENCED_PARENT_TABLES) {
          const referenceRows = await tx.execute(sql`
            select
              namespace.nspname as "childSchema",
              parent_attribute.attname as "parentColumn",
              child.relname as "childTable",
              attribute.attname as "childColumn",
              attribute.attnotnull as "childColumnNotNull",
              c.conname as "constraintName",
              c.confdeltype as "onDelete",
              coalesce(array_length(c.conkey, 1), 0) as "columnCount"
            from pg_constraint c
            join pg_class child on child.oid = c.conrelid
            join pg_namespace namespace on namespace.oid = child.relnamespace
            join unnest(c.conkey) with ordinality as key_column(attnum, ordinality) on true
            join pg_attribute attribute
              on attribute.attrelid = c.conrelid and attribute.attnum = key_column.attnum
            join pg_attribute parent_attribute on parent_attribute.attrelid = c.confrelid and parent_attribute.attnum = c.confkey[key_column.ordinality]
            where c.contype = 'f'
              and c.confrelid = to_regclass(${parentTable})
            order by child.relname, key_column.ordinality
          `)

          for (const raw of referenceRows as unknown as CatalogFkRow[]) {
            discovered.push({
              parentTable,
              childSchema: String(raw.childSchema ?? ''),
              parentColumn: String(raw.parentColumn ?? ''),
              childTable: String(raw.childTable ?? ''),
              childColumn: String(raw.childColumn ?? ''),
              childColumnNotNull: Boolean(raw.childColumnNotNull),
              columnCount: Number(raw.columnCount ?? 0),
              onDelete: mapFkDeleteAction(raw.onDelete),
            })
          }
        }

        // Classificacao DETERMINISTICA contra a allowlist fechada: nenhuma
        // relacao desconhecida (tabela, coluna, FK composta ou onDelete fora do
        // mapa) pode passar como se fosse conhecida.
        const catalogClassification = classifyTestLeadCatalogReferences(discovered.map(relation => ({ ...relation, columnCount: relation.childSchema === 'public' && relation.parentColumn === 'id' ? relation.columnCount : 0 })))

        // A unica filha descartavel e `lead_addresses`, e o catalogo precisa
        // CONFIRMAR a relacao allowlistada (childTable + coluna exata `lead_id`)
        // antes de qualquer DELETE. Se houver FK desconhecida apontando para o
        // PROPRIO endereco (`lead_addresses`), apagar o endereco poderia falhar
        // (RESTRICT/NO ACTION) ou arrastar linhas alheias: bloqueia.
        const addressRelationAllowlisted = catalogClassification.classified.some(
          (relation) => relation.parentTable === TEST_LEAD_PARENT_TABLE && isLeadAddresses(relation),
        )
        const unclassifiedAddressParentReferences = catalogClassification.unclassified.filter(
          (relation) => relation.parentTable === TEST_LEAD_ADDRESS_PARENT_TABLE,
        )

        // Contagem REAL de cada filho conhecido nao-descartavel do Lead (e do
        // endereco descartavel + auditoria generica). Tabela desconhecida nao
        // precisa de contagem: ela ja bloqueia por classificacao.
        // Count live catalog relationships, including address references owned
        // by a DIFFERENT lead. SQL identifiers are always quoted.
        const counted = new Map<string, number>()
        for (const relation of discovered) {
          if (relation.columnCount !== 1 || relation.parentColumn !== 'id') continue
          const child = sql`${sql.identifier(relation.childSchema)}.${sql.identifier(relation.childTable)}`
          const column = sql.identifier(relation.childColumn)
          const predicate = relation.parentTable === TEST_LEAD_PARENT_TABLE
            ? sql`${column} = ${id}`
            : sql`${column} in (select id from lead_addresses where lead_id = ${id})`
          const rows = await tx.execute(sql`select count(*)::int as count from ${child} where ${predicate}`)
          const key = relation.parentTable + ':' + relation.childTable
          counted.set(key, (counted.get(key) ?? 0) + Number(rows[0]?.count ?? 0))
        }
        const proposalCount = counted.get('leads:lead_proposals') ?? 0
        const documentCount = counted.get('leads:lead_documents') ?? 0
        const serviceRequestCount = counted.get('leads:lead_service_requests') ?? 0
        const auditEventCount = counted.get('leads:lead_audit_events') ?? 0
        const addressCount = counted.get('leads:lead_addresses') ?? 0
        const addressReferenceCount = [...counted].filter(([key]) => key.startsWith('lead_addresses:')).reduce((sum, [, count]) => sum + count, 0)
        const externalAuditRows = await tx.execute(sql`select count(*)::int as count from audit_events where target_type = 'lead' and target_id = ${id}`)
        const externalAuditEventCount = Number(externalAuditRows[0]?.count ?? 0)

        // Fatos da FK de auditoria lidos do catalogo VIVO (a relacao real
        // descoberta acima, nunca do palpite): sem FK encontrada, a retencao e
        // negada e a purga bloqueia.
        const auditRelation = discovered.find(
          (relation) =>
            relation.parentTable === TEST_LEAD_PARENT_TABLE &&
            relation.childTable === TEST_LEAD_AUDIT_CHILD_TABLE &&
            relation.childColumn === TEST_LEAD_LEAD_COLUMN,
        )
        const auditFacts: TestLeadFkFacts | null = auditRelation
          ? {
              childTable: auditRelation.childTable,
              childColumn: auditRelation.childColumn,
              childColumnNotNull: auditRelation.childColumnNotNull,
              onDelete: auditRelation.onDelete,
            }
          : null
        const auditRetention = planTestLeadAuditRetention(auditFacts)

        const referenceSnapshot: TestLeadReferenceSnapshot = {
          addressCount,
          proposalCount,
          documentCount,
          serviceRequestCount,
          auditEventCount,
          externalAuditEventCount,
          unclassifiedReferenceCount: catalogClassification.unclassified.length + addressReferenceCount,
        }
        const classification = classifyTestLeadReferences(referenceSnapshot, auditRetention)
        const externalReferenceCount = classification.blockingCount

        const plan = planTestLeadPurge({
          testRunId,
          lead: {
            id: lead.id,
            status: lead.status,
            testRunId: lead.testRunId,
            convertedClientId: lead.convertedClientId,
          },
          proposalCount,
          documentCount,
          externalReferenceCount,
          auditEvents: { count: auditEventCount, retainableDetached: auditRetention.retainable },
        })

        const deletionBlockers: string[] = []
        if (addressCount > 0 && (!addressRelationAllowlisted || unclassifiedAddressParentReferences.length > 0)) {
          deletionBlockers.push('addresses-not-disposable')
        }

        if (!plan.allowed || classification.blockers.length > 0 || deletionBlockers.length > 0) {
          return {
            outcome: 'blocked',
            blockers: [
              ...new Set([...plan.blockers, ...classification.blockers, ...deletionBlockers]),
            ],
          }
        }

        // Nada de auditoria e tocado: apenas o endereco de teste (unica
        // allowlist) e a propria linha do Lead saem, na mesma transacao.
        const removedAddresses = await tx
          .delete(leadAddresses)
          .where(eq(leadAddresses.leadId, lead.id))
          .returning({ id: leadAddresses.id })
        await tx.delete(leads).where(eq(leads.id, lead.id))

        return { outcome: 'purged', removedAddresses: removedAddresses.length }
      },
    )

    if (result.outcome === 'not-found') {
      return NextResponse.json({ error: 'Lead de teste não encontrado.' }, { status: 404 })
    }

    if (result.outcome === 'blocked') {
      return NextResponse.json(
        {
          error:
            'Purga recusada: o Lead de teste possui referências, não pertence à sessão informada, ' +
            'não está NEW ou já foi convertido. Nada foi removido e nenhuma auditoria foi tocada.',
          leadId: id,
          runId: testRunId,
          blockers: result.blockers,
        },
        { status: 409 },
      )
    }

    return NextResponse.json({ leadId: id, runId: testRunId })
  } catch (error: any) {
    console.error('Falha ao purgar Lead de teste', error)
    return NextResponse.json({ error: 'Falha interna ao purgar Lead de teste.' }, { status: 500 })
  }
}
