'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { useMemo, useState } from 'react';
import { 
  AlertTriangle, 
  CalendarClock, 
  CircleDollarSign, 
  Search, 
  Users,
  Archive,
  RotateCcw,
  Building2,
  ExternalLink
} from 'lucide-react';

export type CrmRow = { 
  id: string; 
  name: string; 
  type: string; 
  phone: string; 
  document: string | null; 
  recurrence: string; 
  source: string | null; 
  customerSince: string | null; 
  nextVisitAt: string | null; 
  createdAt: string; 
  neighborhood: string | null; 
  totalPaid: number; 
  pendingAmount: number; 
  serviceCount: number;
};

const money = (value: number) => 
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(value);

const title = (value: string | null) => (value || 'Não informado').replaceAll('_', ' ');

export default function CRMClientDashboard({ clients }: { clients: CrmRow[] }) {
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'RECURRING' | 'UPCOMING'>('ALL');
  const [period, setPeriod] = useState<'ALL' | '30' | '90'>('ALL');
  const [query, setQuery] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [archiveMessage, setArchiveMessage] = useState('');
  const [archivedClients, setArchivedClients] = useState<CrmRow[]>([]);

  async function loadArchived() {
    const response = await fetch('/api/crm?archived=true');
    const data = await response.json().catch(() => ({}));
    if (!response.ok) { 
      setArchiveMessage(data.error || 'Não foi possível carregar os arquivados.'); 
      return; 
    }
    setArchivedClients(data.clients || []);
    setShowArchived(true);
  }

  async function archiveClient(id: string) {
    const response = await fetch(`/api/crm/${id}`, { method: 'DELETE' });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) { 
      setArchiveMessage(data.error || 'Não foi possível arquivar o cliente.'); 
      return; 
    }
    setArchiveMessage('Cliente arquivado; histórico preservado.');
    window.location.reload();
  }

  async function restoreClient(id: string) {
    const response = await fetch(`/api/crm/${id}`, { 
      method: 'PATCH', 
      headers: { 'content-type': 'application/json' }, 
      body: JSON.stringify({ isActive: true }) 
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) { 
      setArchiveMessage(data.error || 'Não foi possível restaurar o cliente.'); 
      return; 
    }
    setArchivedClients(current => current.filter(client => client.id !== id));
    setArchiveMessage('Cliente restaurado.');
  }

  const since = period === 'ALL' ? 0 : Date.now() - Number(period) * 86400000;

  const filtered = useMemo(() => {
    return clients.filter(client => {
      const text = `${client.name} ${client.type} ${client.neighborhood || ''}`.toLocaleLowerCase('pt-BR');
      const card = filter === 'ALL' || 
        (filter === 'PENDING' && client.pendingAmount > 0) || 
        (filter === 'RECURRING' && ['CLIENTE_MENSAL', 'CONTRATO_FIXO'].includes(client.recurrence)) || 
        (filter === 'UPCOMING' && Boolean(client.nextVisitAt));
      const date = period === 'ALL' || new Date(client.createdAt).getTime() >= since;
      return card && date && text.includes(query.toLocaleLowerCase('pt-BR'));
    });
  }, [clients, filter, period, query, since]);

  const totals = useMemo(() => ({ 
    paid: clients.reduce((sum, client) => sum + client.totalPaid, 0), 
    pending: clients.reduce((sum, client) => sum + client.pendingAmount, 0), 
    recurring: clients.filter(client => ['CLIENTE_MENSAL', 'CONTRATO_FIXO'].includes(client.recurrence)).length, 
    upcoming: clients.filter(client => client.nextVisitAt).length 
  }), [clients]);

  const max = Math.max(1, ...clients.map(client => client.totalPaid));

  return (
    <div className="space-y-5">
      {archiveMessage && (
        <div role="status" className="rounded-md border border-cyan-500/30 bg-cyan-950/30 px-3 py-2 text-xs font-mono text-cyan-300">
          {archiveMessage}
        </div>
      )}

      {/* 1. Header Actions */}
      <div className="flex justify-end">
        <button 
          onClick={loadArchived} 
          className="inline-flex items-center gap-1.5 rounded-md border border-white/[0.08] bg-zinc-900/60 px-2.5 py-1 text-xs font-mono text-zinc-400 hover:border-white/[0.2] hover:text-white transition-colors"
        >
          <Archive className="size-3" />
          <span>Clientes arquivados</span>
        </button>
      </div>

      {showArchived ? (
        <section className="rounded-lg border border-white/[0.08] bg-zinc-950/70 p-4 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]">
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
            <div>
              <h2 className="text-sm font-semibold text-zinc-100">Clientes Arquivados</h2>
              <p className="text-xs text-zinc-500">Histórico de relacionamentos inativos ou congelados</p>
            </div>
            <button 
              onClick={() => setShowArchived(false)} 
              className="text-xs font-mono text-cyan-400 hover:underline"
            >
              ← Voltar à carteira ativa
            </button>
          </div>

          <div className="mt-3 divide-y divide-white/[0.04]">
            {archivedClients.map(client => (
              <div key={client.id} className="flex items-center justify-between py-2.5">
                <div>
                  <span className="text-xs font-medium text-zinc-200">{client.name}</span>
                  <span className="block text-[10px] text-zinc-500 font-mono">{client.phone}</span>
                </div>
                <button 
                  onClick={() => restoreClient(client.id)} 
                  className="inline-flex items-center gap-1 rounded border border-emerald-500/30 bg-emerald-950/40 px-2.5 py-1 text-xs font-medium text-emerald-300 hover:bg-emerald-900/50 transition-colors"
                >
                  <RotateCcw className="size-3" />
                  <span>Restaurar</span>
                </button>
              </div>
            ))}
            {!archivedClients.length && (
              <p className="py-6 text-center text-xs text-zinc-500 font-mono">Nenhum cliente arquivado no momento.</p>
            )}
          </div>
        </section>
      ) : (
        <>
          {/* 2. Metric Strip Contínua com Filtro embutido */}
          <div className="grid grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-white/[0.08] rounded-lg border border-white/[0.08] bg-zinc-950/70 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]">
            {/* Clientes Ativos */}
            <button 
              onClick={() => setFilter('ALL')}
              className={`p-3.5 text-left transition-colors ${filter === 'ALL' ? 'bg-white/[0.04]' : 'hover:bg-white/[0.02]'}`}
            >
              <div className="flex items-center justify-between text-xs text-zinc-400 font-medium">
                <span>Clientes Ativos</span>
                <Users className="size-3.5 text-cyan-400" />
              </div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-xl font-semibold font-mono tracking-tight text-zinc-100">{clients.length}</span>
                <span className="text-[10px] text-zinc-500 font-mono">na carteira</span>
              </div>
            </button>

            {/* Carteira Recorrente */}
            <button 
              onClick={() => setFilter('RECURRING')}
              className={`p-3.5 text-left transition-colors ${filter === 'RECURRING' ? 'bg-white/[0.04]' : 'hover:bg-white/[0.02]'}`}
            >
              <div className="flex items-center justify-between text-xs text-zinc-400 font-medium">
                <span>Carteira Recorrente</span>
                <CircleDollarSign className="size-3.5 text-emerald-400" />
              </div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-xl font-semibold font-mono tracking-tight text-emerald-400">{totals.recurring}</span>
                <span className="text-[10px] text-zinc-500 font-mono">contratos/mensal</span>
              </div>
            </button>

            {/* Pendências */}
            <button 
              onClick={() => setFilter('PENDING')}
              className={`p-3.5 text-left transition-colors ${filter === 'PENDING' ? 'bg-white/[0.04]' : 'hover:bg-white/[0.02]'}`}
            >
              <div className="flex items-center justify-between text-xs text-zinc-400 font-medium">
                <span>Pendências a Receber</span>
                <AlertTriangle className="size-3.5 text-amber-400" />
              </div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-xl font-semibold font-mono tracking-tight text-amber-300">{money(totals.pending)}</span>
              </div>
            </button>

            {/* Próximas Visitas */}
            <button 
              onClick={() => setFilter('UPCOMING')}
              className={`p-3.5 text-left transition-colors ${filter === 'UPCOMING' ? 'bg-white/[0.04]' : 'hover:bg-white/[0.02]'}`}
            >
              <div className="flex items-center justify-between text-xs text-zinc-400 font-medium">
                <span>Próximas Visitas</span>
                <CalendarClock className="size-3.5 text-sky-400" />
              </div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-xl font-semibold font-mono tracking-tight text-sky-300">{totals.upcoming}</span>
                <span className="text-[10px] text-zinc-500 font-mono">agendadas</span>
              </div>
            </button>
          </div>

          {/* 3. Painel de Receita Acumulada & Médias */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <section className="lg:col-span-2 rounded-lg border border-white/[0.08] bg-zinc-950/70 p-4 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]">
              <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
                <div>
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">LTV / Receita Acumulada</h2>
                  <p className="text-[11px] text-zinc-500">Lançamentos efetivados vinculados ao CRM</p>
                </div>
                <span className="text-base font-semibold font-mono text-emerald-400">{money(totals.paid)}</span>
              </div>
              <div className="mt-3 space-y-2.5">
                {clients.filter(client => client.totalPaid > 0).slice(0, 5).map(client => (
                  <Link href={`/portal/crm/${client.id}`} key={client.id} className="block group">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium text-zinc-300 group-hover:text-cyan-300 transition-colors truncate">
                        {client.name}
                      </span>
                      <span className="font-mono text-emerald-400 font-medium ml-2">{money(client.totalPaid)}</span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-zinc-800">
                      <div 
                        className="h-full rounded-full bg-emerald-500" 
                        style={{ width: `${Math.min(100, Math.max(3, (client.totalPaid / max) * 100))}%` }} 
                      />
                    </div>
                  </Link>
                ))}
                {!clients.some(client => client.totalPaid > 0) && (
                  <p className="py-4 text-center text-xs text-zinc-500 font-mono">Nenhum lançamento efetivado no momento.</p>
                )}
              </div>
            </section>

            <section className="rounded-lg border border-white/[0.08] bg-zinc-950/70 p-4 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] flex flex-col justify-between">
              <div>
                <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-300 pb-3 border-b border-white/[0.06]">
                  Estatísticas da Carteira
                </h2>
                <div className="mt-3 space-y-3">
                  <div>
                    <span className="text-[11px] text-zinc-500 block">Ticket / LTV Médio</span>
                    <strong className="block text-base font-mono text-zinc-100">
                      {money(clients.length ? totals.paid / clients.length : 0)}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[11px] text-zinc-500 block">Serviços Concluídos</span>
                    <strong className="block text-base font-mono text-cyan-300">
                      {clients.reduce((sum, client) => sum + client.serviceCount, 0)}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[11px] text-zinc-500 block">Clientes Filtrados</span>
                    <strong className="block text-base font-mono text-zinc-100">
                      {filtered.length} / {clients.length}
                    </strong>
                  </div>
                </div>
              </div>
            </section>
          </div>

          {/* 4. Toolbar de Busca e Período */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-zinc-400" />
              <input 
                value={query} 
                onChange={event => setQuery(event.target.value)} 
                placeholder="Buscar cliente, tipo ou bairro..." 
                className="h-8 w-full rounded-md border border-white/[0.08] bg-zinc-900/60 pl-8 pr-3 text-xs text-zinc-200 placeholder:text-zinc-500 focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/20 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]"
              />
            </div>
            <select 
              value={period} 
              onChange={event => setPeriod(event.target.value as 'ALL' | '30' | '90')} 
              className="h-8 rounded-md border border-white/[0.08] bg-zinc-900 px-2.5 text-xs font-mono text-zinc-300 focus:outline-none"
            >
              <option value="ALL">Todo o período</option>
              <option value="30">Entradas: últimos 30 dias</option>
              <option value="90">Entradas: últimos 90 dias</option>
            </select>
          </div>

          {/* 5. Tabela de Alta Densidade de Clientes */}
          <div className="w-full rounded-lg border border-white/[0.08] bg-zinc-950/70 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-white/[0.08] bg-zinc-900/40 text-[11px] font-medium uppercase tracking-wider text-zinc-400">
                  <tr>
                    <th className="py-2.5 px-3.5 font-medium">Cliente / Local</th>
                    <th className="py-2.5 px-3 font-medium">Relacionamento</th>
                    <th className="py-2.5 px-3 font-medium text-right">LTV Pago</th>
                    <th className="py-2.5 px-3 font-medium text-right">Pendência</th>
                    <th className="py-2.5 px-3 font-medium text-center">Próxima Visita</th>
                    <th className="py-2.5 px-3 text-right font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-xs text-zinc-500">
                        Nenhum cliente corresponde ao filtro atual.
                      </td>
                    </tr>
                  ) : (
                    filtered.map(client => (
                      <tr key={client.id} className="group transition-colors hover:bg-white/[0.02]">
                        <td className="py-2.5 px-3.5">
                          <strong className="text-zinc-200 group-hover:text-white font-medium block">
                            {client.name}
                          </strong>
                          <span className="text-[11px] text-zinc-500 font-mono">
                            {title(client.type)} · {client.neighborhood || 'Niterói'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span className="rounded bg-zinc-900 px-2 py-0.5 text-[11px] font-mono text-zinc-300 border border-white/[0.06]">
                            {title(client.recurrence)}
                          </span>
                          <span className="block text-[10px] text-zinc-500 font-mono mt-0.5">
                            {title(client.source)}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right whitespace-nowrap font-mono font-medium text-emerald-400">
                          {money(client.totalPaid)}
                        </td>
                        <td className="py-2.5 px-3 text-right whitespace-nowrap font-mono">
                          {client.pendingAmount > 0 ? (
                            <span className="text-amber-400 font-medium">{money(client.pendingAmount)}</span>
                          ) : (
                            <span className="text-zinc-500 text-[11px]">Em dia</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center whitespace-nowrap font-mono text-zinc-400 text-[11px]">
                          {client.nextVisitAt ? new Date(client.nextVisitAt).toLocaleDateString('pt-BR') : '—'}
                        </td>
                        <td className="py-2.5 px-3 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <Link 
                              href={`/portal/crm/${client.id}`} 
                              className="inline-flex h-7 items-center rounded border border-white/[0.08] bg-zinc-900/80 px-2 text-[11px] font-medium text-cyan-300 hover:border-cyan-500/30 hover:bg-zinc-800 transition-colors"
                            >
                              Ficha
                            </Link>
                            <button 
                              onClick={() => archiveClient(client.id)} 
                              className="inline-flex h-7 items-center rounded border border-white/[0.08] bg-zinc-900/80 px-2 text-[11px] text-rose-400 hover:border-rose-500/30 hover:bg-rose-950/40 transition-colors"
                            >
                              Arquivar cliente
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
