import { getDb, users, USER_ROLES } from '../src/db';
import { hashPassword } from '../src/lib/auth-crypto';
import { eq } from 'drizzle-orm';

async function upsertUser(input: { phone: string; name: string; email: string; role: string; password?: string }) {
  if (!input.password) throw new Error(`Senha ausente para ${input.name}`);
  const db = getDb();
  const existing = await db.select().from(users).where(eq(users.phone, input.phone)).limit(1);
  const payload = { name: input.name, email: input.email, passwordHash: hashPassword(input.password), role: input.role, updatedAt: new Date() };
  if (existing.length) {
    await db.update(users).set(payload).where(eq(users.phone, input.phone));
    console.log(`✅ Usuário atualizado: ${input.name} (${input.phone})`);
  } else {
    await db.insert(users).values({ phone: input.phone, ...payload });
    console.log(`✅ Usuário criado: ${input.name} (${input.phone})`);
  }
}

async function main() {
  await upsertUser({ phone: '5521996699191', name: 'Rafael (RR Desentupidora)', email: 'contato@rrdesentupidora.com.br', role: USER_ROLES.ADMIN, password: process.env.INITIAL_RAFAEL_PASSWORD || process.env.PORTAL_PASSWORD });
  await upsertUser({ phone: '5521999757549', name: 'Vanderson Oliveira', email: 'vanderson@vibedocode.pro', role: USER_ROLES.SUPER_ADMIN, password: process.env.VANDERSON_PASSWORD });
}
main().then(()=>process.exit(0)).catch((err)=>{ console.error('❌ Falha no seed de usuários:', err.message); process.exit(1); });
