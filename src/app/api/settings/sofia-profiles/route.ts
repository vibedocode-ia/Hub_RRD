import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db, sofiaResponseProfiles } from '@/db';
import { getSessionUser } from '@/lib/auth';
import { DEFAULT_SOFIA_PROFILES } from '@/lib/rr-defaults';

async function ensureDefaults() {
  for (const profile of DEFAULT_SOFIA_PROFILES) {
    const existing = await db.select({ id: sofiaResponseProfiles.id }).from(sofiaResponseProfiles).where(eq(sofiaResponseProfiles.audience, profile.audience)).limit(1);
    if (existing.length === 0) {
      await db.insert(sofiaResponseProfiles).values(profile);
    }
  }
}

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  if (!db) return NextResponse.json({ error: 'Banco de dados não disponível' }, { status: 500 });
  await ensureDefaults();
  const rows = await db.select().from(sofiaResponseProfiles).orderBy(sofiaResponseProfiles.audience);
  return NextResponse.json({ success: true, profiles: rows });
}

export async function PATCH(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  if (!['SUPER_ADMIN', 'ADMIN'].includes(user.role)) return NextResponse.json({ error: 'Permissão insuficiente' }, { status: 403 });
  if (!db) return NextResponse.json({ error: 'Banco de dados não disponível' }, { status: 500 });
  const body = await req.json();
  const { id, title, description, initialLookupFields, initialContext, responsePrompt, allowedData, blockedData, isActive } = body;
  if (!id || !title || !responsePrompt) return NextResponse.json({ error: 'ID, título e prompt são obrigatórios.' }, { status: 400 });
  const [updated] = await db.update(sofiaResponseProfiles).set({
    title,
    description: description || '',
    initialLookupFields: initialLookupFields || '',
    initialContext: initialContext || '',
    responsePrompt,
    allowedData: allowedData || '',
    blockedData: blockedData || '',
    isActive: Boolean(isActive),
    updatedAt: new Date(),
  }).where(eq(sofiaResponseProfiles.id, id)).returning();
  if (!updated) return NextResponse.json({ error: 'Perfil não encontrado.' }, { status: 404 });
  return NextResponse.json({ success: true, profile: updated });
}
