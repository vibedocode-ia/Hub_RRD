'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { 
  Users, 
  ClipboardList, 
  MessageSquareCode, 
  Plus, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Truck,
  ArrowUpRight,
  ShieldCheck,
  Package
} from 'lucide-react';

const EMPTY_METRICS = {
  clientsCount: 0,
  pendingRequestsCount: 0,
  sofiaDraftsCount: 0,
  faturamentoTotal: 0,
  gastosTotais: 0,
  previousMonthRevenue: 0,
  currentMonthRevenue: 0,
  currentMonthForecast: 0,
  currentMonthExpenses: 0,
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
    refreshInterval: 10000,
  });

  if (error) {
    return (
      <div className="rounded-lg border border-rose-500/20 bg-rose-950/20 p-4 text-xs text-rose-300">
        Falha ao carregar métricas operacionais. Tente atualizar a página.
      </div>
    );
  }

  const { metrics = EMPTY_METRICS, financialGrowth = [], alertasEstoque = [], equipesAtivas = [] } = data || {};
  const formatMoney = (value: unknown) =>
    `R$ ${Number(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  const peakGrowth = Math.max(
    1,
    ...financialGrowth.flatMap((item: any) => [Number(item.revenue || 0), Number(item.forecast || 0)])
  );

  return (
    <div className="space-y-5">
      {/* 1. Header Corporativo com Breadcrumbs e Ações Rápidas */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-zinc-500">
            <span>Hub RR</span>
            <span>/</span>
            <span className="text-zinc-300">Visão Geral</span>
          </div>
          <h1 className="mt-1 text-xl sm:text-2xl font-semibold tracking-tight text-zinc-100 flex items-center gap-2">
            Dashboard Executivo
          </h1>
          <p className="mt-0.5 text-xs text-zinc-400">
            Telemetria financeira, chamados de campo e prontidão operacional em tempo real.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/portal/sofia-drafts"
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-white/[0.08] bg-zinc-900/80 px-3 text-xs font-medium text-zinc-300 transition-colors hover:border-white/[0.2] hover:bg-zinc-800 hover:text-white"
          >
            <MessageSquareCode className="size-3.5 text-zinc-400" />
            <span>Rascunhos Sofia</span>
            <span className="ml-1 rounded bg-zinc-800 px-1.5 py-0.2 text-[10px] font-mono text-cyan-400">
              {isLoading ? '…' : metrics.sofiaDraftsCount}
            </span>
          </Link>
          <Link
            href="/portal/chamados/novo"
            className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md bg-cyan-500 px-3 text-xs font-medium text-zinc-950 transition-all hover:bg-cyan-400 active:scale-[0.98] shadow-[0_0_15px_rgba(6,182,212,0.3)]"
          >
            <Plus className="size-3.5 stroke-[2.5]" />
            <span>Novo Chamado</span>
          </Link>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 rounded-lg border border-white/[0.08] bg-zinc-950/60 p-6 text-xs text-zinc-400">
          <span className="size-2 rounded-full bg-cyan-400 animate-ping" />
          <span>Carregando telemetria operacional…</span>
        </div>
      ) : (
        <>
          {/* 2. Régua Financeira & Operacional (Midday / Tremor Style) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-white/[0.08] rounded-lg border border-white/[0.08] bg-zinc-950/70 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]">
            {/* Faturamento do Mês */}
            <Link
              href="/portal/financeiro?tipo=RECEITA"
              className="group p-4 transition-colors hover:bg-white/[0.02]"
            >
              <div className="flex items-center justify-between text-xs text-zinc-400 font-medium">
                <span>Faturamento Mês</span>
                <span className="inline-flex items-center gap-0.5 text-[10px] font-mono text-emerald-400">
                  <TrendingUp className="size-3" /> Realizado
                </span>
              </div>
              <div className="mt-1 text-xl sm:text-2xl font-semibold font-mono tracking-tight text-emerald-400">
                {formatMoney(metrics.currentMonthRevenue)}
              </div>
              <div className="mt-1 text-[11px] text-zinc-500 font-mono flex items-center justify-between">
                <span>Anterior: {formatMoney(metrics.previousMonthRevenue)}</span>
                <ArrowUpRight className="size-3 opacity-0 group-hover:opacity-100 transition-opacity text-zinc-400" />
              </div>
            </Link>

            {/* Gastos do Mês */}
            <Link
              href="/portal/financeiro?tipo=DESPESA"
              className="group p-4 transition-colors hover:bg-white/[0.02]"
            >
              <div className="flex items-center justify-between text-xs text-zinc-400 font-medium">
                <span>Gastos Mês</span>
                <span className="inline-flex items-center gap-0.5 text-[10px] font-mono text-rose-400">
                  <TrendingDown className="size-3" /> Despesas
                </span>
              </div>
              <div className="mt-1 text-xl sm:text-2xl font-semibold font-mono tracking-tight text-rose-400">
                {formatMoney(metrics.currentMonthExpenses)}
              </div>
              <div className="mt-1 text-[11px] text-zinc-500 font-mono flex items-center justify-between">
                <span>Previsão: {formatMoney(metrics.currentMonthForecast)}</span>
                <ArrowUpRight className="size-3 opacity-0 group-hover:opacity-100 transition-opacity text-zinc-400" />
              </div>
            </Link>

            {/* Chamados Pendentes */}
            <Link
              href="/portal/chamados"
              className="group p-4 transition-colors hover:bg-white/[0.02]"
            >
              <div className="flex items-center justify-between text-xs text-zinc-400 font-medium">
                <span>Chamados Pendentes</span>
                <ClipboardList className="size-3.5 text-amber-400" />
              </div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-xl sm:text-2xl font-semibold font-mono tracking-tight text-amber-400">
                  {metrics.pendingRequestsCount}
                </span>
                <span className="text-[11px] text-zinc-500 font-mono">em aberto</span>
              </div>
              <div className="mt-1 text-[11px] text-zinc-500 flex items-center justify-between">
                <span>Acompanhar campo</span>
                <ArrowUpRight className="size-3 opacity-0 group-hover:opacity-100 transition-opacity text-zinc-400" />
              </div>
            </Link>

            {/* Clientes Cadastrados */}
            <Link
              href="/portal/crm"
              className="group p-4 transition-colors hover:bg-white/[0.02]"
            >
              <div className="flex items-center justify-between text-xs text-zinc-400 font-medium">
                <span>Clientes Cadastrados</span>
                <Users className="size-3.5 text-cyan-400" />
              </div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-xl sm:text-2xl font-semibold font-mono tracking-tight text-zinc-100">
                  {metrics.clientsCount}
                </span>
                <span className="text-[11px] text-zinc-500 font-mono">ativos</span>
              </div>
              <div className="mt-1 text-[11px] text-zinc-500 flex items-center justify-between">
                <span>Carteira CRM</span>
                <ArrowUpRight className="size-3 opacity-0 group-hover:opacity-100 transition-opacity text-zinc-400" />
              </div>
            </Link>
          </div>

          {/* 3. Gráfico de Crescimento Financeiro */}
          <Link
            href="/portal/financeiro"
            className="block rounded-lg border border-white/[0.08] bg-zinc-950/70 p-4 sm:p-5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] hover:border-white/[0.15] transition-colors"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <div>
                <h2 className="text-sm font-medium text-zinc-200">Crescimento Financeiro & Comparativo</h2>
                <p className="text-xs text-zinc-500">Histórico de receita realizada vs. previsão por competência mensal</p>
              </div>
              <div className="flex items-center gap-3 text-xs font-mono">
                <span className="inline-flex items-center gap-1.5 text-zinc-400">
                  <span className="size-2 rounded-sm bg-emerald-500" /> Realizado
                </span>
                <span className="inline-flex items-center gap-1.5 text-zinc-400">
                  <span className="size-2 rounded-sm bg-cyan-400/80" /> Previsto
                </span>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4 items-end h-36 border-t border-white/[0.06] pt-4">
              {financialGrowth.map((item: any) => (
                <div key={item.label} className="h-full flex flex-col justify-end gap-2 text-center">
                  <div className="flex gap-1.5 items-end justify-center h-24">
                    <span
                      title={`Realizado: ${formatMoney(item.revenue)}`}
                      className="w-4 rounded-t bg-emerald-500/80 transition-all hover:bg-emerald-400"
                      style={{ height: `${Math.max(4, (Number(item.revenue || 0) / peakGrowth) * 100)}%` }}
                    />
                    <span
                      title={`Previsto: ${formatMoney(item.forecast)}`}
                      className="w-4 rounded-t bg-cyan-400/70 transition-all hover:bg-cyan-300"
                      style={{ height: `${Math.max(4, (Number(item.forecast || 0) / peakGrowth) * 100)}%` }}
                    />
                  </div>
                  <span className="text-[11px] font-mono font-medium text-zinc-400 uppercase tracking-wider">
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </Link>

          {/* 4. Grade Operacional Dupla: Equipes e Alertas */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Equipes em Campo */}
            <div className="rounded-lg border border-white/[0.08] bg-zinc-950/70 p-4 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]">
              <div className="flex items-center justify-between pb-3 border-b border-white/[0.06] mb-3">
                <div className="flex items-center gap-2 text-xs font-medium text-zinc-200">
                  <Truck className="size-3.5 text-cyan-400" />
                  <span>Equipes em Campo</span>
                </div>
                <Link
                  href="/portal/operacional"
                  className="text-[11px] font-mono text-zinc-400 hover:text-white transition-colors"
                >
                  Gerenciar frotas →
                </Link>
              </div>

              {equipesAtivas.length === 0 ? (
                <p className="text-xs text-zinc-500 py-3">Nenhuma equipe ativa cadastrada no momento.</p>
              ) : (
                <div className="divide-y divide-white/[0.04]">
                  {equipesAtivas.map((equipe: any) => (
                    <div
                      key={equipe.id}
                      className="flex items-center justify-between py-2.5 hover:bg-white/[0.02] px-1 rounded transition-colors"
                    >
                      <div>
                        <h3 className="text-xs font-medium text-zinc-200">{equipe.name}</h3>
                        <p className="text-[11px] text-zinc-500 font-mono mt-0.5">
                          Líder: {equipe.leaderName || 'Não definido'}
                        </p>
                      </div>
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-mono font-medium text-emerald-400 border border-emerald-500/20">
                        <span className="size-1 rounded-full bg-emerald-400" /> Ativa
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Alertas de Estoque Crítico */}
            <div className="rounded-lg border border-white/[0.08] bg-zinc-950/70 p-4 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]">
              <div className="flex items-center justify-between pb-3 border-b border-white/[0.06] mb-3">
                <div className="flex items-center gap-2 text-xs font-medium text-zinc-200">
                  <Package className="size-3.5 text-amber-400" />
                  <span>Alertas de Estoque</span>
                </div>
                <Link
                  href="/portal/estoque"
                  className="text-[11px] font-mono text-zinc-400 hover:text-white transition-colors"
                >
                  Ver almoxarifado →
                </Link>
              </div>

              {alertasEstoque.length === 0 ? (
                <div className="flex items-center gap-2 text-xs text-emerald-400 py-3 font-mono">
                  <ShieldCheck className="size-4" />
                  <span>Todos os insumos operacionais em níveis adequados.</span>
                </div>
              ) : (
                <div className="divide-y divide-white/[0.04]">
                  {alertasEstoque.map((insumo: any) => (
                    <div
                      key={insumo.id}
                      className="flex items-center justify-between py-2.5 hover:bg-white/[0.02] px-1 rounded transition-colors"
                    >
                      <div>
                        <p className="text-xs font-medium text-zinc-200">{insumo.nome}</p>
                        <p className="text-[11px] text-rose-400 font-mono mt-0.5">
                          Apenas {Number(insumo.quantidade)} {insumo.unidade} disponível
                        </p>
                      </div>
                      <span className="inline-flex items-center gap-1 rounded bg-rose-500/10 px-1.5 py-0.5 text-[10px] font-mono text-rose-400 border border-rose-500/20">
                        <AlertTriangle className="size-2.5" /> Crítico
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
