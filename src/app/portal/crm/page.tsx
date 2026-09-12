import Link from 'next/link';
import { db, clients, clientAddresses, financeiroLancamentos, serviceRequests } from '@/db';
import { desc, eq } from 'drizzle-orm';
import { PlusCircle, Users } from 'lucide-react';
import CRMClientDashboard, { type CrmRow } from '@/components/portal/crm-client-dashboard';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'CRM · Hub RR' };

export default async function CRMPage() {
  let rows: CrmRow[] = [];
  if (db) {
    try {
      const [clientRows, financialRows, requestRows, addressRows] = await Promise.all([
        db.select().from(clients).where(eq(clients.isActive, true)).orderBy(desc(clients.updatedAt)),
        db.select().from(financeiroLancamentos),
        db.select().from(serviceRequests),
        db.select().from(clientAddresses).where(eq(clientAddresses.isMain, true)),
      ]);
      const addressByClient = new Map(addressRows.map(address => [address.clientId, address]));
      rows = clientRows.map(client => {
        const financial = financialRows.filter(entry => entry.clientId === client.id && entry.tipo === 'RECEITA');
        const requests = requestRows.filter(request => request.clientId === client.id && request.status === 'CONCLUIDO');
        return {
          id: client.id, name: client.name, type: client.type, phone: client.phone, document: client.document,
          recurrence: client.recurrence, source: client.source, customerSince: client.customerSince?.toISOString() ?? null,
          nextVisitAt: client.nextVisitAt?.toISOString() ?? null, createdAt: client.createdAt.toISOString(),
          neighborhood: addressByClient.get(client.id)?.neighborhood ?? null,
          totalPaid: financial.filter(entry => entry.status === 'EFETIVADO').reduce((sum, entry) => sum + Number(entry.valor), 0),
          pendingAmount: financial.filter(entry => entry.status === 'PENDENTE').reduce((sum, entry) => sum + Number(entry.valor), 0),
          serviceCount: requests.length,
        };
      });
    } catch (error) { console.error('Erro ao carregar CRM:', error); }
  }
  return <div className="space-y-6">
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between"><div><h1 className="flex items-center gap-2 text-2xl font-black tracking-tight text-slate-100">CRM <Users className="w-5 h-5 text-cyan-400" /></h1><p className="text-sm text-slate-400">Carteira comercial, histórico operacional e leitura financeira por cliente.</p></div><Link href="/portal/crm/novo" className="inline-flex self-start md:self-auto items-center gap-2 rounded-xl bg-cyan-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-cyan-600/20 transition hover:bg-cyan-500"><PlusCircle className="w-4 h-4"/>Novo cliente</Link></div>
    <CRMClientDashboard clients={rows} />
  </div>;
}
