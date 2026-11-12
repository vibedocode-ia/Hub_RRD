'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { 
  Search, 
  Plus, 
  ClipboardList, 
  AlertTriangle, 
  Users, 
  FileText, 
  Edit3, 
  ExternalLink,
  Table as TableIcon,
  LayoutGrid,
  MapPin,
  Clock
} from 'lucide-react';
import DeleteResourceButton from '@/components/DeleteResourceButton';

export interface ChamadoItem {
  id: string;
  code: string;
  serviceType: string;
  priority: string;
  status: string;
  problemReported: string;
  totalAmount: string | null;
  createdAt: string | Date;
  clientName: string;
  clientPhone: string;
  neighborhood: string | null;
  teamName: string | null;
}

export default function ChamadosClient({ initialRequests }: { initialRequests: ChamadoItem[] }) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'urgent' | 'assigned' | 'pending' | 'completed'>('all');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  // Métricas da régua contínua
  const metrics = useMemo(() => {
    const total = initialRequests.length;
    const urgent = initialRequests.filter(r => r.priority === 'URGENTE_24H').length;
    const assigned = initialRequests.filter(r => Boolean(r.teamName)).length;
    const pending = initialRequests.filter(r => r.status !== 'CONCLUIDO' && r.status !== 'CANCELADO').length;

    return { total, urgent, assigned, pending };
  }, [initialRequests]);

  // Filtragem dinâmica instantânea
  const filteredRequests = useMemo(() => {
    return initialRequests.filter(item => {
      // Filtro de aba
      if (statusFilter === 'urgent' && item.priority !== 'URGENTE_24H') return false;
      if (statusFilter === 'assigned' && !item.teamName) return false;
      if (statusFilter === 'pending' && (item.status === 'CONCLUIDO' || item.status === 'CANCELADO')) return false;
      if (statusFilter === 'completed' && item.status !== 'CONCLUIDO') return false;

      // Filtro de busca
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      const codeMatch = item.code.toLowerCase().includes(q);
      const clientMatch = item.clientName.toLowerCase().includes(q);
      const phoneMatch = item.clientPhone.toLowerCase().includes(q);
      const serviceMatch = item.serviceType.toLowerCase().includes(q);
      const neighborhoodMatch = (item.neighborhood || '').toLowerCase().includes(q);
      const teamMatch = (item.teamName || '').toLowerCase().includes(q);
      const problemMatch = (item.problemReported || '').toLowerCase().includes(q);

      return codeMatch || clientMatch || phoneMatch || serviceMatch || neighborhoodMatch || teamMatch || problemMatch;
    });
  }, [initialRequests, statusFilter, search]);

  return (
    <div className="space-y-5">
      {/* 1. Header com Breadcrumb e Ação Primária */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-zinc-500">
            <span>Operação RR</span>
            <span>/</span>
            <span className="text-zinc-300">Chamados de Campo</span>
          </div>
          <div className="mt-1 flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-zinc-100">
              Chamados & Atendimentos
            </h1>
            <span className="inline-flex items-center rounded-md border border-white/[0.08] bg-zinc-900/80 px-2 py-0.5 text-xs font-mono text-zinc-400">
              {initialRequests.length} registros
            </span>
          </div>
          <p className="mt-0.5 text-xs text-zinc-400">
            Despacho de equipes, ordens de serviço e atendimentos 24h em Niterói e região.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/portal/chamados/novo"
            className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-cyan-500 px-3.5 text-xs font-medium text-zinc-950 transition-all hover:bg-cyan-400 active:scale-[0.98] shadow-[0_0_15px_rgba(6,182,212,0.3)]"
          >
            <Plus className="size-3.5 stroke-[2.5]" />
            <span>Abrir Chamado</span>
          </Link>
        </div>
      </div>

      {/* 2. Metric Strip Contínua (Titanium Dark) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-white/[0.08] rounded-lg border border-white/[0.08] bg-zinc-950/70 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]">
        <div className="p-3.5 sm:px-4">
          <div className="flex items-center justify-between text-xs text-zinc-400 font-medium">
            <span>Total Cadastrado</span>
            <ClipboardList className="size-3.5 text-zinc-400" />
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl font-semibold font-mono tracking-tight text-zinc-100">{metrics.total}</span>
            <span className="text-[11px] text-zinc-500 font-mono">ordens</span>
          </div>
        </div>

        <div className="p-3.5 sm:px-4">
          <div className="flex items-center justify-between text-xs text-zinc-400 font-medium">
            <span>Urgência 24h</span>
            <AlertTriangle className="size-3.5 text-rose-400" />
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl font-semibold font-mono tracking-tight text-rose-400">{metrics.urgent}</span>
            <span className="text-[11px] text-zinc-500 font-mono">plantão</span>
          </div>
        </div>

        <div className="p-3.5 sm:px-4">
          <div className="flex items-center justify-between text-xs text-zinc-400 font-medium">
            <span>Equipe Alocada</span>
            <Users className="size-3.5 text-cyan-400" />
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl font-semibold font-mono tracking-tight text-cyan-300">{metrics.assigned}</span>
            <span className="text-[11px] text-zinc-500 font-mono">despachados</span>
          </div>
        </div>

        <div className="p-3.5 sm:px-4">
          <div className="flex items-center justify-between text-xs text-zinc-400 font-medium">
            <span>Em Andamento</span>
            <span className="size-2 rounded-full bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.8)]" />
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl font-semibold font-mono tracking-tight text-amber-300">{metrics.pending}</span>
            <span className="text-[11px] text-zinc-500 font-mono">abertos</span>
          </div>
        </div>
      </div>

      {/* 3. Toolbar Unificada (Linear Style) */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-zinc-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filtrar por código, cliente, bairro, equipe ou serviço..."
            className="h-8 w-full rounded-md border border-white/[0.08] bg-zinc-900/60 pl-8 pr-3 text-xs text-zinc-200 placeholder:text-zinc-500 focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/20 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-md border border-white/[0.08] bg-zinc-950/80 p-0.5">
            {[
              { id: 'all', label: 'Todos' },
              { id: 'urgent', label: '24h Urgente' },
              { id: 'assigned', label: 'Com Equipe' },
              { id: 'pending', label: 'Pendentes' },
              { id: 'completed', label: 'Concluídos' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id as any)}
                className={`rounded px-2.5 py-1 text-xs font-medium transition-all ${
                  statusFilter === tab.id
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
              title="Visualização em Tabela Densa"
              className={`rounded p-1 transition-all ${
                viewMode === 'table' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <TableIcon className="size-3.5" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              title="Visualização em Cards"
              className={`rounded p-1 transition-all ${
                viewMode === 'grid' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <LayoutGrid className="size-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 4. Modo Tabela de Alta Densidade (Supabase / Midday Style) */}
      {viewMode === 'table' ? (
        <div className="w-full rounded-lg border border-white/[0.08] bg-zinc-950/70 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-white/[0.08] bg-zinc-900/40 text-[11px] font-medium uppercase tracking-wider text-zinc-400">
                <tr>
                  <th className="py-2.5 px-3 font-medium">OS / Código</th>
                  <th className="py-2.5 px-3 font-medium">Cliente & Local</th>
                  <th className="py-2.5 px-3 font-medium">Serviço & Relato</th>
                  <th className="py-2.5 px-3 font-medium">Equipe</th>
                  <th className="py-2.5 px-3 font-medium text-right">Valor Total</th>
                  <th className="py-2.5 px-3 font-medium text-center">Prioridade</th>
                  <th className="py-2.5 px-3 font-medium">Status</th>
                  <th className="py-2.5 px-3 text-right font-medium">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {filteredRequests.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-xs text-zinc-500">
                      Nenhum chamado corresponde aos filtros aplicados.
                    </td>
                  </tr>
                ) : (
                  filteredRequests.map((req) => {
                    const isUrgent = req.priority === 'URGENTE_24H';
                    const isCompleted = req.status === 'CONCLUIDO';
                    const dateFormatted = new Date(req.createdAt).toLocaleDateString('pt-BR');

                    return (
                      <tr
                        key={req.id}
                        className="group transition-colors hover:bg-white/[0.02]"
                      >
                        {/* Código OS */}
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span className="font-mono text-zinc-300 font-semibold text-[11px] bg-zinc-900 px-1.5 py-0.5 rounded border border-white/[0.06]">
                            #{req.code}
                          </span>
                          <span className="block text-[10px] text-zinc-500 font-mono mt-0.5">
                            {dateFormatted}
                          </span>
                        </td>

                        {/* Cliente & Local */}
                        <td className="py-2.5 px-3 max-w-[180px]">
                          <div className="font-medium text-zinc-200 group-hover:text-white truncate">
                            {req.clientName}
                          </div>
                          <div className="flex items-center gap-1 text-[11px] text-zinc-400 mt-0.5">
                            <MapPin className="size-2.5 text-zinc-500" />
                            <span className="truncate">{req.neighborhood || 'Niterói'}</span>
                          </div>
                        </td>

                        {/* Serviço & Problema */}
                        <td className="py-2.5 px-3 max-w-xs">
                          <div className="text-zinc-300 font-medium truncate">
                            {req.serviceType}
                          </div>
                          <div className="text-[11px] text-zinc-500 truncate mt-0.5">
                            {req.problemReported}
                          </div>
                        </td>

                        {/* Equipe */}
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          {req.teamName ? (
                            <span className="inline-flex items-center gap-1 rounded bg-cyan-500/10 px-2 py-0.5 text-[11px] font-mono text-cyan-300 border border-cyan-500/20">
                              <Users className="size-2.5" /> {req.teamName}
                            </span>
                          ) : (
                            <span className="text-[11px] text-zinc-500 font-mono italic">
                              Não atribuída
                            </span>
                          )}
                        </td>

                        {/* Valor Total */}
                        <td className="py-2.5 px-3 text-right whitespace-nowrap font-mono font-medium text-emerald-400">
                          R$ {req.totalAmount || '0,00'}
                        </td>

                        {/* Prioridade */}
                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          {isUrgent ? (
                            <span className="inline-flex items-center gap-1 rounded bg-rose-500/10 px-2 py-0.5 text-[10px] font-mono font-medium text-rose-400 border border-rose-500/20">
                              <AlertTriangle className="size-2.5" /> 24h Urgente
                            </span>
                          ) : (
                            <span className="text-[11px] text-zinc-400 font-mono">
                              Normal
                            </span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          {isCompleted ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-400 border border-emerald-500/20">
                              <span className="size-1.5 rounded-full bg-emerald-400" />
                              Concluído
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-400 border border-amber-500/20">
                              <span className="size-1.5 rounded-full bg-amber-400" />
                              Em Aberto
                            </span>
                          )}
                        </td>

                        {/* Ações */}
                        <td className="py-2.5 px-3 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <Link
                              href={`/portal/chamados/${req.id}`}
                              className="inline-flex h-7 items-center gap-1 rounded border border-white/[0.08] bg-zinc-900/80 px-2 text-[11px] font-medium text-cyan-300 transition-colors hover:border-cyan-500/30 hover:bg-zinc-800"
                            >
                              <span>Detalhes</span>
                            </Link>
                            <Link
                              href={`/portal/chamados/${req.id}/editar`}
                              className="inline-flex h-7 items-center gap-1 rounded border border-white/[0.08] bg-zinc-900/80 px-2 text-[11px] text-zinc-300 transition-colors hover:border-white/[0.2] hover:bg-zinc-800 hover:text-white"
                            >
                              <Edit3 className="size-3" />
                            </Link>
                            <Link
                              href={`/portal/sofia-drafts?id=${req.id}`}
                              title="Emitir PDF"
                              className="inline-flex h-7 items-center gap-1 rounded border border-white/[0.08] bg-zinc-900/80 px-2 text-[11px] text-zinc-400 transition-colors hover:border-white/[0.2] hover:bg-zinc-800 hover:text-white"
                            >
                              <FileText className="size-3" />
                            </Link>
                            <DeleteResourceButton
                              endpoint={`/api/chamados/${req.id}`}
                              redirectTo="/portal/chamados"
                              label="Arquivar"
                              confirmText="Arquivar este chamado? O histórico, os documentos e os anexos serão preservados."
                              className="inline-flex h-7 items-center rounded border border-white/[0.08] bg-zinc-900/80 px-2 text-[11px] text-rose-400 transition-colors hover:border-rose-500/30 hover:bg-rose-950/40"
                            />
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
        /* 5. Modo Cards Compactos Refinados */
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredRequests.map((req) => (
            <div
              key={req.id}
              className="flex flex-col justify-between rounded-lg border border-white/[0.08] bg-zinc-950/70 p-4 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] hover:border-white/[0.18] transition-colors"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs font-semibold text-cyan-300">
                    #{req.code}
                  </span>
                  {req.priority === 'URGENTE_24H' ? (
                    <span className="inline-flex items-center gap-1 rounded bg-rose-500/10 px-1.5 py-0.5 text-[10px] font-mono text-rose-400 border border-rose-500/20">
                      24h Urgente
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono text-zinc-500">
                      {new Date(req.createdAt).toLocaleDateString('pt-BR')}
                    </span>
                  )}
                </div>

                <div className="mt-2">
                  <h3 className="text-sm font-medium text-zinc-100 truncate">{req.clientName}</h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    {req.serviceType} — {req.neighborhood || 'Niterói'}
                  </p>
                </div>

                <p className="mt-2 text-xs text-zinc-400 line-clamp-2 min-h-8">
                  {req.problemReported}
                </p>

                <div className="mt-3 flex items-center justify-between border-t border-white/[0.06] pt-2 text-xs">
                  <div>
                    <span className="text-[10px] text-zinc-500 block">Equipe</span>
                    <span className="font-mono text-zinc-300 text-[11px]">
                      {req.teamName || 'Não definida'}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-zinc-500 block">Valor</span>
                    <span className="font-mono font-medium text-emerald-400">
                      R$ {req.totalAmount || '0,00'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between gap-1.5 border-t border-white/[0.06] pt-3">
                <Link
                  href={`/portal/chamados/${req.id}`}
                  className="rounded border border-white/[0.08] bg-zinc-900 px-2.5 py-1 text-[11px] font-medium text-cyan-300 hover:text-white"
                >
                  Ver chamado
                </Link>
                <div className="flex items-center gap-1">
                  <Link
                    href={`/portal/chamados/${req.id}/editar`}
                    className="rounded border border-white/[0.08] bg-zinc-900 px-2 py-1 text-[11px] text-zinc-300 hover:text-white"
                  >
                    Editar
                  </Link>
                  <Link
                    href={`/portal/sofia-drafts?id=${req.id}`}
                    className="rounded border border-white/[0.08] bg-zinc-900 px-2 py-1 text-[11px] text-zinc-400 hover:text-white"
                  >
                    PDF
                  </Link>
                  <DeleteResourceButton
                    endpoint={`/api/chamados/${req.id}`}
                    redirectTo="/portal/chamados"
                    label="Arquivar"
                    confirmText="Arquivar chamado?"
                    className="rounded border border-white/[0.08] bg-zinc-900 px-2 py-1 text-[11px] text-rose-400 hover:border-rose-500/30"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
