import Link from 'next/link';
import DeleteResourceButton from '@/components/DeleteResourceButton';
import { db, serviceRequests, clients, clientAddresses } from '@/db';
import { eq, desc } from 'drizzle-orm';
import { ClipboardList, PlusCircle, AlertTriangle, CheckCircle, Clock, FileText } from 'lucide-react';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Chamados & Atendimentos · Hub RR',
};

export default async function ChamadosPage() {
  let requestsList: Array<{
    id: string;
    code: string;
    serviceType: string;
    priority: string;
    status: string;
    problemReported: string;
    totalAmount: string | null;
    createdAt: Date;
    clientName: string;
    clientPhone: string;
    neighborhood: string | null;
  }> = [];

  if (db) {
    try {
      const records = await db
        .select({
          id: serviceRequests.id,
          code: serviceRequests.code,
          serviceType: serviceRequests.serviceType,
          priority: serviceRequests.priority,
          status: serviceRequests.status,
          problemReported: serviceRequests.problemReported,
          totalAmount: serviceRequests.totalAmount,
          createdAt: serviceRequests.createdAt,
          clientName: clients.name,
          clientPhone: clients.phone,
          neighborhood: clientAddresses.neighborhood,
        })
        .from(serviceRequests)
        .innerJoin(clients, eq(serviceRequests.clientId, clients.id))
        .leftJoin(clientAddresses, eq(serviceRequests.addressId, clientAddresses.id))
        .orderBy(desc(serviceRequests.createdAt));

      requestsList = records;
    } catch (error) {
      console.error('Erro ao buscar chamados:', error);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-100 tracking-tight flex items-center gap-2">
            Chamados & Atendimentos Operacionais <ClipboardList className="w-5 h-5 text-cyan-400" />
          </h1>
          <p className="text-sm text-slate-400">
            Controle de serviços de campo, desentupimentos e hidrojateamentos em Niterói
          </p>
        </div>

        <Link
          href="/portal/chamados/novo"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-lg shadow-cyan-600/20 transition self-start md:self-auto"
        >
          <PlusCircle className="w-4 h-4" /> ABRIR CHAMADO
        </Link>
      </div>

      {/* List */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            Total de Atendimentos: {requestsList.length}
          </div>
        </div>

        {requestsList.length === 0 ? (
          <div className="p-12 text-center">
            <ClipboardList className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-300 mb-1">Nenhum chamado aberto no momento</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
              Os chamados enviados pelo WhatsApp da Sofia ou abertos manualmente ficam listados aqui para despacho de equipes.
            </p>
            <Link
              href="/portal/chamados/novo"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition"
            >
              Abrir Novo Atendimento
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/60">
            {requestsList.map((req) => (
              <div key={req.id} className="p-4 hover:bg-slate-800/40 transition flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-950/60 border border-cyan-500/30 px-2 py-0.5 rounded">
                      {req.code}
                    </span>
                    <span className="text-sm font-bold text-slate-100">{req.clientName}</span>
                    {req.priority === 'URGENTE_24H' && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase bg-red-950/80 text-red-400 border border-red-800 px-2 py-0.5 rounded-full">
                        <AlertTriangle className="w-3 h-3" /> URGENTE 24H
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-300 font-semibold">{req.serviceType} — {req.neighborhood || 'Niterói'}</div>
                  <div className="text-xs text-slate-400 line-clamp-1">{req.problemReported}</div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <div className="text-sm font-black text-emerald-400">R$ {req.totalAmount || '0,00'}</div>
                    <div className="text-[10px] text-slate-500">{new Date(req.createdAt).toLocaleDateString('pt-BR')}</div>
                  </div>
                  <Link href={`/portal/chamados/${req.id}/editar`} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold text-xs transition">Editar</Link>
                  <DeleteResourceButton endpoint={`/api/chamados/${req.id}`} redirectTo="/portal/chamados" confirmText="Excluir este chamado e documentos vinculados?" />
                  <Link
                    href={`/portal/sofia-drafts?id=${req.id}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs transition"
                  >
                    <FileText className="w-3.5 h-3.5" /> Emitir PDF
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
