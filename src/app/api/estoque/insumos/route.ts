import { NextResponse } from 'next/server';
import { auditEvents, db, insumos, stockMovements } from '@/db';
import { and, eq, gte, sql } from 'drizzle-orm';
import { requireLocalPermission } from '@/lib/require-local-permission';
import { validateStockAdjustment } from '@/lib/inventory';

export async function PATCH(request: Request) {
  const authorized = await requireLocalPermission('inventory.write');
  if (!authorized) return NextResponse.json({ error: 'Permissão insuficiente para alterar estoque' }, { status: 403 });
  if (!db) return NextResponse.json({ error: 'Banco indisponível' }, { status: 503 });

  try {
    const body = await request.json();
    const id = typeof body?.id === 'string' ? body.id : '';
    const diff = body?.diff;
    if (!id || typeof diff !== 'number') return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 });

    const direction = diff >= 0 ? 'ENTRADA' : 'SAIDA';
    const basicValidation = validateStockAdjustment(Math.abs(diff));
    if (!basicValidation.ok) return NextResponse.json({ error: basicValidation.error }, { status: 422 });

    const result = await db.transaction(async (tx) => {
      const [current] = await tx.select({ quantidade: insumos.quantidade }).from(insumos).where(eq(insumos.id, id)).limit(1);
      if (!current) return { error: 'Insumo não encontrado', status: 404 as const };

      const validation = validateStockAdjustment(basicValidation.quantity, { direction, available: Number(current.quantidade) });
      if (!validation.ok) return { error: validation.error, status: 422 as const };

      const delta = direction === 'ENTRADA' ? validation.quantity : -validation.quantity;
      const [updated] = await tx.update(insumos)
        .set({ quantidade: sql`${insumos.quantidade} + ${delta}`, updatedAt: new Date() })
        .where(direction === 'SAIDA'
          ? and(eq(insumos.id, id), gte(insumos.quantidade, validation.quantity.toFixed(2)))
          : eq(insumos.id, id))
        .returning();
      if (!updated) return { error: 'Estoque insuficiente para esta saída.', status: 422 as const };

      await tx.insert(stockMovements).values({
        insumoId: updated.id,
        direction,
        quantity: validation.quantity.toFixed(2),
        source: 'AJUSTE_RAPIDO',
        createdById: authorized.access.id,
      });
      await tx.insert(auditEvents).values({
        actorUserId: authorized.access.id,
        action: 'inventory.adjusted',
        targetType: 'insumo',
        targetId: updated.id,
        metadata: { direction, quantity: validation.quantity, source: 'AJUSTE_RAPIDO' },
      });
      return { insumo: updated };
    });

    if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json({ success: true, insumo: result.insumo });
  } catch (e) {
    console.error('Erro ao atualizar insumo:', e);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
