import { NextResponse } from 'next/server';
import { db, insumos } from '@/db';
import { eq, sql } from 'drizzle-orm';
import { getSessionUser } from '@/lib/auth';

export async function PATCH(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  if (!db) {
    return NextResponse.json({ error: 'Banco indisponível' }, { status: 503 });
  }

  try {
    const body = await request.json();
    const { id, diff } = body; // diff can be positive (entrada) or negative (saída)

    if (!id || typeof diff !== 'number') {
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 });
    }

    const [updated] = await db.update(insumos)
      .set({ quantidade: sql`${insumos.quantidade} + ${diff}` })
      .where(eq(insumos.id, id))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: 'Insumo não encontrado' }, { status: 404 });
    }

    return NextResponse.json({ success: true, insumo: updated });
  } catch (e) {
    console.error('Erro ao atualizar insumo:', e);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
