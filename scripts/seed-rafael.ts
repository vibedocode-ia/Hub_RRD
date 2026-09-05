import { getDb, users, USER_ROLES } from '../src/db';
import { hashPassword } from '../src/lib/auth-crypto';
import { eq } from 'drizzle-orm';

async function seed() {
  console.log('🌱 [SEED RR] Iniciando cadastro do operador master Rafael...');

  const password = process.env.INITIAL_RAFAEL_PASSWORD || process.env.PORTAL_PASSWORD;
  if (!password) {
    console.error('❌ ERRO: Defina a variável INITIAL_RAFAEL_PASSWORD ou PORTAL_PASSWORD no arquivo .env antes de rodar o seed.');
    process.exit(1);
  }

  const db = getDb();
  const rafaelPhone = '5521996699191';
  const passwordHash = hashPassword(password);

  const existingUsers = await db.select().from(users).where(eq(users.phone, rafaelPhone)).limit(1);

  if (existingUsers.length > 0) {
    await db.update(users).set({
      name: 'Rafael (RR Desentupidora)',
      passwordHash,
      role: USER_ROLES.ADMIN,
      updatedAt: new Date(),
    }).where(eq(users.phone, rafaelPhone));

    console.log(`✅ [SEED RR] Usuário master Rafael (${rafaelPhone}) atualizado com sucesso!`);
  } else {
    await db.insert(users).values({
      name: 'Rafael (RR Desentupidora)',
      phone: rafaelPhone,
      email: 'contato@rrdesentupidora.com.br',
      passwordHash,
      role: USER_ROLES.ADMIN,
    });

    console.log(`✅ [SEED RR] Usuário master Rafael (${rafaelPhone}) cadastrado com sucesso!`);
  }

  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ [SEED RR] Falha ao executar o seed:', err);
  process.exit(1);
});
