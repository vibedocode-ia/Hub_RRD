import { NextResponse } from 'next/server';
import { auditEvents, db, financeiroLancamentos } from '@/db';
import { requireLocalPermission } from '@/lib/require-local-permission';
import { FinancialEntrySchema } from '@/lib/validation/financeiro';

export async function POST(request: Request) {
  const authorized = await requireLocalPermission('financial.write');
  if (!authorized) return NextResponse.json({ error: 'Permissão insuficiente para lançar no financeiro' }, { status: 403 });
  if (!db) return NextResponse.json({ error: 'Banco indisponível' }, { status: 503 });

  try {
    const parsed = FinancialEntrySchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: 'Dados financeiros inválidos.', details: parsed.error.flatten() }, { status: 422 });
    const input = parsed.data;

    const novoLancamento = await db.transaction(async (tx) => {
      const [created] = await tx.insert(financeiroLancamentos).values({
        tipo: input.tipo,
        categoria: input.categoria || 'GERAL',
        descricao: input.descricao,
        valor: input.valor.toFixed(2),
        data: new Date(`${input.data}T12:00:00.000Z`),
        status: input.status,
        clientId: input.clientId || null,
      }).returning();
      await tx.insert(auditEvents).values({
        actorUserId: authorized.access.id,
        action: 'financial.entry_created',
        targetType: 'financial_entry',
        targetId: created.id,
        metadata: { type: created.tipo, status: created.status, hasClient: Boolean(created.clientId) },
      });
      return created;
    });

    return NextResponse.json({ success: true, lancamento: novoLancamento }, { status: 201 });
  } catch (e) {
    console.error('Erro ao inserir lançamento:', e);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
