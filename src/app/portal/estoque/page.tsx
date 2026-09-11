import { db, insumos, equipment } from '@/db';
import { EstoqueClient } from '@/components/portal/estoque-client';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Estoque · Hub RR',
};

export default async function EstoquePage() {
  let insumosList: any[] = [];
  let equipamentosList: any[] = [];

  if (db) {
    try {
      insumosList = await db.select().from(insumos);
      equipamentosList = await db.select().from(equipment);
    } catch (e) {
      console.error('Erro ao consultar dados de estoque:', e);
    }
  }

  return (
    <EstoqueClient 
      initialInsumos={insumosList} 
      initialEquipamentos={equipamentosList} 
    />
  );
}
