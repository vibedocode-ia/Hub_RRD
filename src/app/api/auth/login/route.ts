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

    // Limpa telefone para formato apenas com números (ex: 5521996699191 ou 21996699191)
    const normalized = phone.replace(/\D/g, '');
    const searchPhone = normalized.startsWith('55') ? normalized : `55${normalized}`;

    if (!db) {
      // Fallback para ambiente sem DB conectado: valida contra env no login emergency
      const envPass = process.env.INITIAL_RAFAEL_PASSWORD || process.env.PORTAL_PASSWORD || process.env.NEXT_PUBLIC_DEMO_HUB_PASS;
      if (password === envPass) {
        await createSession('00000000-0000-0000-0000-000000000001');
        return NextResponse.json({
          success: true,
          user: { name: 'Rafael (RR)', phone: '5521996699191', role: 'ADMIN' },
        });
      }
      return NextResponse.json(
        { error: 'Credenciais inválidas ou banco indisponível.' },
        { status: 401 }
      );
    }

    const foundUsers = await db
      .select()
      .from(users)
      .where(eq(users.phone, searchPhone))
      .limit(1);

    if (foundUsers.length === 0) {
      return NextResponse.json(
        { error: 'Usuário não cadastrado ou não autorizado.' },
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
  } catch (error: any) {
    console.error('Erro na API de login:', error);
    return NextResponse.json(
      { error: 'Falha interna ao processar login.' },
      { status: 500 }
    );
  }
}
