import { db, clients, financeiroLancamentos, officialDocuments } from '@/db';
import { desc } from 'drizzle-orm';
import { FinanceiroClient } from '@/components/portal/financeiro-client';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Financeiro · Hub RR',
};

export default async function FinanceiroPage({ searchParams }: { searchParams: Promise<{ tipo?: string; status?: string; mes?: string; ano?: string; visao?: string }> }) {
  const params = await searchParams;
  const now = new Date();
  const selectedMonth = Math.min(12, Math.max(1, Number(params.mes || now.getMonth() + 1)));
  const selectedYear = Math.max(2020, Math.min(2100, Number(params.ano || now.getFullYear())));
  const annualView = params.visao === 'ANO';  const initialType = params.tipo === 'RECEITA' || params.tipo === 'DESPESA' ? params.tipo : undefined;
  const initialStatus = ['PENDENTE','EFETIVADO','ATRASADO','CANCELADO'].includes(params.status || '') ? params.status : undefined;
  let lancamentos: any[] = [];
  let documentos: any[] = [];
  let clientOptions: Array<{ id: string; name: string }> = [];

  if (db) {
    try {
      lancamentos = await db.select().from(financeiroLancamentos).orderBy(desc(financeiroLancamentos.data)).limit(1000);
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
      selectedMonth={selectedMonth}
      selectedYear={selectedYear}
      annualView={annualView}
    />
  );
}
