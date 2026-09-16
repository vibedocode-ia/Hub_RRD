import { db, clients, financeiroLancamentos, officialDocuments } from '@/db';
import { desc } from 'drizzle-orm';
import { FinanceiroClient } from '@/components/portal/financeiro-client';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Financeiro · Hub RR',
};

export default async function FinanceiroPage({ searchParams }: { searchParams: Promise<{ tipo?: string; status?: string }> }) {
  const params = await searchParams;
  const initialType = params.tipo === 'RECEITA' || params.tipo === 'DESPESA' ? params.tipo : undefined;
  const initialStatus = ['PENDENTE','EFETIVADO','ATRASADO','CANCELADO'].includes(params.status || '') ? params.status : undefined;
  let lancamentos: any[] = [];
  let documentos: any[] = [];
  let clientOptions: Array<{ id: string; name: string }> = [];

  if (db) {
    try {
      lancamentos = await db.select().from(financeiroLancamentos).orderBy(desc(financeiroLancamentos.createdAt)).limit(15);
      documentos = await db.select().from(officialDocuments).orderBy(desc(officialDocuments.createdAt)).limit(10);
      clientOptions = await db.select({ id: clients.id, name: clients.name }).from(clients).orderBy(desc(clients.updatedAt)).limit(200);
    } catch (e) {
      console.error('Erro ao consultar dados financeiros:', e);
    }
  }

  return (
    <FinanceiroClient 
      initialLancamentos={lancamentos} 
      initialDocumentos={documentos}
      clientOptions={clientOptions}
      initialType={initialType}
      initialStatus={initialStatus}
    />
  );
}
