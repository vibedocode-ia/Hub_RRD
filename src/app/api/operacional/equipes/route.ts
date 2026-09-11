import { NextResponse } from 'next/server';
import { db, teams } from '@/db';
import { eq } from 'drizzle-orm';
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
    const { id, isActive } = body;

    if (!id || typeof isActive !== 'boolean') {
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 });
    }

    const [updated] = await db.update(teams)
      .set({ isActive })
      .where(eq(teams.id, id))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: 'Equipe não encontrada' }, { status: 404 });
    }

    return NextResponse.json({ success: true, team: updated });
  } catch (e) {
    console.error('Erro ao atualizar equipe:', e);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
