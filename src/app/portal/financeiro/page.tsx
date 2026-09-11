import { db, financeiroLancamentos, officialDocuments } from '@/db';
import { desc } from 'drizzle-orm';
import { FinanceiroClient } from '@/components/portal/financeiro-client';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Financeiro · Hub RR',
};

export default async function FinanceiroPage() {
  let lancamentos: any[] = [];
  let documentos: any[] = [];

  if (db) {
    try {
      lancamentos = await db.select().from(financeiroLancamentos).orderBy(desc(financeiroLancamentos.createdAt)).limit(15);
      documentos = await db.select().from(officialDocuments).orderBy(desc(officialDocuments.createdAt)).limit(10);
    } catch (e) {
      console.error('Erro ao consultar dados financeiros:', e);
    }
  }

  return (
    <FinanceiroClient 
      initialLancamentos={lancamentos} 
      initialDocumentos={documentos} 
    />
  );
}
