'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { 
  Search, 
  Plus, 
  Wrench, 
  Zap, 
  AlertTriangle, 
  ShieldCheck, 
  Clock3, 
  Edit3, 
  SlidersHorizontal,
  LayoutGrid,
  Table as TableIcon,
  ShieldAlert,
  ArrowUpRight
} from 'lucide-react';
import DeleteResourceButton from '@/components/DeleteResourceButton';

export interface ServiceCatalogItem {
  id: string;
  name: string;
  category: string;
  description: string | null;
  basePrice: string | null;
  priceNotes: string | null;
  warrantyDays: number | null;
  defaultDurationMinutes: number | null;
  requiresInspection: boolean | null;
  isEmergencyEligible: boolean | null;
  status: string;
  displayOrder: number | null;
}

export default function ServicosClient({ initialServices }: { initialServices: ServiceCatalogItem[] }) {
  const [search, setSearch] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'active' | 'emergency' | 'inspection' | 'inactive'>('all');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  // Métricas calculadas
  const metrics = useMemo(() => {
    const total = initialServices.length;
    const active = initialServices.filter(s => s.status === 'ACTIVE').length;
    const emergency = initialServices.filter(s => s.status === 'ACTIVE' && s.isEmergencyEligible).length;
    const inspection = initialServices.filter(s => s.status === 'ACTIVE' && s.requiresInspection).length;
    const configured = initialServices.filter(s => s.status === 'ACTIVE' && Number(s.basePrice || 0) > 0).length;

    return { total, active, emergency, inspection, configured };
  }, [initialServices]);

  // Filtro dinâmico
  const filteredServices = useMemo(() => {
    return initialServices.filter(s => {
      // Filtro por tab
      if (filterTab === 'active' && s.status !== 'ACTIVE') return false;
      if (filterTab === 'inactive' && s.status === 'ACTIVE') return false;
      if (filterTab === 'emergency' && (!s.isEmergencyEligible || s.status !== 'ACTIVE')) return false;
      if (filterTab === 'inspection' && (!s.requiresInspection || s.status !== 'ACTIVE')) return false;

      // Filtro por texto
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      const matchName = s.name.toLowerCase().includes(q);
      const matchCat = s.category.toLowerCase().includes(q);
      const matchDesc = (s.description || '').toLowerCase().includes(q);

      return matchName || matchCat || matchDesc;
    });
  }, [initialServices, filterTab, search]);

  return (
    <div className="space-y-5">
      {/* 1. Header Corporativo com Breadcrumb */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-zinc-500">
            <span>Operação RR</span>
            <span>/</span>
            <span className="text-zinc-300">Catálogo de Serviços</span>
          </div>
          <div className="mt-1 flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-zinc-100">
              Catálogo de Serviços
            </h1>
            <span className="inline-flex items-center rounded-md border border-white/[0.08] bg-zinc-900/80 px-2 py-0.5 text-xs font-mono text-zinc-400">
              {initialServices.length} cadastrados
            </span>
          </div>
          <p className="mt-1 text-xs text-zinc-400">
            Regras de precificação, duração padrão e plantão 24h para Sofia, chamados e ordens de serviço.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/portal/servicos/novo"
            className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-cyan-500 px-3.5 text-xs font-medium text-zinc-950 transition-all hover:bg-cyan-400 active:scale-[0.98] shadow-[0_0_15px_rgba(6,182,212,0.3)]"
          >
            <Plus className="size-3.5 stroke-[2.5]" />
            <span>Novo Serviço</span>
          </Link>
        </div>
      </div>

      {/* 2. Metric Strip Contínua (Midday / Tremor Style) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-white/[0.08] rounded-lg border border-white/[0.08] bg-zinc-950/60 backdrop-blur-sm shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]">
        {/* Ativos */}
        <div className="p-3.5 sm:px-4">
          <div className="flex items-center justify-between text-xs text-zinc-400 font-medium">
            <span>Serviços Ativos</span>
            <span className="size-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl font-semibold font-mono tracking-tight text-zinc-100">{metrics.active}</span>
            <span className="text-[11px] text-zinc-500 font-mono">/ {metrics.total} total</span>
          </div>
        </div>

        {/* Emergência 24h */}
        <div className="p-3.5 sm:px-4">
          <div className="flex items-center justify-between text-xs text-zinc-400 font-medium">
            <span>Plantão 24h</span>
            <Zap className="size-3.5 text-amber-400" />
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl font-semibold font-mono tracking-tight text-zinc-100">{metrics.emergency}</span>
            <span className="text-[11px] text-amber-400/80 font-mono">disponíveis</span>
          </div>
        </div>

        {/* Exigem Avaliação */}
        <div className="p-3.5 sm:px-4">
          <div className="flex items-center justify-between text-xs text-zinc-400 font-medium">
            <span>Exigem Avaliação</span>
            <AlertTriangle className="size-3.5 text-sky-400" />
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl font-semibold font-mono tracking-tight text-zinc-100">{metrics.inspection}</span>
            <span className="text-[11px] text-zinc-500 font-mono">visita prévia</span>
          </div>
        </div>

        {/* Preço Fixo Configurado */}
        <div className="p-3.5 sm:px-4">
          <div className="flex items-center justify-between text-xs text-zinc-400 font-medium">
            <span>Preço Tabelado</span>
            <ShieldCheck className="size-3.5 text-emerald-400" />
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl font-semibold font-mono tracking-tight text-zinc-100">{metrics.configured}</span>
            <span className="text-[11px] text-zinc-500 font-mono">com valor base</span>
          </div>
        </div>
      </div>

      {/* 3. Toolbar Unificada (Linear / Dub Style) */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Campo de Busca Compacto */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-zinc-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filtrar por nome, categoria ou descrição..."
            className="h-8 w-full rounded-md border border-white/[0.08] bg-zinc-900/60 pl-8 pr-3 text-xs text-zinc-200 placeholder:text-zinc-500 focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/20 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]"
          />
        </div>

        {/* Filtros Segmentados + Alternador de Visualização */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Segmented Tabs */}
          <div className="flex items-center rounded-md border border-white/[0.08] bg-zinc-950/80 p-0.5">
            {[
              { id: 'all', label: 'Todos' },
              { id: 'active', label: 'Ativos' },
              { id: 'emergency', label: '24h' },
              { id: 'inspection', label: 'Avaliação' },
              { id: 'inactive', label: 'Inativos' },
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

          {/* Toggle Tabela / Cards */}
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

      {/* 4. Tabela de Alta Densidade (Modo Principal) */}
      {viewMode === 'table' ? (
        <div className="w-full rounded-lg border border-white/[0.08] bg-zinc-950/70 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-white/[0.08] bg-zinc-900/40 text-[11px] font-medium uppercase tracking-wider text-zinc-400">
                <tr>
                  <th className="py-2.5 px-3.5 font-medium">Serviço / Descrição</th>
                  <th className="py-2.5 px-3 font-medium">Categoria</th>
                  <th className="py-2.5 px-3 font-medium text-right">Preço Base</th>
                  <th className="py-2.5 px-3 font-medium text-center">Garantia</th>
                  <th className="py-2.5 px-3 font-medium text-center">Duração</th>
                  <th className="py-2.5 px-3 font-medium">Modalidade</th>
                  <th className="py-2.5 px-3 font-medium">Status</th>
                  <th className="py-2.5 px-3 text-right font-medium">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {filteredServices.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-xs text-zinc-500">
                      Nenhum serviço encontrado com os filtros atuais.
                    </td>
                  </tr>
                ) : (
                  filteredServices.map((service) => {
                    const isActive = service.status === 'ACTIVE';
                    const basePriceNum = Number(service.basePrice || 0);

                    return (
                      <tr
                        key={service.id}
                        className="group transition-colors hover:bg-white/[0.02]"
                      >
                        {/* Nome + Descrição Operacional */}
                        <td className="py-2.5 px-3.5 max-w-xs sm:max-w-md">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-zinc-200 group-hover:text-white">
                              {service.name}
                            </span>
                            {service.isEmergencyEligible && (
                              <span className="inline-flex items-center gap-0.5 rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-mono text-amber-300 border border-amber-500/20">
                                <Zap className="size-2.5" /> 24h
                              </span>
                            )}
                          </div>
                          {service.description && (
                            <p className="mt-0.5 truncate text-[11px] text-zinc-500">
                              {service.description}
                            </p>
                          )}
                        </td>

                        {/* Categoria */}
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span className="rounded bg-zinc-900 px-2 py-0.5 text-[11px] font-mono text-zinc-400 border border-white/[0.06]">
                            {service.category}
                          </span>
                        </td>

                        {/* Preço Base */}
                        <td className="py-2.5 px-3 text-right whitespace-nowrap font-mono font-medium text-zinc-200">
                          {basePriceNum > 0 ? (
                            new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(basePriceNum)
                          ) : (
                            <span className="text-[11px] text-zinc-500 italic font-sans">Sob Consulta</span>
                          )}
                        </td>

                        {/* Garantia */}
                        <td className="py-2.5 px-3 text-center whitespace-nowrap font-mono text-zinc-400">
                          {service.warrantyDays ? `${service.warrantyDays}d` : '—'}
                        </td>

                        {/* Duração */}
                        <td className="py-2.5 px-3 text-center whitespace-nowrap font-mono text-zinc-400">
                          {service.defaultDurationMinutes ? `${service.defaultDurationMinutes}min` : '—'}
                        </td>

                        {/* Modalidade */}
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          {service.requiresInspection ? (
                            <span className="inline-flex items-center gap-1 text-[11px] text-amber-400/90">
                              <AlertTriangle className="size-3" /> Exige Visita
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400/90">
                              <ShieldCheck className="size-3" /> Direto
                            </span>
                          )}
                        </td>

                        {/* Status com Micro-Dot */}
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          {isActive ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-400 border border-emerald-500/20">
                              <span className="size-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
                              Ativo
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-800/80 px-2 py-0.5 text-[11px] font-medium text-zinc-400 border border-white/[0.06]">
                              <span className="size-1.5 rounded-full bg-zinc-500" />
                              Inativo
                            </span>
                          )}
                        </td>

                        {/* Ações */}
                        <td className="py-2.5 px-3 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <Link
                              href={`/portal/servicos/${service.id}/editar`}
                              className="inline-flex h-7 items-center gap-1 rounded border border-white/[0.08] bg-zinc-900/80 px-2 text-[11px] font-medium text-zinc-300 transition-colors hover:border-white/[0.2] hover:bg-zinc-800 hover:text-white"
                            >
                              <Edit3 className="size-3" />
                              <span>Editar</span>
                            </Link>
                            <DeleteResourceButton
                              endpoint={`/api/services/${service.id}`}
                              confirmText={`Arquivar o serviço ${service.name}?`}
                              className="inline-flex h-7 items-center rounded border border-white/[0.08] bg-zinc-900/80 px-2 text-[11px] text-rose-400 transition-colors hover:border-rose-500/30 hover:bg-rose-950/40 hover:text-rose-300"
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
        /* 5. Modo Cards Compactos (Alternativo Refinado) */
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredServices.map((service) => {
            const isActive = service.status === 'ACTIVE';
            const basePriceNum = Number(service.basePrice || 0);

            return (
              <div
                key={service.id}
                className={`flex flex-col justify-between rounded-lg border bg-zinc-950/70 p-4 transition-all shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] ${
                  isActive
                    ? 'border-white/[0.08] hover:border-white/[0.18]'
                    : 'border-white/[0.04] opacity-60'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-mono uppercase text-zinc-500">
                        {service.category}
                      </span>
                      <h3 className="text-sm font-medium text-zinc-100">{service.name}</h3>
                    </div>
                    {isActive ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-400 border border-emerald-500/20">
                        <span className="size-1 rounded-full bg-emerald-400" /> Ativo
                      </span>
                    ) : (
                      <span className="rounded-full bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-400">
                        Inativo
                      </span>
                    )}
                  </div>

                  <p className="mt-2 text-xs text-zinc-400 line-clamp-2 min-h-8">
                    {service.description || 'Sem descrição cadastrada.'}
                  </p>

                  <div className="mt-3 flex items-center justify-between border-t border-white/[0.06] pt-2 text-xs">
                    <div>
                      <span className="text-[10px] text-zinc-500 block">Preço Base</span>
                      <span className="font-mono font-medium text-zinc-200">
                        {basePriceNum > 0
                          ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(basePriceNum)
                          : 'Sob Consulta'}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-zinc-500 block">Garantia / Duração</span>
                      <span className="font-mono text-zinc-400 text-[11px]">
                        {service.warrantyDays}d · {service.defaultDurationMinutes}min
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between gap-2 border-t border-white/[0.06] pt-3">
                  <div className="flex items-center gap-1 text-[10px] font-mono text-zinc-400">
                    {service.isEmergencyEligible && (
                      <span className="rounded bg-amber-500/10 px-1 py-0.5 text-amber-300 border border-amber-500/20">
                        24h
                      </span>
                    )}
                    {service.requiresInspection && (
                      <span className="rounded bg-sky-500/10 px-1 py-0.5 text-sky-300 border border-sky-500/20">
                        Visita
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Link
                      href={`/portal/servicos/${service.id}/editar`}
                      className="rounded border border-white/[0.08] bg-zinc-900 px-2 py-1 text-[11px] text-zinc-300 hover:text-white hover:border-white/[0.2]"
                    >
                      Editar
                    </Link>
                    <DeleteResourceButton
                      endpoint={`/api/services/${service.id}`}
                      confirmText={`Arquivar ${service.name}?`}
                      className="rounded border border-white/[0.08] bg-zinc-900 px-2 py-1 text-[11px] text-rose-400 hover:border-rose-500/30"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
