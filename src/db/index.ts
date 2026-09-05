import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.POSTGRES_RRD_URL || process.env.DATABASE_URL || '';

// Singleton connection to prevent multiple pools in dev hot reloading
const globalForDb = globalThis as unknown as {
  conn: postgres.Sql | undefined;
};

// Create postgres connection safely (null fallback if environment variable is not defined at build time)
export const conn = globalForDb.conn ?? (connectionString ? postgres(connectionString, { max: 10 }) : undefined);

if (process.env.NODE_ENV !== 'production' && conn) {
  globalForDb.conn = conn;
}

export const db = conn ? drizzle(conn, { schema }) : (null as unknown as ReturnType<typeof drizzle<typeof schema>>);

export function getDb() {
  if (!conn || !db) {
    throw new Error('BANCO DE DADOS NÃO CONFIGURADO: Defina POSTGRES_RRD_URL ou DATABASE_URL nas variáveis de ambiente (.env).');
  }
  return db;
}

export * from './schema';
