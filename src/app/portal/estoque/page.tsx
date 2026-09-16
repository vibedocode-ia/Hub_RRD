import { db, equipment, insumos, stockMovements } from '@/db';
import { EstoqueClient } from '@/components/portal/estoque-client';
import { desc, eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Estoque · Hub RR',
};

export default async function EstoquePage() {
  let insumosList: any[] = [];
  let equipamentosList: any[] = [];
  let movementsList: Array<{ id: string; direction: string; quantity: string; reason: string | null; source: string; createdAt: Date; insumoName: string; unit: string }> = [];

  if (db) {
    try {
      [insumosList, equipamentosList, movementsList] = await Promise.all([
        db.select().from(insumos),
        db.select().from(equipment),
        db.select({
          id: stockMovements.id,
          direction: stockMovements.direction,
          quantity: stockMovements.quantity,
          reason: stockMovements.reason,
          source: stockMovements.source,
          createdAt: stockMovements.createdAt,
          insumoName: insumos.nome,
          unit: insumos.unidade,
        }).from(stockMovements)
          .innerJoin(insumos, eq(stockMovements.insumoId, insumos.id))
          .orderBy(desc(stockMovements.createdAt))
          .limit(12),
      ]);
    } catch (e) {
      console.error('Erro ao consultar dados de estoque:', e);
    }
  }

  return (
    <EstoqueClient
      initialInsumos={insumosList}
      initialEquipamentos={equipamentosList}
      initialMovements={movementsList}
    />
  );
}
