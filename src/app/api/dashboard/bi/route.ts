import { NextResponse } from 'next/server';
import { db, clients, serviceRequests, sofiaEvents, REQUEST_STATUS, SOFIA_EVENT_STATUS, insumos, financeiroLancamentos, teams } from '@/db';
import { count, eq, sum, lte } from 'drizzle-orm';
import { getSessionUser } from '@/lib/auth';

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  if (!db) {
    return NextResponse.json({ error: 'Banco indisponível' }, { status: 503 });
  }

  try {
    const [c] = await db.select({ val: count() }).from(clients);
    const clientsCount = c?.val || 0;

    const [r] = await db.select({ val: count() }).from(serviceRequests).where(eq(serviceRequests.status, REQUEST_STATUS.PENDING_REVIEW));
    const pendingRequestsCount = r?.val || 0;

    const [s] = await db.select({ val: count() }).from(sofiaEvents).where(eq(sofiaEvents.status, SOFIA_EVENT_STATUS.PENDING_REVIEW));
    const sofiaDraftsCount = s?.val || 0;

    const [rec] = await db.select({ val: sum(financeiroLancamentos.valor) }).from(financeiroLancamentos).where(eq(financeiroLancamentos.tipo, 'RECEITA'));
    const faturamentoTotal = rec?.val || '0.00';

    const [des] = await db.select({ val: sum(financeiroLancamentos.valor) }).from(financeiroLancamentos).where(eq(financeiroLancamentos.tipo, 'DESPESA'));
    const gastosTotais = des?.val || '0.00';

    const alertasEstoque = await db.select().from(insumos).where(lte(insumos.quantidade, insumos.nivelCritico)).limit(5);

    const equipesAtivas = await db.select().from(teams).where(eq(teams.isActive, true)).limit(5);

    return NextResponse.json({
      metrics: {
        clientsCount,
        pendingRequestsCount,
        sofiaDraftsCount,
        faturamentoTotal,
        gastosTotais,
      },
      alertasEstoque,
      equipesAtivas,
    });
  } catch (e) {
    console.error('Erro na API BI:', e);
    return NextResponse.json({ error: 'Falha interna' }, { status: 500 });
  }
}
