'use client';

import { useState, useMemo } from 'react';
import { 
  BadgeCheck, 
  FileText, 
  Send, 
  XCircle, 
  Search, 
  Table as TableIcon, 
  LayoutGrid,
  CheckCircle,
  Clock,
  Ban
} from 'lucide-react';
import { PROPOSAL_STATUSES } from '@/lib/proposals';

type Proposal = {
  id: string;
  title: string;
  totalValue: string;
  status: string;
  clientName: string;
  service: string | null;
  officialDocumentId: string | null;
};

const statusConfig: Record<string, { label: string; dot: string; bg: string; text: string }> = {
  DRAFT: { label: 'Rascunho', dot: 'bg-zinc-400', bg: 'bg-zinc-800 border-white/[0.06]', text: 'text-zinc-300' },
  SENT: { label: 'Enviada', dot: 'bg-cyan-400', bg: 'bg-cyan-500/10 border-cyan-500/20', text: 'text-cyan-300' },
  NEGOTIATION: { label: 'Em negociação', dot: 'bg-amber-400', bg: 'bg-amber-500/10 border-amber-500/20', text: 'text-amber-300' },
  APPROVED: { label: 'Aprovada', dot: 'bg-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', text: 'text-emerald-400' },
  REJECTED: { label: 'Recusada', dot: 'bg-rose-400', bg: 'bg-rose-500/10 border-rose-500/20', text: 'text-rose-400' },
  EXPIRED: { label: 'Expirada', dot: 'bg-zinc-500', bg: 'bg-zinc-800 border-white/[0.06]', text: 'text-zinc-400' },
  CANCELLED: { label: 'Cancelada', dot: 'bg-zinc-600', bg: 'bg-zinc-800 border-white/[0.06]', text: 'text-zinc-500' },
  NOT_COUNTED: { label: 'Não contabilizar', dot: 'bg-zinc-600', bg: 'bg-zinc-800 border-white/[0.06]', text: 'text-zinc-500' },
};

export default function PropostasClient({ initial }: { initial: Proposal[] }) {
  const [items, setItems] = useState(initial);
  const [search, setSearch] = useState('');
  const [filterTab, setFilterTab] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [message, setMessage] = useState('');

  const fmt = (v: string) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v || 0));

  async function change(id: string, status: string) {
    const res = await fetch('/api/proposals', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id, status }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMessage(data.error || 'Não foi possível atualizar.');
      return;
    }
    setItems(xs => xs.map(x => (x.id === id ? { ...x, status } : x)));
    setMessage('Status da proposta atualizado.');
  }

  const count = (s: string) => items.filter(x => x.status === s).length;
  const total = items.reduce((a, x) => a + Number(x.totalValue || 0), 0);

  const filtered = useMemo(() => {
    return items.filter(item => {
      if (filterTab !== 'all' && item.status !== filterTab) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchClient = item.clientName.toLowerCase().includes(q);
      const matchService = (item.service || '').toLowerCase().includes(q);
      return matchTitle || matchClient || matchService;
    });
  }, [items, filterTab, search]);

  return (
    <div className="space-y-5">
      {/* 1. Metric Strip Contínua */}
      <div className="grid grid-cols-2 lg:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x divide-white/[0.08] rounded-lg border border-white/[0.08] bg-zinc-950/70 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]">
        <div className="p-3.5 sm:px-4">
          <span className="text-xs text-zinc-400 font-medium block">Total de Propostas</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl font-semibold font-mono tracking-tight text-zinc-100">{items.length}</span>
            <span className="text-[10px] text-zinc-500 font-mono">emitidas</span>
          </div>
        </div>

        <div className="p-3.5 sm:px-4">
          <span className="text-xs text-zinc-400 font-medium block">Em Negociação</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl font-semibold font-mono tracking-tight text-amber-300">
              {count(PROPOSAL_STATUSES.NEGOTIATION)}
            </span>
            <span className="text-[10px] text-zinc-500 font-mono">em aberto</span>
          </div>
        </div>

        <div className="p-3.5 sm:px-4">
          <span className="text-xs text-zinc-400 font-medium block">Aprovadas</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl font-semibold font-mono tracking-tight text-emerald-400">
              {count(PROPOSAL_STATUSES.APPROVED)}
            </span>
            <span className="text-[10px] text-zinc-500 font-mono">fechadas</span>
          </div>
        </div>

        <div className="p-3.5 sm:px-4">
          <span className="text-xs text-zinc-400 font-medium block">Recusadas</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl font-semibold font-mono tracking-tight text-rose-400">
              {count(PROPOSAL_STATUSES.REJECTED)}
            </span>
            <span className="text-[10px] text-zinc-500 font-mono">perdidas</span>
          </div>
        </div>

        <div className="p-3.5 sm:px-4">
          <span className="text-xs text-zinc-400 font-medium block">Pipeline Total</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl font-semibold font-mono tracking-tight text-zinc-100">
              {fmt(String(total))}
            </span>
          </div>
        </div>
      </div>

      {message && (
        <div className="rounded-md border border-cyan-500/30 bg-cyan-950/20 px-3 py-2 text-xs font-mono text-cyan-300">
          {message}
        </div>
      )}

      {/* 2. Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-zinc-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por título, cliente ou tipo de serviço..."
            className="h-8 w-full rounded-md border border-white/[0.08] bg-zinc-900/60 pl-8 pr-3 text-xs text-zinc-200 placeholder:text-zinc-500 focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/20 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-md border border-white/[0.08] bg-zinc-950/80 p-0.5">
            {[
              { id: 'all', label: 'Todas' },
              { id: PROPOSAL_STATUSES.DRAFT, label: 'Rascunho' },
              { id: PROPOSAL_STATUSES.SENT, label: 'Enviadas' },
              { id: PROPOSAL_STATUSES.NEGOTIATION, label: 'Negociação' },
              { id: PROPOSAL_STATUSES.APPROVED, label: 'Aprovadas' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilterTab(tab.id)}
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

      {/* 3. Tabela de Alta Densidade */}
      {viewMode === 'table' ? (
        <div className="w-full rounded-lg border border-white/[0.08] bg-zinc-950/70 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-white/[0.08] bg-zinc-900/40 text-[11px] font-medium uppercase tracking-wider text-zinc-400">
                <tr>
                  <th className="py-2.5 px-3.5 font-medium">Proposta / Título</th>
                  <th className="py-2.5 px-3 font-medium">Cliente</th>
                  <th className="py-2.5 px-3 font-medium">Serviço</th>
                  <th className="py-2.5 px-3 font-medium text-right">Valor Total</th>
                  <th className="py-2.5 px-3 font-medium">Status</th>
                  <th className="py-2.5 px-3 text-right font-medium">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-xs text-zinc-500 font-mono">
                      Nenhuma proposta encontrada.
                    </td>
                  </tr>
                ) : (
                  filtered.map((p) => {
                    const cfg = statusConfig[p.status] || {
                      label: p.status,
                      dot: 'bg-zinc-400',
                      bg: 'bg-zinc-800 border-white/[0.06]',
                      text: 'text-zinc-300',
                    };

                    return (
                      <tr key={p.id} className="group transition-colors hover:bg-white/[0.02]">
                        <td className="py-2.5 px-3.5">
                          <span className="font-medium text-zinc-200 group-hover:text-white block">
                            {p.title}
                          </span>
                        </td>

                        <td className="py-2.5 px-3 whitespace-nowrap text-zinc-300 font-medium">
                          {p.clientName}
                        </td>

                        <td className="py-2.5 px-3 whitespace-nowrap text-zinc-400 font-mono text-[11px]">
                          {p.service || 'Serviço RR'}
                        </td>

                        <td className="py-2.5 px-3 text-right whitespace-nowrap font-mono font-medium text-emerald-400">
                          {fmt(p.totalValue)}
                        </td>

                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-mono font-medium border ${cfg.bg} ${cfg.text}`}>
                            <span className={`size-1.5 rounded-full ${cfg.dot}`} />
                            {cfg.label}
                          </span>
                        </td>

                        <td className="py-2.5 px-3 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {p.status === PROPOSAL_STATUSES.DRAFT && (
                              <button
                                onClick={() => change(p.id, PROPOSAL_STATUSES.SENT)}
                                className="inline-flex h-7 items-center rounded border border-white/[0.08] bg-zinc-900/80 px-2 text-[11px] font-medium text-cyan-300 hover:border-cyan-500/30 hover:bg-zinc-800 transition-colors"
                              >
                                Enviar
                              </button>
                            )}

                            {[PROPOSAL_STATUSES.SENT, PROPOSAL_STATUSES.NEGOTIATION].includes(
                              p.status as typeof PROPOSAL_STATUSES.SENT | typeof PROPOSAL_STATUSES.NEGOTIATION
                            ) && (
                              <>
                                <button
                                  onClick={() => change(p.id, PROPOSAL_STATUSES.APPROVED)}
                                  className="inline-flex h-7 items-center rounded border border-emerald-500/30 bg-emerald-950/40 px-2 text-[11px] font-medium text-emerald-400 hover:bg-emerald-900/50 transition-colors"
                                >
                                  Aprovar
                                </button>
                                <button
                                  onClick={() => change(p.id, PROPOSAL_STATUSES.REJECTED)}
                                  className="inline-flex h-7 items-center rounded border border-rose-500/30 bg-rose-950/40 px-2 text-[11px] text-rose-400 hover:bg-rose-900/50 transition-colors"
                                >
                                  Recusar
                                </button>
                              </>
                            )}

                            {p.officialDocumentId && (
                              <a
                                href={`/portal/documentos/preview/${p.officialDocumentId}`}
                                className="inline-flex h-7 items-center rounded border border-white/[0.08] bg-zinc-900/80 px-2 text-[11px] text-zinc-300 hover:text-white hover:border-white/[0.2] transition-colors"
                              >
                                PDF
                              </a>
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
        /* 4. Modo Cards */
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => {
            const cfg = statusConfig[p.status] || {
              label: p.status,
              dot: 'bg-zinc-400',
              bg: 'bg-zinc-800 border-white/[0.06]',
              text: 'text-zinc-300',
            };

            return (
              <div
                key={p.id}
                className="flex flex-col justify-between rounded-lg border border-white/[0.08] bg-zinc-950/70 p-4 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] hover:border-white/[0.18] transition-colors"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-medium text-zinc-100">{p.title}</h3>
                      <p className="text-xs text-zinc-400 font-mono mt-0.5">{p.clientName} · {p.service || 'Serviço RR'}</p>
                    </div>
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-mono border ${cfg.bg} ${cfg.text}`}>
                      <span className={`size-1 rounded-full ${cfg.dot}`} />
                      {cfg.label}
                    </span>
                  </div>

                  <p className="mt-4 text-xl font-semibold font-mono text-emerald-400">
                    {fmt(p.totalValue)}
                  </p>
                </div>

                <div className="mt-4 flex items-center justify-end gap-1.5 border-t border-white/[0.06] pt-3">
                  {p.status === PROPOSAL_STATUSES.DRAFT && (
                    <button
                      onClick={() => change(p.id, PROPOSAL_STATUSES.SENT)}
                      className="rounded border border-white/[0.08] bg-zinc-900 px-2.5 py-1 text-[11px] font-medium text-cyan-300 hover:text-white"
                    >
                      Marcar enviada
                    </button>
                  )}
                  {[PROPOSAL_STATUSES.SENT, PROPOSAL_STATUSES.NEGOTIATION].includes(
                    p.status as typeof PROPOSAL_STATUSES.SENT | typeof PROPOSAL_STATUSES.NEGOTIATION
                  ) && (
                    <>
                      <button
                        onClick={() => change(p.id, PROPOSAL_STATUSES.APPROVED)}
                        className="rounded border border-emerald-500/30 bg-emerald-950/40 px-2.5 py-1 text-[11px] font-medium text-emerald-400"
                      >
                        Aprovar
                      </button>
                      <button
                        onClick={() => change(p.id, PROPOSAL_STATUSES.REJECTED)}
                        className="rounded border border-rose-500/30 bg-rose-950/40 px-2.5 py-1 text-[11px] text-rose-400"
                      >
                        Recusar
                      </button>
                    </>
                  )}
                  {p.officialDocumentId && (
                    <a
                      href={`/portal/documentos/preview/${p.officialDocumentId}`}
                      className="rounded border border-white/[0.08] bg-zinc-900 px-2.5 py-1 text-[11px] text-zinc-300 hover:text-white"
                    >
                      Abrir PDF
                    </a>
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
