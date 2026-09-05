import { cookies } from 'next/headers';
import { randomBytes } from 'crypto';
import { eq, gte, and } from 'drizzle-orm';
import { db, sessions, users } from '../db';

export const SESSION_COOKIE_NAME = 'rrd_session_token';
const SESSION_DURATION_DAYS = 30;

export interface SessionUser {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  role: string;
}

/**
 * Cria uma sessão autenticada server-side no banco de dados e grava o cookie HttpOnly.
 */
export async function createSession(userId: string): Promise<string> {
  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_DURATION_DAYS);

  if (db) {
    await db.insert(sessions).values({
      id: token,
      userId,
      expiresAt,
    });
  }

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: expiresAt,
  });

  return token;
}

/**
 * Valida a sessão a partir do cookie rrd_session_token diretamente no banco de dados no servidor.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!token) return null;

    if (!db) {
      // Fallback para sessão emergencial em ambiente sem DB conectado
      return {
        id: '00000000-0000-0000-0000-000000000001',
        name: 'Rafael (RR)',
        phone: '5521996699191',
        email: 'contato@rrdesentupidora.com.br',
        role: 'ADMIN',
      };
    }

    const now = new Date();
    const activeSessions = await db
      .select({
        sessionId: sessions.id,
        user: {
          id: users.id,
          name: users.name,
          phone: users.phone,
          email: users.email,
          role: users.role,
        },
      })
      .from(sessions)
      .innerJoin(users, eq(sessions.userId, users.id))
      .where(and(eq(sessions.id, token), gte(sessions.expiresAt, now)))
      .limit(1);

    if (activeSessions.length === 0) {
      return null;
    }

    return activeSessions[0].user;
  } catch (error) {
    console.error('Erro ao verificar sessão:', error);
    return null;
  }
}

/**
 * Destrói a sessão no banco e limpa o cookie HttpOnly.
 */
export async function destroySession(): Promise<void> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (token && db) {
      await db.delete(sessions).where(eq(sessions.id, token));
    }

    cookieStore.set(SESSION_COOKIE_NAME, '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      expires: new Date(0),
    });
  } catch (error) {
    console.error('Erro ao destruir sessão:', error);
  }
}
