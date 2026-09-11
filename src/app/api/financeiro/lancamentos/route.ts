import { NextResponse } from 'next/server';
import { db, financeiroLancamentos } from '@/db';
import { getSessionUser } from '@/lib/auth';

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  if (!db) {
    return NextResponse.json({ error: 'Banco indisponível' }, { status: 503 });
  }

  try {
    const body = await request.json();
    const { tipo, categoria, descricao, valor, data, status } = body;

    if (!tipo || !descricao || !valor) {
      return NextResponse.json({ error: 'Dados obrigatórios faltando' }, { status: 400 });
    }

    const [novoLancamento] = await db.insert(financeiroLancamentos).values({
      tipo,
      categoria: categoria || 'GERAL',
      descricao,
      valor: valor.toString(),
      data: data ? new Date(data) : new Date(),
      status: status || 'EFETIVADO',
    }).returning();

    return NextResponse.json({ success: true, lancamento: novoLancamento });
  } catch (e) {
    console.error('Erro ao inserir lançamento:', e);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
