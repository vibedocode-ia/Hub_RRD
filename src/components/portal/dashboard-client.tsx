'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { Users, ClipboardList, MessageSquareCode, FileText, PlusCircle, ArrowRight, ShieldCheck, DollarSign, TrendingDown, AlertTriangle, Truck } from 'lucide-react';

const EMPTY_METRICS = {
  clientsCount: 0,
  pendingRequestsCount: 0,
  sofiaDraftsCount: 0,
  faturamentoTotal: 0,
  gastosTotais: 0,
};

const fetcher = async (url: string) => {
  const response = await fetch(url);
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload?.error || 'Falha ao carregar os dados do dashboard.');
  }

  return payload;
};

export function DashboardClient() {
  const { data, error, isLoading } = useSWR('/api/dashboard/bi', fetcher, {
    refreshInterval: 10000 // atualiza a cada 10s
  });

  if (error) {
    return <div className="text-red-400">Falha ao carregar dashboard. Tente atualizar a página.</div>;
  }
  
  const { metrics = EMPTY_METRICS, alertasEstoque = [], equipesAtivas = [] } = data || {};

  return (
    <div className="space-y-8">
      {/* Title & Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-100 tracking-tight flex items-center gap-2">
            Dashboard Executivo <ShieldCheck className="w-5 h-5 text-cyan-400" />
          </h1>
          <p className="text-sm text-slate-400">
            Hub RR Desentupidora V2.0 - Visão Geral
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
            <MessageSquareCode className="w-4 h-4" /> Rascunhos Sofia ({isLoading ? '...' : metrics.sofiaDraftsCount})
          </Link>
        </div>
      </div>

      {isLoading ? (
        <div className="text-slate-400 animate-pulse">Carregando métricas...</div>
      ) : (
        <>
          {/* Alertas Críticos */}
          {alertasEstoque.length > 0 && (
            <div className="bg-red-950/30 border border-red-900/50 rounded-2xl p-5 relative overflow-hidden">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                  <h2 className="text-sm font-bold text-red-500 uppercase tracking-wider">Alertas de Estoque Crítico</h2>
                </div>
                <Link href="/portal/estoque" className="text-xs font-bold text-red-400 hover:underline">VER ESTOQUE &rarr;</Link>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {alertasEstoque.map((insumo: any) => (
                  <div key={insumo.id} className="bg-slate-900/50 rounded-lg p-3 border border-red-900/30 cursor-pointer hover:bg-red-950/50 transition">
                    <p className="text-sm font-bold text-slate-200">{insumo.nome}</p>
                    <p className="text-xs text-red-400 mt-1">Apenas {Number(insumo.quantidade)} {insumo.unidade} restante(s)</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Metrics Cards Financeiro & CRM */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Faturamento */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 relative overflow-hidden">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Faturamento (Total)</span>
                <DollarSign className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="text-3xl font-black text-emerald-400">R$ {Number(metrics.faturamentoTotal).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
            </div>

            {/* Gastos */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 relative overflow-hidden">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Gastos (Total)</span>
                <TrendingDown className="w-5 h-5 text-rose-400" />
              </div>
              <div className="text-3xl font-black text-rose-400">R$ {Number(metrics.gastosTotais).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
            </div>

            {/* Chamados */}
            <Link href="/portal/chamados" className="block bg-slate-900/60 border border-slate-800 rounded-2xl p-5 relative overflow-hidden hover:bg-slate-800/80 transition cursor-pointer">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Chamados Pendentes</span>
                <ClipboardList className="w-5 h-5 text-amber-400" />
              </div>
              <div className="text-3xl font-black text-amber-400">{metrics.pendingRequestsCount}</div>
            </Link>

            {/* Clientes */}
            <Link href="/portal/clientes" className="block bg-slate-900/60 border border-slate-800 rounded-2xl p-5 relative overflow-hidden hover:bg-slate-800/80 transition cursor-pointer">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Clientes Cadastrados</span>
                <Users className="w-5 h-5 text-cyan-400" />
              </div>
              <div className="text-3xl font-black text-slate-100">{metrics.clientsCount}</div>
            </Link>
          </div>

          {/* Painel Operacional - Equipes */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 relative overflow-hidden">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <Truck className="w-5 h-5 text-cyan-400" /> Equipes em Campo
              </h2>
              <Link href="/portal/operacional" className="text-xs text-cyan-400 hover:underline">Gerenciar Equipes &rarr;</Link>
            </div>
            
            {equipesAtivas.length === 0 ? (
              <p className="text-sm text-slate-400">Nenhuma equipe ativa cadastrada.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {equipesAtivas.map((equipe: any) => (
                  <div key={equipe.id} className="flex items-center justify-between bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
                    <div>
                      <h3 className="text-sm font-bold text-slate-200">{equipe.name}</h3>
                      <p className="text-xs text-slate-400 mt-1">Líder: {equipe.leaderName}</p>
                    </div>
                    <span className="px-2 py-1 bg-emerald-500/10 text-emerald-400 text-[10px] font-bold rounded uppercase">
                      Ativa
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
