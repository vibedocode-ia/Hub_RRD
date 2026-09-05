import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db, users } from '../../../../db';
import { verifyPassword } from '../../../../lib/auth-crypto';
import { createSession } from '../../../../lib/auth';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { phone, password } = body;

    if (!phone || !password) {
      return NextResponse.json(
        { error: 'Informe o telefone e a senha de acesso.' },
        { status: 400 }
      );
    }

    // Normaliza telefone para formato apenas com números
    const normalized = phone.replace(/\D/g, '');
    const searchPhone = normalized.startsWith('55') ? normalized : `55${normalized}`;

    // Fail-closed: banco obrigatório em produção
    if (!db) {
      if (process.env.NODE_ENV === 'production') {
        return NextResponse.json(
          { error: 'Banco de dados indisponível. Login não é possível sem persistência.' },
          { status: 503 }
        );
      }

      // DEV-ONLY: login com PORTAL_PASSWORD quando DB não está conectado
      const devPassword = process.env.INITIAL_RAFAEL_PASSWORD || process.env.PORTAL_PASSWORD;
      if (!devPassword) {
        return NextResponse.json(
          { error: 'Banco não conectado e nenhuma senha de ambiente configurada (INITIAL_RAFAEL_PASSWORD ou PORTAL_PASSWORD).' },
          { status: 503 }
        );
      }

      if (password === devPassword) {
        console.warn('[DEV-ONLY] Login sem banco conectado. Sessão de desenvolvimento.');
        await createSession('00000000-0000-0000-0000-000000000001');
        return NextResponse.json({
          success: true,
          devOnly: true,
          user: { name: 'Rafael (RR)', phone: searchPhone, role: 'ADMIN' },
        });
      }
      return NextResponse.json(
        { error: 'Credenciais inválidas.' },
        { status: 401 }
      );
    }

    // Busca user no banco por telefone normalizado
    const foundUsers = await db
      .select()
      .from(users)
      .where(eq(users.phone, searchPhone))
      .limit(1);

    if (foundUsers.length === 0) {
      // Fallback para env password quando user ainda não foi seeded no banco
      const envPass = process.env.INITIAL_RAFAEL_PASSWORD || process.env.PORTAL_PASSWORD;
      if (envPass && password === envPass && searchPhone === '5521996699191') {
        console.warn('[AUTH] Login via INITIAL_RAFAEL_PASSWORD — user Rafael ainda não existe no banco. Execute npm run db:seed.');
        await createSession('00000000-0000-0000-0000-000000000001');
        return NextResponse.json({
          success: true,
          pendingSeed: true,
          user: { name: 'Rafael (RR)', phone: searchPhone, role: 'ADMIN' },
        });
      }
      return NextResponse.json(
        { error: 'Usuário não cadastrado ou senha incorreta.' },
        { status: 401 }
      );
    }

    const user = foundUsers[0];
    const isValid = verifyPassword(password, user.passwordHash);

    if (!isValid) {
      return NextResponse.json(
        { error: 'Senha incorreta. Tente novamente.' },
        { status: 401 }
      );
    }

    await createSession(user.id);

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error: unknown) {
    console.error('Erro na API de login:', error);
    return NextResponse.json(
      { error: 'Falha interna ao processar login.' },
      { status: 500 }
    );
  }
}
