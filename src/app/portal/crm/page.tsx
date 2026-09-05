import Link from 'next/link';
import { db, clients, clientAddresses } from '@/db';
import { eq, desc } from 'drizzle-orm';
import { Users, PlusCircle, Search, MapPin, Phone, Building2, User } from 'lucide-react';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'CRM de Clientes · Hub RR',
};

export default async function CRMPage() {
  let clientList: Array<{
    id: string;
    type: string;
    name: string;
    phone: string;
    document: string | null;
    source: string | null;
    createdAt: Date;
    neighborhood?: string | null;
  }> = [];

  if (db) {
    try {
      const records = await db
        .select({
          id: clients.id,
          type: clients.type,
          name: clients.name,
          phone: clients.phone,
          document: clients.document,
          source: clients.source,
          createdAt: clients.createdAt,
          neighborhood: clientAddresses.neighborhood,
        })
        .from(clients)
        .leftJoin(clientAddresses, eq(clients.id, clientAddresses.clientId))
        .orderBy(desc(clients.createdAt));

      clientList = records;
    } catch (error) {
      console.error('Erro ao listar clientes:', error);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-100 tracking-tight flex items-center gap-2">
            CRM de Clientes & Imóveis <Users className="w-5 h-5 text-cyan-400" />
          </h1>
          <p className="text-sm text-slate-400">
            Base de clientes, condomínios, restaurantes e residências atendidas pela RR
          </p>
        </div>

        <Link
          href="/portal/crm/novo"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-lg shadow-cyan-600/20 transition self-start md:self-auto"
        >
          <PlusCircle className="w-4 h-4" /> Novo Cliente
        </Link>
      </div>

      {/* Table / List */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            Total Cadastrado: {clientList.length}
          </div>
        </div>

        {clientList.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-300 mb-1">Nenhum cliente cadastrado ainda</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
              Os clientes são salvos automaticamente quando a Sofia processa orçamentos pelo WhatsApp ou ao cadastrar manualmente.
            </p>
            <Link
              href="/portal/crm/novo"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition"
            >
              Cadastrar Primeiro Cliente
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-950/80 text-slate-400 text-[11px] uppercase font-bold border-b border-slate-800">
                  <th className="p-4">Tipo / Nome</th>
                  <th className="p-4">CPF / CNPJ</th>
                  <th className="p-4">Telefone</th>
                  <th className="p-4">Bairro / Cidade</th>
                  <th className="p-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {clientList.map((client) => (
                  <tr key={client.id} className="hover:bg-slate-800/40 transition">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-cyan-950/80 border border-cyan-500/30 text-cyan-400">
                          {client.type === 'PF' ? <User className="w-4 h-4" /> : <Building2 className="w-4 h-4" />}
                        </div>
                        <div>
                          <div className="font-bold text-slate-200">{client.name}</div>
                          <div className="text-[10px] text-cyan-400 uppercase font-semibold">{client.type}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-xs font-mono text-slate-300">
                      {client.document || '—'}
                    </td>
                    <td className="p-4 text-xs text-slate-300">
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-500" />
                        {client.phone}
                      </div>
                    </td>
                    <td className="p-4 text-xs text-slate-300">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-500" />
                        {client.neighborhood || 'Niterói/RJ'}
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <Link
                        href={`/portal/crm/${client.id}`}
                        className="text-xs font-bold text-cyan-400 hover:text-cyan-300 bg-cyan-950/40 border border-cyan-500/30 px-3 py-1.5 rounded-lg transition inline-block"
                      >
                        Ficha Completa ➔
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
