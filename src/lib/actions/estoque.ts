'use server';

import { db, insumos, equipment } from '@/db';
import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';

export async function createInsumo(formData: FormData) {
  if (!db) return { error: 'Banco de dados indisponível' };

  const nome = formData.get('nome') as string;
  const categoria = formData.get('categoria') as string;
  const unidade = formData.get('unidade') as string;
  const nivelCritico = formData.get('nivelCritico') as string;

  if (!nome || !categoria || !unidade) {
    return { error: 'Nome, categoria e unidade são obrigatórios' };
  }

  try {
    await db.insert(insumos).values({
      nome,
      categoria,
      unidade,
      nivelCritico: nivelCritico || '5.00',
      quantidade: '0.00',
    });
    
    revalidatePath('/portal/estoque');
    return { success: true };
  } catch (error) {
    console.error('Erro ao criar insumo:', error);
    return { error: 'Falha ao criar insumo' };
  }
}

export async function registerStockMovement(formData: FormData) {
  if (!db) return { error: 'Banco de dados indisponível' };

  const insumoId = formData.get('insumoId') as string;
  const type = formData.get('type') as string; // 'ENTRADA' | 'SAIDA'
  const quantity = parseFloat(formData.get('quantity') as string);
  const reason = formData.get('reason') as string;

  if (!insumoId || !type || isNaN(quantity) || quantity <= 0) {
    return { error: 'Insumo, tipo e quantidade válida são obrigatórios' };
  }

  try {
    // Buscar quantidade atual
    const [insumoAt] = await db.select().from(insumos).where(eq(insumos.id, insumoId));
    if (!insumoAt) return { error: 'Insumo não encontrado' };

    const diff = type === 'ENTRADA' ? quantity : -quantity;
    const novaQuantidade = parseFloat(insumoAt.quantidade as string) + diff;

    if (novaQuantidade < 0) {
      return { error: 'Quantidade insuficiente em estoque' };
    }

    await db.update(insumos)
      .set({ quantidade: novaQuantidade.toString() })
      .where(eq(insumos.id, insumoId));
    
    // Aqui no futuro poderia registrar num histórico de movimentações `estoque_movimentacoes`

    revalidatePath('/portal/estoque');
    return { success: true };
  } catch (error) {
    console.error('Erro na movimentação:', error);
    return { error: 'Falha na movimentação de estoque' };
  }
}
