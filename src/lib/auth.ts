import { cookies } from 'next/headers';
import { accessPortalIdentity, accessPortalLogout, activeAccessService } from './access-v1/runtime.mjs';
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
  jobTitle: string | null;
  photoUrl: string | null;
  accessCapabilities?:string[];
  authority_mode?:string;
  accessRole?:{kind:string;key?:string;role_ref?:string};
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
    const pilotToken=process.env.ACCESS_V1_ENABLED==='true'?cookieStore.get('access_v1')?.value:null;
    if(pilotToken){const user=await accessPortalIdentity(pilotToken,'hub');return user?{authority_mode:user.authority_mode,accessRole:user.accessRole,id:user.id,name:user.name,phone:user.phone,email:user.email,role:user.role,jobTitle:user.job_title,photoUrl:user.photo_url,accessCapabilities:user.capabilities}:null;}
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!token) return null;

    if (!db) {
      // Sem banco conectado → não autenticado (fail-closed)
      return null;
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
          jobTitle: users.jobTitle,
          photoUrl: users.photoUrl,
          isActive: users.isActive,
        },
      })
      .from(sessions)
      .innerJoin(users, eq(sessions.userId, users.id))
      .where(and(eq(sessions.id, token), gte(sessions.expiresAt, now)))
      .limit(1);

    if (activeSessions.length === 0 || !activeSessions[0].user.isActive) {
      return null;
    }

    // Pilot sessions use their live canonical authority, never a legacy cookie.
    if (process.env.ACCESS_V1_ENABLED==='true' && await activeAccessService('hub')?.isPilotAccount(activeSessions[0].user.id)) return null;
    const { isActive: _isActive, ...sessionUser } = activeSessions[0].user;
    return sessionUser;
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
    const pilot=process.env.ACCESS_V1_ENABLED==='true'?cookieStore.get('access_v1')?.value:null;
    if(pilot){await accessPortalLogout(pilot,'hub');cookieStore.delete('access_v1');}
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
