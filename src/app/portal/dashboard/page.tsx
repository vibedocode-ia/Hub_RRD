import Link from 'next/link';
import { db, clients, serviceRequests, officialDocuments, sofiaEvents, REQUEST_STATUS, SOFIA_EVENT_STATUS } from '@/db';
import { count, eq } from 'drizzle-orm';
import { Users, ClipboardList, MessageSquareCode, FileText, PlusCircle, ArrowRight, ShieldCheck } from 'lucide-react';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Dashboard Operacional · Hub RR',
};

export default async function DashboardPage() {
  let clientsCount = 0;
  let pendingRequestsCount = 0;
  let sofiaDraftsCount = 0;
  let documentsCount = 0;

  if (db) {
    try {
      const [c] = await db.select({ val: count() }).from(clients);
      clientsCount = c?.val || 0;

      const [r] = await db.select({ val: count() }).from(serviceRequests).where(eq(serviceRequests.status, REQUEST_STATUS.PENDING_REVIEW));
      pendingRequestsCount = r?.val || 0;

      const [s] = await db.select({ val: count() }).from(sofiaEvents).where(eq(sofiaEvents.status, SOFIA_EVENT_STATUS.PENDING_REVIEW));
      sofiaDraftsCount = s?.val || 0;

      const [d] = await db.select({ val: count() }).from(officialDocuments);
      documentsCount = d?.val || 0;
    } catch (e) {
      console.error('Erro ao consultar métricas do dashboard:', e);
    }
  }

  return (
    <div className="space-y-8">
      {/* Title & Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-100 tracking-tight flex items-center gap-2">
            Visão Geral Operacional <ShieldCheck className="w-5 h-5 text-cyan-400" />
          </h1>
          <p className="text-sm text-slate-400">
            Painel de controle em tempo real da RR Desentupidora & Atendimentos Niterói
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/portal/chamados/novo"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-lg shadow-cyan-600/20 transition"
          >
            <PlusCircle className="w-4 h-4" /> Novo Chamado
          </Link>
          <Link
            href="/portal/sofia-drafts"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-400 font-bold text-xs border border-slate-700/80 transition"
          >
            <MessageSquareCode className="w-4 h-4" /> Rascunhos Sofia ({sofiaDraftsCount})
          </Link>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Clientes Cadastrados</span>
            <Users className="w-5 h-5 text-cyan-400" />
          </div>
          <div className="text-3xl font-black text-slate-100">{clientsCount}</div>
          <p className="text-xs text-slate-500 mt-2">Base de clientes e imóveis em Niterói</p>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Chamados Pendentes</span>
            <ClipboardList className="w-5 h-5 text-amber-400" />
          </div>
          <div className="text-3xl font-black text-amber-400">{pendingRequestsCount}</div>
          <p className="text-xs text-slate-500 mt-2">Aguardando revisão ou agendamento</p>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Rascunhos Sofia (WhatsApp)</span>
            <MessageSquareCode className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="text-3xl font-black text-emerald-400">{sofiaDraftsCount}</div>
          <p className="text-xs text-slate-500 mt-2">Áudios e mensagens capturados pela Sofia</p>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Documentos Emitidos</span>
            <FileText className="w-5 h-5 text-blue-400" />
          </div>
          <div className="text-3xl font-black text-slate-100">{documentsCount}</div>
          <p className="text-xs text-slate-500 mt-2">Orçamentos, Recibos e Laudos Técnicos</p>
        </div>
      </div>

      {/* Main Workflow Shortcuts Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900/90 to-cyan-950/40 border border-slate-800 rounded-2xl p-6 relative overflow-hidden">
        <div className="max-w-2xl relative z-10">
          <h2 className="text-lg font-extrabold text-slate-100 mb-2">
            Fluxo Integrado: WhatsApp ➔ Sofia ➔ Hub RR ➔ PDF Canônico
          </h2>
          <p className="text-xs text-slate-300 leading-relaxed mb-6">
            Quando o Rafael conversa com a Sofia no WhatsApp enviando um orçamento ou serviço realizado, a Sofia envia os dados para este Hub. Os pedidos aparecem na fila de rascunhos para conferência antes da emissão do documento oficial.
          </p>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/portal/sofia-drafts"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition"
            >
              Abrir Rascunhos da Sofia <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/portal/crm"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition"
            >
              Ver Cadastro de Clientes
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
