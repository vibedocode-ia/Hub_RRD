'use server';

import { auditEvents, db, insumos, stockMovements } from '@/db';
import { and, eq, gte, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { validateStockAdjustment } from '@/lib/inventory';
import { requireLocalPermission } from '@/lib/require-local-permission';

export async function createInsumo(formData: FormData) {
  const authorized = await requireLocalPermission('inventory.write');
  if (!authorized) return { error: 'Permissão insuficiente para cadastrar insumo.' };
  if (!db) return { error: 'Banco de dados indisponível' };

  const nome = String(formData.get('nome') || '').trim();
  const categoria = String(formData.get('categoria') || '').trim();
  const unidade = String(formData.get('unidade') || '').trim();
  const nivelCritico = Number(formData.get('nivelCritico'));

  if (!nome || !categoria || !unidade) return { error: 'Nome, categoria e unidade são obrigatórios' };
  if (!Number.isFinite(nivelCritico) || nivelCritico < 0) return { error: 'Nível crítico inválido.' };

  try {
    await db.transaction(async (tx) => {
      const [created] = await tx.insert(insumos).values({
        nome,
        categoria,
        unidade,
        nivelCritico: nivelCritico.toFixed(2),
        quantidade: '0.00',
      }).returning();
      await tx.insert(auditEvents).values({
        actorUserId: authorized.access.id,
        action: 'inventory.item_created',
        targetType: 'insumo',
        targetId: created.id,
        metadata: { category: categoria, unit: unidade },
      });
    });
    revalidatePath('/portal/estoque');
    return { success: true };
  } catch (error) {
    console.error('Erro ao criar insumo:', error);
    return { error: 'Falha ao criar insumo' };
  }
}

export async function registerStockMovement(formData: FormData) {
  const authorized = await requireLocalPermission('inventory.write');
  if (!authorized) return { error: 'Permissão insuficiente para movimentar estoque.' };
  if (!db) return { error: 'Banco de dados indisponível' };

  const insumoId = String(formData.get('insumoId') || '');
  const direction = formData.get('type') === 'ENTRADA' ? 'ENTRADA' : formData.get('type') === 'SAIDA' ? 'SAIDA' : null;
  const quantity = Number(formData.get('quantity'));
  const reason = String(formData.get('reason') || '').trim().slice(0, 500) || null;

  if (!insumoId || !direction) return { error: 'Insumo e tipo de movimentação são obrigatórios.' };
  const basicValidation = validateStockAdjustment(quantity);
  if (!basicValidation.ok) return { error: basicValidation.error };

  try {
    const result = await db.transaction(async (tx) => {
      const [current] = await tx.select({ quantidade: insumos.quantidade }).from(insumos).where(eq(insumos.id, insumoId)).limit(1);
      if (!current) return { error: 'Insumo não encontrado' };

      const validation = validateStockAdjustment(basicValidation.quantity, { direction, available: Number(current.quantidade) });
      if (!validation.ok) return { error: validation.error };

      const delta = direction === 'ENTRADA' ? validation.quantity : -validation.quantity;
      const [updated] = await tx.update(insumos)
        .set({ quantidade: sql`${insumos.quantidade} + ${delta}`, updatedAt: new Date() })
        .where(direction === 'SAIDA'
          ? and(eq(insumos.id, insumoId), gte(insumos.quantidade, validation.quantity.toFixed(2)))
          : eq(insumos.id, insumoId))
        .returning();
      if (!updated) return { error: 'Estoque insuficiente para esta saída.' };

      await tx.insert(stockMovements).values({
        insumoId,
        direction,
        quantity: validation.quantity.toFixed(2),
        reason,
        source: 'MANUAL',
        createdById: authorized.access.id,
      });
      await tx.insert(auditEvents).values({
        actorUserId: authorized.access.id,
        action: 'inventory.movement_registered',
        targetType: 'insumo',
        targetId: insumoId,
        metadata: { direction, quantity: validation.quantity, source: 'MANUAL' },
      });
      return { success: true };
    });
    if ('error' in result) return result;
    revalidatePath('/portal/estoque');
    return result;
  } catch (error) {
    console.error('Erro na movimentação:', error);
    return { error: 'Falha na movimentação de estoque' };
  }
}
