'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CircleDollarSign, TrendingUp, TrendingDown, FileText, Plus, Wallet, Lock } from 'lucide-react';
import { ModalNovoLancamento } from './ModalNovoLancamento';

export function FinanceiroClient({ 
  initialLancamentos, 
  initialDocumentos,
  clientOptions,
  initialType,
  initialStatus,
  selectedMonth,
  selectedYear,
  annualView,
}: { 
  initialLancamentos: any[]; 
  initialDocumentos: any[];
  clientOptions: Array<{ id: string; name: string }>;
  initialType?: 'RECEITA' | 'DESPESA';
  initialStatus?: string;
  selectedMonth: number;
  selectedYear: number;
  annualView: boolean;
}) {
  const [lancamentos, setLancamentos] = useState(initialLancamentos);
  const [isNovoLancamentoOpen, setIsNovoLancamentoOpen] = useState(false);
  const monthEntries = lancamentos.filter(l => { const d = new Date(l.data); return d.getFullYear() === selectedYear && (annualView || d.getMonth() + 1 === selectedMonth); });
  const visibleLancamentos = monthEntries.filter(l => (!initialType || l.tipo === initialType) && (!initialStatus || l.status === initialStatus));

  // Totais reativos
  const entradas = monthEntries.filter(l => l.tipo === 'RECEITA' && l.status !== 'CANCELADO').reduce((acc, l) => acc + Number(l.valor), 0);
  const saidas = monthEntries.filter(l => l.tipo === 'DESPESA' && l.status !== 'CANCELADO').reduce((acc, l) => acc + Number(l.valor), 0);
  const receitaAnual = lancamentos.filter(l => { const d = new Date(l.data); return d.getFullYear() === selectedYear && l.tipo === 'RECEITA' && l.status !== 'CANCELADO'; }).reduce((acc, l) => acc + Number(l.valor), 0);
  const saldo = entradas - saidas;
  const aReceber = monthEntries.filter(l => l.tipo === 'RECEITA' && l.status === 'PENDENTE').reduce((acc, l) => acc + Number(l.valor), 0);
  const emAtraso = monthEntries.filter(l => l.tipo === 'RECEITA' && (l.status === 'ATRASADO' || (l.status === 'PENDENTE' && new Date(l.data) < new Date()))).reduce((acc, l) => acc + Number(l.valor), 0);
  const previsao = saldo + aReceber;
  const periodQuery = `mes=${selectedMonth}&ano=${selectedYear}`;

  const alertDocumentLock = (docNumber: string) => {
    alert(`DOCUMENTO TRAVADO (${docNumber})\n\nEste Recibo/OS Fiscal já foi emitido e assinado digitalmente. Para estornar ou alterar, é necessário gerar um evento de cancelamento oficial.\n\nProteção contra fraude financeira ativa.`);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-100 tracking-tight flex items-center gap-2">
            Gestão Financeira <CircleDollarSign className="w-5 h-5 text-emerald-400" />
          </h1>
          <p className="text-sm text-slate-400">
            Fluxo de Caixa, Contas a Pagar/Receber e Emissões
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/portal/financeiro/contas" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-400 font-bold text-xs border border-slate-700/80 transition">Conta da Empresa →</Link>
          <button 
            onClick={() => setIsNovoLancamentoOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 font-bold text-xs border border-slate-700/80 transition"
          >
            <Plus className="w-4 h-4" /> Novo Lançamento
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Período</span>
        <select aria-label="Selecionar mês" value={selectedMonth} onChange={(e) => { window.location.href = `/portal/financeiro?mes=${e.target.value}&ano=${selectedYear}`; }} className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100">
          {['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'].map((name,index)=><option key={name} value={index+1}>{name}</option>)}
        </select>
        <select aria-label="Selecionar ano" value={selectedYear} onChange={(e) => { window.location.href = `/portal/financeiro?mes=${selectedMonth}&ano=${e.target.value}`; }} className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100">
          {[selectedYear-2,selectedYear-1,selectedYear,selectedYear+1].map(year=><option key={year} value={year}>{year}</option>)}
        </select>
        <span className="text-xs text-slate-500">Os cards e listas abaixo respeitam este período.</span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <FinanceMetric href={`/portal/financeiro?${periodQuery}`} label="Saldo Atual" value={saldo} tone="cyan" icon={<Wallet className="w-5 h-5" />} />
        <FinanceMetric href={`/portal/financeiro?${periodQuery}&tipo=RECEITA`} label="Receitas Recebidas" value={entradas} tone="emerald" icon={<TrendingUp className="w-5 h-5" />} />
        <FinanceMetric href={`/portal/financeiro?${periodQuery}&tipo=DESPESA`} label="Despesas" value={saidas} tone="red" icon={<TrendingDown className="w-5 h-5" />} />
        <FinanceMetric href={`/portal/financeiro?${periodQuery}&status=PENDENTE&tipo=RECEITA`} label="A Receber" value={aReceber} tone="amber" icon={<CircleDollarSign className="w-5 h-5" />} />
        <FinanceMetric href={`/portal/financeiro?${periodQuery}&status=ATRASADO&tipo=RECEITA`} label="Valores em Atraso" value={emAtraso} tone="red" icon={<CircleDollarSign className="w-5 h-5" />} />
        <FinanceMetric href={`/portal/financeiro?${periodQuery}`} label="Previsão do Mês" value={previsao} tone="blue" icon={<TrendingUp className="w-5 h-5" />} />
        <FinanceMetric href={`/portal/financeiro?${periodQuery}&visao=ANO&tipo=RECEITA`} label="Receita Anual" value={receitaAnual} tone="emerald" icon={<TrendingUp className="w-5 h-5" />} />
        <FinanceMetric href={`/portal/financeiro?${periodQuery}`} label="Resultado Mensal" value={saldo} tone={saldo >= 0 ? 'cyan' : 'red'} icon={<Wallet className="w-5 h-5" />} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href={`/portal/financeiro?${periodQuery}&tipo=RECEITA`} className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 relative overflow-hidden group hover:border-emerald-500/50 transition">
          <TrendingUp className="absolute right-4 top-4 h-16 w-16 text-emerald-500 opacity-10"/><p className="text-sm font-medium text-slate-400 mb-1">Entradas (Mês)</p><p className="text-2xl font-black text-emerald-400">{new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(entradas)}</p><p className="mt-2 text-[10px] font-bold uppercase text-cyan-400">Abrir receitas →</p>
        </Link>
        <Link href={`/portal/financeiro?${periodQuery}&tipo=DESPESA`} className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 relative overflow-hidden group hover:border-red-500/50 transition">
          <TrendingDown className="absolute right-4 top-4 h-16 w-16 text-red-500 opacity-10"/><p className="text-sm font-medium text-slate-400 mb-1">Saídas (Mês)</p><p className="text-2xl font-black text-red-400">{new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(saidas)}</p><p className="mt-2 text-[10px] font-bold uppercase text-cyan-400">Abrir despesas →</p>
        </Link>
        <Link href={`/portal/financeiro?${periodQuery}`} className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 relative overflow-hidden group hover:border-cyan-500/50 transition">
          <Wallet className="absolute right-4 top-4 h-16 w-16 text-cyan-500 opacity-10"/><p className="text-sm font-medium text-slate-400 mb-1">Saldo Líquido</p><p className={`text-2xl font-black ${saldo >= 0 ? 'text-cyan-400' : 'text-red-400'}`}>{new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(saldo)}</p><p className="mt-2 text-[10px] font-bold uppercase text-cyan-400">Abrir composição →</p>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Lançamentos (Contas a Pagar/Receber) */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <CircleDollarSign className="w-5 h-5 text-emerald-400" /> Movimentações Recentes
            </h2>
            <Link href={`/portal/financeiro?${periodQuery}`} className="text-xs text-emerald-400 hover:underline">Ver Todas →</Link>
          </div>
          <div className="p-0 overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-xs uppercase text-slate-500 bg-slate-950/30">
                  <th className="py-3 px-6 font-semibold">Descrição</th>
                  <th className="py-3 px-6 font-semibold">Data</th>
                  <th className="py-3 px-6 font-semibold text-right">Valor</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {visibleLancamentos.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-8 px-6 text-center text-slate-400">
                      Nenhuma movimentação registrada.
                    </td>
                  </tr>
                ) : (
                  visibleLancamentos.map((l) => (
                    <tr key={l.id} onClick={() => { window.location.href = `/portal/financeiro?tipo=${l.tipo}&status=${l.status}`; }} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition cursor-pointer">
                      <td className="py-3 px-6 text-slate-200">
                        <div className="font-medium">{l.descricao}</div>
                        <div className="text-xs text-slate-500">{l.categoria} • <span className={l.status === 'EFETIVADO' ? 'text-emerald-400/80' : 'text-amber-400/80'}>{l.status}</span></div>
                      </td>
                      <td className="py-3 px-6 text-slate-400">
                        {new Date(l.data).toLocaleDateString('pt-BR')}
                      </td>
                      <td className={`py-3 px-6 text-right font-bold ${l.tipo === 'RECEITA' ? 'text-emerald-400' : 'text-red-400'}`}>
                        {l.tipo === 'RECEITA' ? '+' : '-'} {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(l.valor)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Documentos Fiscais / OS Emitidas */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <FileText className="w-5 h-5 text-cyan-400" /> Emissões Recentes
            </h2>
          </div>
          <div className="p-0 overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-xs uppercase text-slate-500 bg-slate-950/30">
                  <th className="py-3 px-6 font-semibold">Documento</th>
                  <th className="py-3 px-6 font-semibold">Valor</th>
                  <th className="py-3 px-6 font-semibold text-right">Status</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {initialDocumentos.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-8 px-6 text-center text-slate-400">
                      Nenhum documento emitido.
                    </td>
                  </tr>
                ) : (
                  initialDocumentos.map((doc) => (
                    <tr 
                      key={doc.id} 
                      onClick={() => { window.location.href = `/portal/documentos/preview/${doc.id}`; }}
                      className="border-b border-slate-800/50 hover:bg-slate-800/30 transition cursor-pointer group"
                    >
                      <td className="py-3 px-6 text-slate-200">
                        <div className="font-medium text-cyan-400 group-hover:underline flex items-center gap-2">
                          {doc.docNumber} <Lock className="w-3 h-3 text-slate-500" />
                        </div>
                        <div className="text-xs text-slate-400">{doc.docType.replace('_', ' ')}</div>
                      </td>
                      <td className="py-3 px-6 text-slate-200 font-medium">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(doc.totalValue)}
                      </td>
                      <td className="py-3 px-6 text-right">
                        <span className={`inline-flex px-2 py-0.5 text-[10px] font-bold rounded uppercase ${
                          doc.status === 'EMITIDO' || doc.status === 'ENVIADO' 
                            ? 'bg-emerald-500/10 text-emerald-400' 
                            : 'bg-amber-500/10 text-amber-400'
                        }`}>
                          {doc.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <ModalNovoLancamento isOpen={isNovoLancamentoOpen} onClose={() => setIsNovoLancamentoOpen(false)} clientOptions={clientOptions} />
    </div>
  );
}

function FinanceMetric({href,label,value,tone,icon}:{href:string,label:string,value:number,tone:'cyan'|'emerald'|'red'|'amber'|'blue',icon:React.ReactNode}){const colors={cyan:'bg-cyan-500/10 text-cyan-400',emerald:'bg-emerald-500/10 text-emerald-400',red:'bg-red-500/10 text-red-400',amber:'bg-amber-500/10 text-amber-400',blue:'bg-blue-500/10 text-blue-400'};return <Link href={href} className="block bg-slate-900/60 border border-slate-800 rounded-2xl p-4 transition hover:-translate-y-0.5 hover:border-cyan-500/50 focus:outline-none focus:ring-2 focus:ring-cyan-400"><div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-xl ${colors[tone]}`}>{icon}</div><p className="text-xs text-slate-500">{label}</p><p className="mt-1 text-lg font-black text-slate-100">{new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(value)}</p><p className="mt-2 text-[10px] font-bold uppercase tracking-wide text-cyan-400">Abrir detalhes →</p></Link>}
