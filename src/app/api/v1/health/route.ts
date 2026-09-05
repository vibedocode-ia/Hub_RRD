import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { conn, db } from '@/db';
import { sql } from 'drizzle-orm';
import { VERSION } from '@/lib/version';

function safeCompare(a: string, b: string): boolean {
  try {
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

export async function GET(request: Request) {
  const secretEnv = process.env.SOFIA_HUB_SECRET?.trim();
  if (!secretEnv) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        hub: 'hub_rrd',
        error: 'hub_secret_not_configured',
      },
      { status: 503 }
    );
  }

  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();

  if (!token || !safeCompare(token, secretEnv)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  // Check Database connection
  let isDbConnected = false;
  if (conn && db) {
    try {
      await db.execute(sql`SELECT 1`);
      isDbConnected = true;
    } catch {
      isDbConnected = false;
    }
  }

  if (!isDbConnected) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        hub: 'hub_rrd',
        version: VERSION,
        database: 'disconnected',
      },
      { status: 503 }
    );
  }

  return NextResponse.json({
    status: 'healthy',
    hub: 'hub_rrd',
    version: VERSION,
    timestamp: new Date().toISOString(),
    database: 'connected',
    capabilities: [
      'criar_rascunho_os_rrd',
      'emitir_recibo_garantia',
      'emitir_laudo_tecnico',
    ],
  });
}
