import { defineConfig } from 'drizzle-kit';

const url = process.env.POSTGRES_RRD_URL || process.env.DATABASE_URL;
if (!url) throw new Error('POSTGRES_RRD_URL or DATABASE_URL is required');

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
  dialect: 'postgresql',
  dbCredentials: { url },
});
