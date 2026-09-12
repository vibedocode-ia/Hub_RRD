'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { useMemo, useState } from 'react';
import { AlertTriangle, CalendarClock, CircleDollarSign, Search, Users } from 'lucide-react';

export type CrmRow = { id: string; name: string; type: string; phone: string; document: string | null; recurrence: string; source: string | null; customerSince: string | null; nextVisitAt: string | null; createdAt: string; neighborhood: string | null; totalPaid: number; pendingAmount: number; serviceCount: number }
const money = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(value)
const title = (value: string | null) => (value || 'Não informado').replaceAll('_', ' ')

export default function CRMClientDashboard({ clients }: { clients: CrmRow[] }) {
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'RECURRING' | 'UPCOMING'>('ALL')
  const [period, setPeriod] = useState<'ALL' | '30' | '90'>('ALL')
  const [query, setQuery] = useState('')
  const filtered = useMemo(() => {
    const since = period === 'ALL' ? 0 : Date.now() - Number(period) * 86400000
    return clients.filter(client => {
      const text = `${client.name} ${client.type} ${client.neighborhood || ''}`.toLocaleLowerCase('pt-BR')
      const card = filter === 'ALL' || (filter === 'PENDING' && client.pendingAmount > 0) || (filter === 'RECURRING' && ['CLIENTE_MENSAL', 'CONTRATO_FIXO'].includes(client.recurrence)) || (filter === 'UPCOMING' && Boolean(client.nextVisitAt))
      const date = period === 'ALL' || new Date(client.createdAt).getTime() >= since
      return card && date && text.includes(query.toLocaleLowerCase('pt-BR'))
    })
  }, [clients, filter, period, query])
  const totals = useMemo(() => ({ paid: clients.reduce((sum, client) => sum + client.totalPaid, 0), pending: clients.reduce((sum, client) => sum + client.pendingAmount, 0), recurring: clients.filter(client => ['CLIENTE_MENSAL', 'CONTRATO_FIXO'].includes(client.recurrence)).length, upcoming: clients.filter(client => client.nextVisitAt).length }), [clients])
  const max = Math.max(1, ...clients.map(client => client.totalPaid))
  const cards = [
    { key: 'ALL' as const, label: 'Clientes ativos', value: clients.length, icon: Users, tone: 'cyan' },
    { key: 'RECURRING' as const, label: 'Carteira recorrente', value: totals.recurring, icon: CircleDollarSign, tone: 'violet' },
    { key: 'PENDING' as const, label: 'Pendências', value: money(totals.pending), icon: AlertTriangle, tone: 'amber' },
    { key: 'UPCOMING' as const, label: 'Próximas visitas', value: totals.upcoming, icon: CalendarClock, tone: 'emerald' },
  ]
  return <div className="space-y-6">
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">{cards.map(({ key, label, value, icon: Icon, tone }, index) => <motion.button key={key} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * .05 }} onClick={() => setFilter(key)} className={`text-left rounded-2xl border p-5 transition hover:-translate-y-0.5 hover:shadow-lg ${filter === key ? `border-${tone}-400/70 bg-${tone}-500/10` : 'border-slate-800 bg-slate-900/60 hover:bg-slate-800/70'}`}>
      <div className="flex items-start justify-between"><span className="text-xs font-bold uppercase tracking-wider text-slate-400">{label}</span><Icon className={`w-5 h-5 text-${tone}-400`} /></div><strong className="mt-3 block text-2xl text-slate-100">{value}</strong><span className="mt-1 block text-[11px] text-slate-500">Clique para filtrar a carteira</span>
    </motion.button>)}</div>
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <section className="lg:col-span-2 rounded-2xl border border-slate-800 bg-slate-900/60 p-5"><div className="flex items-center justify-between gap-3"><div><h2 className="font-black text-slate-100">Receita acumulada por cliente</h2><p className="text-xs text-slate-400">Somente lançamentos efetivados vinculados ao CRM.</p></div><span className="text-lg font-black text-emerald-400">{money(totals.paid)}</span></div><div className="mt-5 space-y-3">{clients.filter(client => client.totalPaid > 0).slice(0, 6).map(client => <Link href={`/portal/crm/${client.id}`} key={client.id} className="block group"><div className="flex justify-between text-xs"><span className="font-bold text-slate-300 group-hover:text-cyan-300">{client.name}</span><span className="text-emerald-400">{money(client.totalPaid)}</span></div><div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-800"><motion.div initial={{ width: 0 }} animate={{ width: `${(client.totalPaid / max) * 100}%` }} className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-emerald-400" /></div></Link>)}{!clients.some(client => client.totalPaid > 0) && <p className="py-5 text-sm text-slate-500">Associe lançamentos de receita ao cliente para acompanhar LTV aqui.</p>}</div></section>
      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5"><h2 className="font-black text-slate-100">Carteira ativa</h2><div className="mt-5 space-y-4"><Metric label="Ticket/LTV médio" value={money(clients.length ? totals.paid / clients.length : 0)} /><Metric label="Serviços concluídos" value={clients.reduce((sum, client) => sum + client.serviceCount, 0).toString()} /><Metric label="Clientes filtrados" value={filtered.length.toString()} /></div></section>
    </div>
    <section className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden"><div className="p-4 border-b border-slate-800 flex flex-col md:flex-row gap-3 md:items-center md:justify-between"><div className="relative flex-1 max-w-lg"><Search className="absolute left-3 top-3 w-4 h-4 text-slate-500"/><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar cliente, tipo ou bairro" className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2.5 pl-9 pr-3 text-sm text-slate-100 outline-none focus:border-cyan-500"/></div><select value={period} onChange={event => setPeriod(event.target.value as 'ALL' | '30' | '90')} className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm text-slate-200"><option value="ALL">Todo o período</option><option value="30">Entradas: 30 dias</option><option value="90">Entradas: 90 dias</option></select></div><div className="overflow-x-auto"><table className="w-full min-w-[860px] text-left text-sm"><thead className="bg-slate-950/70 text-[10px] font-bold uppercase tracking-wider text-slate-500"><tr><th className="p-4">Cliente</th><th className="p-4">Relacionamento</th><th className="p-4">LTV pago</th><th className="p-4">Pendência</th><th className="p-4">Próxima visita</th><th className="p-4 text-right">Ação</th></tr></thead><tbody className="divide-y divide-slate-800">{filtered.map(client => <tr key={client.id} className="transition hover:bg-slate-800/40"><td className="p-4"><strong className="text-slate-100">{client.name}</strong><span className="block text-xs text-slate-500">{title(client.type)} · {client.neighborhood || 'Endereço não registrado'}</span></td><td className="p-4 text-xs text-cyan-300">{title(client.recurrence)}<span className="block text-slate-500">{title(client.source)}</span></td><td className="p-4 font-bold text-emerald-400">{money(client.totalPaid)}</td><td className={`p-4 font-bold ${client.pendingAmount ? 'text-amber-400' : 'text-slate-500'}`}>{client.pendingAmount ? money(client.pendingAmount) : 'Em dia / sem registro'}</td><td className="p-4 text-xs text-slate-300">{client.nextVisitAt ? new Date(client.nextVisitAt).toLocaleDateString('pt-BR') : 'Não agendada'}</td><td className="p-4 text-right"><Link href={`/portal/crm/${client.id}`} className="rounded-lg border border-cyan-500/30 bg-cyan-950/40 px-3 py-2 text-xs font-bold text-cyan-300 hover:bg-cyan-950">Abrir ficha</Link></td></tr>)}{!filtered.length && <tr><td colSpan={6} className="p-10 text-center text-slate-500">Nenhum cliente corresponde a este filtro.</td></tr>}</tbody></table></div></section>
  </div>
}
function Metric({ label, value }: { label: string; value: string }) { return <div className="border-b border-slate-800 pb-3 last:border-0"><span className="text-xs text-slate-500">{label}</span><strong className="block mt-1 text-lg text-slate-100">{value}</strong></div> }
