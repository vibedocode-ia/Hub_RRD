'use server';

import { auditEvents, db, financeiroLancamentos } from '@/db';
import { revalidatePath } from 'next/cache';
import { requireLocalPermission } from '@/lib/require-local-permission';
import { FinancialEntrySchema } from '@/lib/validation/financeiro';

export async function createTransaction(formData: FormData) {
  const authorized = await requireLocalPermission('financial.write');
  if (!authorized) return { error: 'Permissão insuficiente para lançar no financeiro.' };
  if (!db) return { error: 'Banco de dados indisponível' };

  const parsed = FinancialEntrySchema.safeParse({
    tipo: formData.get('tipo'),
    descricao: formData.get('descricao'),
    valor: formData.get('valor'),
    data: formData.get('data'),
    status: formData.get('status'),
    categoria: formData.get('categoria') || null,
    clientId: formData.get('clientId') || null,
  });
  if (!parsed.success) return { error: 'Tipo, descrição, valor e data válidos são obrigatórios.' };
  const input = parsed.data;

  try {
    await db.transaction(async (tx) => {
      const [created] = await tx.insert(financeiroLancamentos).values({
        tipo: input.tipo,
        descricao: input.descricao,
        valor: input.valor.toFixed(2),
        data: new Date(`${input.data}T12:00:00.000Z`),
        status: input.status,
        categoria: input.categoria || null,
        clientId: input.clientId || null,
      }).returning();
      await tx.insert(auditEvents).values({
        actorUserId: authorized.access.id,
        action: 'financial.entry_created',
        targetType: 'financial_entry',
        targetId: created.id,
        metadata: { type: created.tipo, status: created.status, hasClient: Boolean(created.clientId) },
      });
    });

    revalidatePath('/portal/financeiro');
    revalidatePath('/portal/dashboard');
    revalidatePath('/portal/crm');
    if (input.clientId) revalidatePath(`/portal/crm/${input.clientId}`);
    return { success: true };
  } catch (error) {
    console.error('Erro ao criar lançamento:', error);
    return { error: 'Falha ao criar lançamento financeiro' };
  }
}
