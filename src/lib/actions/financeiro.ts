'use server';

import { db, financeiroLancamentos } from '@/db';
import { revalidatePath } from 'next/cache';

export async function createTransaction(formData: FormData) {
  if (!db) return { error: 'Banco de dados indisponível' };

  const tipo = formData.get('tipo') as string; // 'RECEITA' | 'DESPESA'
  const descricao = formData.get('descricao') as string;
  const valor = parseFloat(formData.get('valor') as string);
  const data = formData.get('data') as string;
  const status = formData.get('status') as string || 'EFETIVADO';
  const categoria = formData.get('categoria') as string;
  const clientId = String(formData.get('clientId') || '').trim();

  if (!tipo || !descricao || isNaN(valor) || !data || (clientId && !/^[0-9a-f-]{36}$/i.test(clientId))) {
    return { error: 'Tipo, descrição, valor e data são obrigatórios' };
  }

  try {
    await db.insert(financeiroLancamentos).values({
      tipo,
      descricao,
      valor: valor.toString(),
      data: new Date(data),
      status,
      categoria: categoria || null,
      clientId: clientId || null,
    });
    
    revalidatePath('/portal/financeiro');
    revalidatePath('/portal/dashboard');
    revalidatePath('/portal/crm');
    if (clientId) revalidatePath(`/portal/crm/${clientId}`);
    return { success: true };
  } catch (error) {
    console.error('Erro ao criar lançamento:', error);
    return { error: 'Falha ao criar lançamento financeiro' };
  }
}
