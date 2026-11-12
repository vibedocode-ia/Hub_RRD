'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { 
  Search, 
  Plus, 
  UserRoundPlus, 
  Phone, 
  Edit3, 
  ArrowUpRight,
  Table as TableIcon,
  LayoutGrid,
  Clock
} from 'lucide-react';

export interface LeadItem {
  id: string;
  name: string;
  phone: string;
  status: string;
  serviceType: string | null;
  updatedAt: string | Date;
  convertedAt: string | Date | null;
}

const statusLabels: Record<string, { label: string; dot: string; bg: string; text: string }> = {
  NEW: { label: 'Novo', dot: 'bg-cyan-400', bg: 'bg-cyan-500/10 border-cyan-500/20', text: 'text-cyan-300' },
  QUOTING: { label: 'Em orçamento', dot: 'bg-amber-400', bg: 'bg-amber-500/10 border-amber-500/20', text: 'text-amber-300' },
  APPROVED: { label: 'Aprovado', dot: 'bg-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', text: 'text-emerald-300' },
  LOST: { label: 'Perdido', dot: 'bg-rose-400', bg: 'bg-rose-500/10 border-rose-500/20', text: 'text-rose-400' },
  CONVERTED: { label: 'Convertido', dot: 'bg-emerald-500', bg: 'bg-emerald-500/15 border-emerald-500/30', text: 'text-emerald-400' },
};

export default function LeadsClient({ initialLeads }: { initialLeads: LeadItem[] }) {
  const [search, setSearch] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'NEW' | 'QUOTING' | 'APPROVED' | 'CONVERTED'>('all');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  const metrics = useMemo(() => {
    const total = initialLeads.length;
    const novos = initialLeads.filter(l => l.status === 'NEW').length;
    const orcamento = initialLeads.filter(l => l.status === 'QUOTING').length;
    const aprovados = initialLeads.filter(l => l.status === 'APPROVED' || l.status === 'CONVERTED').length;

    return { total, novos, orcamento, aprovados };
  }, [initialLeads]);

  const filtered = useMemo(() => {
    return initialLeads.filter(lead => {
      if (filterTab !== 'all' && lead.status !== filterTab) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      const matchName = lead.name.toLowerCase().includes(q);
      const matchPhone = lead.phone.toLowerCase().includes(q);
      const matchService = (lead.serviceType || '').toLowerCase().includes(q);
      return matchName || matchPhone || matchService;
    });
  }, [initialLeads, filterTab, search]);

  return (
    <div className="space-y-5">
      {/* 1. Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-zinc-500">
            <span>Operação Comercial</span>
            <span>/</span>
            <span className="text-zinc-300">Pré-atendimento</span>
          </div>
          <div className="mt-1 flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-zinc-100">
              Leads Comerciais
            </h1>
            <span className="inline-flex items-center rounded-md border border-white/[0.08] bg-zinc-900/80 px-2 py-0.5 text-xs font-mono text-zinc-400">
              {initialLeads.length} cadastrados
            </span>
          </div>
          <p className="mt-0.5 text-xs text-zinc-400">
            Contatos em qualificação e orçamento antes de se tornarem clientes oficiais.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/portal/leads/novo"
            className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-cyan-500 px-3.5 text-xs font-medium text-zinc-950 transition-all hover:bg-cyan-400 active:scale-[0.98] shadow-[0_0_15px_rgba(6,182,212,0.3)]"
          >
            <Plus className="size-3.5 stroke-[2.5]" />
            <span>Novo Lead</span>
          </Link>
        </div>
      </div>

      {/* 2. Metric Strip Contínua */}
      <div className="grid grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-white/[0.08] rounded-lg border border-white/[0.08] bg-zinc-950/70 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]">
        <div className="p-3.5 sm:px-4">
          <div className="flex items-center justify-between text-xs text-zinc-400 font-medium">
            <span>Total no Funil</span>
            <UserRoundPlus className="size-3.5 text-zinc-400" />
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl font-semibold font-mono tracking-tight text-zinc-100">{metrics.total}</span>
            <span className="text-[10px] text-zinc-500 font-mono">oportunidades</span>
          </div>
        </div>

        <div className="p-3.5 sm:px-4">
          <div className="flex items-center justify-between text-xs text-zinc-400 font-medium">
            <span>Novos Contatos</span>
            <span className="size-2 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(6,182,212,0.8)]" />
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl font-semibold font-mono tracking-tight text-cyan-300">{metrics.novos}</span>
            <span className="text-[10px] text-zinc-500 font-mono">aguardando</span>
          </div>
        </div>

        <div className="p-3.5 sm:px-4">
          <div className="flex items-center justify-between text-xs text-zinc-400 font-medium">
            <span>Em Orçamento</span>
            <span className="size-2 rounded-full bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.8)]" />
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl font-semibold font-mono tracking-tight text-amber-300">{metrics.orcamento}</span>
            <span className="text-[10px] text-zinc-500 font-mono">proposta aberta</span>
          </div>
        </div>

        <div className="p-3.5 sm:px-4">
          <div className="flex items-center justify-between text-xs text-zinc-400 font-medium">
            <span>Convertidos / Ganhos</span>
            <span className="size-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl font-semibold font-mono tracking-tight text-emerald-400">{metrics.aprovados}</span>
            <span className="text-[10px] text-zinc-500 font-mono">sucesso</span>
          </div>
        </div>
      </div>

      {/* 3. Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-zinc-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, telefone ou tipo de serviço..."
            className="h-8 w-full rounded-md border border-white/[0.08] bg-zinc-900/60 pl-8 pr-3 text-xs text-zinc-200 placeholder:text-zinc-500 focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/20 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-md border border-white/[0.08] bg-zinc-950/80 p-0.5">
            {[
              { id: 'all', label: 'Todos' },
              { id: 'NEW', label: 'Novos' },
              { id: 'QUOTING', label: 'Orçamento' },
              { id: 'APPROVED', label: 'Aprovados' },
              { id: 'CONVERTED', label: 'Convertidos' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilterTab(tab.id as any)}
                className={`rounded px-2.5 py-1 text-xs font-medium transition-all ${
                  filterTab === tab.id
                    ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center rounded-md border border-white/[0.08] bg-zinc-950/80 p-0.5">
            <button
              onClick={() => setViewMode('table')}
              title="Tabela Densa"
              className={`rounded p-1 transition-all ${
                viewMode === 'table' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <TableIcon className="size-3.5" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              title="Cards"
              className={`rounded p-1 transition-all ${
                viewMode === 'grid' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <LayoutGrid className="size-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 4. Tabela de Alta Densidade */}
      {viewMode === 'table' ? (
        <div className="w-full rounded-lg border border-white/[0.08] bg-zinc-950/70 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-white/[0.08] bg-zinc-900/40 text-[11px] font-medium uppercase tracking-wider text-zinc-400">
                <tr>
                  <th className="py-2.5 px-3.5 font-medium">Nome do Lead</th>
                  <th className="py-2.5 px-3 font-medium">Telefone</th>
                  <th className="py-2.5 px-3 font-medium">Serviço Pretendido</th>
                  <th className="py-2.5 px-3 font-medium">Última Atualização</th>
                  <th className="py-2.5 px-3 font-medium">Status</th>
                  <th className="py-2.5 px-3 text-right font-medium">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-xs text-zinc-500 font-mono">
                      Nenhum lead encontrado com o filtro atual.
                    </td>
                  </tr>
                ) : (
                  filtered.map((lead) => {
                    const cfg = statusLabels[lead.status] || {
                      label: lead.status,
                      dot: 'bg-zinc-400',
                      bg: 'bg-zinc-800 border-white/[0.06]',
                      text: 'text-zinc-300',
                    };
                    const dateFormatted = new Date(lead.updatedAt).toLocaleDateString('pt-BR');

                    return (
                      <tr key={lead.id} className="group transition-colors hover:bg-white/[0.02]">
                        <td className="py-2.5 px-3.5">
                          <Link
                            href={`/portal/leads/${lead.id}`}
                            className="font-medium text-zinc-200 group-hover:text-white hover:underline block"
                          >
                            {lead.name}
                          </Link>
                        </td>

                        <td className="py-2.5 px-3 whitespace-nowrap font-mono text-zinc-400">
                          {lead.phone}
                        </td>

                        <td className="py-2.5 px-3 text-zinc-300 font-mono text-[11px]">
                          {lead.serviceType || 'A confirmar'}
                        </td>

                        <td className="py-2.5 px-3 whitespace-nowrap font-mono text-zinc-500 text-[11px]">
                          {dateFormatted}
                        </td>

                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-mono font-medium border ${cfg.bg} ${cfg.text}`}>
                            <span className={`size-1.5 rounded-full ${cfg.dot}`} />
                            {cfg.label}
                          </span>
                        </td>

                        <td className="py-2.5 px-3 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <Link
                              href={`/portal/leads/${lead.id}`}
                              className="inline-flex h-7 items-center rounded border border-white/[0.08] bg-zinc-900/80 px-2 text-[11px] font-medium text-cyan-300 hover:border-cyan-500/30 hover:bg-zinc-800 transition-colors"
                            >
                              Abrir
                            </Link>
                            {!lead.convertedAt && (
                              <Link
                                href={`/portal/leads/${lead.id}/editar`}
                                className="inline-flex h-7 items-center rounded border border-white/[0.08] bg-zinc-900/80 px-2 text-[11px] text-zinc-300 hover:border-white/[0.2] hover:bg-zinc-800 hover:text-white transition-colors"
                              >
                                Editar
                              </Link>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* 5. Modo Cards Compactos */
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((lead) => {
            const cfg = statusLabels[lead.status] || {
              label: lead.status,
              dot: 'bg-zinc-400',
              bg: 'bg-zinc-800 border-white/[0.06]',
              text: 'text-zinc-300',
            };
            return (
              <div
                key={lead.id}
                className="flex flex-col justify-between rounded-lg border border-white/[0.08] bg-zinc-950/70 p-4 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] hover:border-white/[0.18] transition-colors"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-medium text-zinc-100">{lead.name}</h3>
                      <p className="text-xs font-mono text-zinc-400 mt-0.5">{lead.phone}</p>
                    </div>
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-mono border ${cfg.bg} ${cfg.text}`}>
                      <span className={`size-1 rounded-full ${cfg.dot}`} />
                      {cfg.label}
                    </span>
                  </div>

                  <p className="mt-3 text-xs text-zinc-400 font-mono">
                    {lead.serviceType || 'Serviço a confirmar'}
                  </p>
                  <p className="text-[10px] text-zinc-500 font-mono mt-1">
                    Atualizado em {new Date(lead.updatedAt).toLocaleDateString('pt-BR')}
                  </p>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-white/[0.06] pt-3">
                  <Link
                    href={`/portal/leads/${lead.id}`}
                    className="rounded border border-white/[0.08] bg-zinc-900 px-2.5 py-1 text-[11px] font-medium text-cyan-300 hover:text-white"
                  >
                    Ver Lead
                  </Link>
                  {!lead.convertedAt && (
                    <Link
                      href={`/portal/leads/${lead.id}/editar`}
                      className="rounded border border-white/[0.08] bg-zinc-900 px-2 py-1 text-[11px] text-zinc-400 hover:text-white"
                    >
                      Editar
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
