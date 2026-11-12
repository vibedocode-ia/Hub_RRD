'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  CircleDollarSign, 
  TrendingUp, 
  TrendingDown, 
  FileText, 
  Plus, 
  Wallet, 
  Lock,
  ArrowUpRight,
  ShieldCheck,
  Calendar
} from 'lucide-react';
import { ModalNovoLancamento } from './ModalNovoLancamento';
import { summarizeFinancialEntries } from '@/lib/financial-summary';

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
  const monthEntries = lancamentos.filter(l => { 
    const d = new Date(l.data); 
    return d.getFullYear() === selectedYear && (annualView || d.getMonth() + 1 === selectedMonth); 
  });
  const visibleLancamentos = monthEntries.filter(l => (!initialType || l.tipo === initialType) && (!initialStatus || l.status === initialStatus));

  const summary = summarizeFinancialEntries(lancamentos, { month: selectedMonth, year: selectedYear, annual: annualView });
  const entradas = summary.receivedRevenue;
  const saidas = summary.effectiveExpenses;
  const receitaAnual = summarizeFinancialEntries(lancamentos, { month: selectedMonth, year: selectedYear, annual: true }).receivedRevenue;
  const saldo = summary.cashBalance;
  const aReceber = summary.receivable;
  const emAtraso = summary.overdueReceivable;
  const previsao = summary.forecast;
  const periodQuery = `mes=${selectedMonth}&ano=${selectedYear}`;

  const formatMoney = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="space-y-5">
      {/* 1. Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-zinc-500">
            <span>Gestão Operacional</span>
            <span>/</span>
            <span className="text-zinc-300">Contabilidade & Fluxo</span>
          </div>
          <div className="mt-1 flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-zinc-100">
              Gestão Financeira
            </h1>
            <span className="inline-flex items-center rounded-md border border-white/[0.08] bg-zinc-900/80 px-2 py-0.5 text-xs font-mono text-zinc-400">
              {annualView ? `Ano ${selectedYear}` : `${selectedMonth}/${selectedYear}`}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-zinc-400">
            Fluxo de caixa, conciliação de recebíveis, contas a pagar e emissões fiscais.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link 
            href="/portal/financeiro/contas" 
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-white/[0.08] bg-zinc-900/80 px-3 text-xs font-medium text-zinc-300 hover:border-white/[0.2] hover:bg-zinc-800 hover:text-white transition-colors"
          >
            <span>Conta Bancária</span>
            <ArrowUpRight className="size-3 text-zinc-500" />
          </Link>
          <button 
            onClick={() => setIsNovoLancamentoOpen(true)}
            className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-cyan-500 px-3.5 text-xs font-medium text-zinc-950 transition-all hover:bg-cyan-400 active:scale-[0.98] shadow-[0_0_15px_rgba(6,182,212,0.3)]"
          >
            <Plus className="size-3.5 stroke-[2.5]" />
            <span>Novo Lançamento</span>
          </button>
        </div>
      </div>

      {/* 2. Barra de Controle de Período */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/[0.08] bg-zinc-950/70 p-3 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]">
        <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
          <Calendar className="size-3.5 text-zinc-500" />
          <span>Competência:</span>
          <select 
            aria-label="Selecionar mês" 
            value={selectedMonth} 
            onChange={(e) => { window.location.href = `/portal/financeiro?mes=${e.target.value}&ano=${selectedYear}`; }} 
            className="h-7 rounded border border-white/[0.08] bg-zinc-900 px-2 text-xs text-zinc-200 outline-none"
          >
            {['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'].map((name, index) => (
              <option key={name} value={index + 1}>{name}</option>
            ))}
          </select>
          <select 
            aria-label="Selecionar ano" 
            value={selectedYear} 
            onChange={(e) => { window.location.href = `/portal/financeiro?mes=${selectedMonth}&ano=${e.target.value}`; }} 
            className="h-7 rounded border border-white/[0.08] bg-zinc-900 px-2 text-xs text-zinc-200 outline-none"
          >
            {[selectedYear - 2, selectedYear - 1, selectedYear, selectedYear + 1].map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/portal/financeiro?${periodQuery}&visao=${annualView ? 'MES' : 'ANO'}`}
            className={`rounded px-2.5 py-1 text-xs font-mono transition-colors border ${
              annualView 
                ? 'border-cyan-500/40 bg-cyan-950/40 text-cyan-300' 
                : 'border-white/[0.08] bg-zinc-900 text-zinc-400 hover:text-white'
            }`}
          >
            {annualView ? 'Visão Anual Ativa' : 'Ver Acumulado Anual'}
          </Link>
        </div>
      </div>

      {/* 3. Metric Strip Contínua (Midday / Tremor Style) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-white/[0.08] rounded-lg border border-white/[0.08] bg-zinc-950/70 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]">
        {/* Saldo Realizado */}
        <Link href={`/portal/financeiro?${periodQuery}`} className="p-3.5 hover:bg-white/[0.02] transition-colors">
          <div className="flex items-center justify-between text-xs text-zinc-400 font-medium">
            <span>Saldo Realizado</span>
            <Wallet className="size-3.5 text-cyan-400" />
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className={`text-xl font-semibold font-mono tracking-tight ${saldo >= 0 ? 'text-cyan-300' : 'text-rose-400'}`}>
              {formatMoney(saldo)}
            </span>
          </div>
          <span className="text-[10px] text-zinc-500 font-mono mt-0.5 block">caixa efetivado</span>
        </Link>

        {/* Receitas Recebidas */}
        <Link href={`/portal/financeiro?${periodQuery}&tipo=RECEITA`} className="p-3.5 hover:bg-white/[0.02] transition-colors">
          <div className="flex items-center justify-between text-xs text-zinc-400 font-medium">
            <span>Receitas Recebidas</span>
            <TrendingUp className="size-3.5 text-emerald-400" />
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl font-semibold font-mono tracking-tight text-emerald-400">
              {formatMoney(entradas)}
            </span>
          </div>
          <span className="text-[10px] text-zinc-500 font-mono mt-0.5 block">entradas do período</span>
        </Link>

        {/* Despesas */}
        <Link href={`/portal/financeiro?${periodQuery}&tipo=DESPESA`} className="p-3.5 hover:bg-white/[0.02] transition-colors">
          <div className="flex items-center justify-between text-xs text-zinc-400 font-medium">
            <span>Despesas Pagas</span>
            <TrendingDown className="size-3.5 text-rose-400" />
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl font-semibold font-mono tracking-tight text-rose-400">
              {formatMoney(saidas)}
            </span>
          </div>
          <span className="text-[10px] text-zinc-500 font-mono mt-0.5 block">custos operacionais</span>
        </Link>

        {/* A Receber */}
        <Link href={`/portal/financeiro?${periodQuery}&status=PENDENTE&tipo=RECEITA`} className="p-3.5 hover:bg-white/[0.02] transition-colors">
          <div className="flex items-center justify-between text-xs text-zinc-400 font-medium">
            <span>A Receber / Pendente</span>
            <CircleDollarSign className="size-3.5 text-amber-400" />
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl font-semibold font-mono tracking-tight text-amber-300">
              {formatMoney(aReceber)}
            </span>
          </div>
          <span className="text-[10px] text-zinc-500 font-mono mt-0.5 block">
            {emAtraso > 0 ? `${formatMoney(emAtraso)} em atraso` : 'em dia'}
          </span>
        </Link>
      </div>

      {/* 4. Grade Dupla de Tabelas de Alta Densidade */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Movimentações Recentes */}
        <div className="rounded-lg border border-white/[0.08] bg-zinc-950/70 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] overflow-hidden">
          <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-300">
              <CircleDollarSign className="size-3.5 text-emerald-400" />
              <span>Movimentações do Período</span>
            </div>
            <Link href={`/portal/financeiro?${periodQuery}`} className="text-[11px] font-mono text-zinc-400 hover:text-white">
              Todas ({visibleLancamentos.length}) →
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-white/[0.04] bg-zinc-900/30 text-[10px] font-medium uppercase tracking-wider text-zinc-500">
                <tr>
                  <th className="py-2 px-3.5">Descrição</th>
                  <th className="py-2 px-3">Data</th>
                  <th className="py-2 px-3 text-right">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {visibleLancamentos.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-8 text-center text-xs text-zinc-500 font-mono">
                      Nenhuma movimentação neste período.
                    </td>
                  </tr>
                ) : (
                  visibleLancamentos.slice(0, 8).map((l) => (
                    <tr
                      key={l.id}
                      onClick={() => { window.location.href = `/portal/financeiro?tipo=${l.tipo}&status=${l.status}`; }}
                      className="group cursor-pointer transition-colors hover:bg-white/[0.02]"
                    >
                      <td className="py-2 px-3.5">
                        <div className="font-medium text-zinc-200 group-hover:text-white truncate max-w-[200px]">
                          {l.descricao}
                        </div>
                        <div className="text-[10px] text-zinc-500 font-mono">
                          {l.categoria} · <span className={l.status === 'EFETIVADO' ? 'text-emerald-400' : 'text-amber-400'}>{l.status}</span>
                        </div>
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap font-mono text-zinc-400 text-[11px]">
                        {new Date(l.data).toLocaleDateString('pt-BR')}
                      </td>
                      <td className={`py-2 px-3 text-right whitespace-nowrap font-mono font-medium ${l.tipo === 'RECEITA' ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {l.tipo === 'RECEITA' ? '+' : '-'} {formatMoney(Number(l.valor))}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Emissões Recentes */}
        <div className="rounded-lg border border-white/[0.08] bg-zinc-950/70 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] overflow-hidden">
          <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-300">
              <FileText className="size-3.5 text-cyan-400" />
              <span>Emissões Fiscais & OS</span>
            </div>
            <Link href="/portal/documentos" className="text-[11px] font-mono text-zinc-400 hover:text-white">
              Ver Documentos →
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-white/[0.04] bg-zinc-900/30 text-[10px] font-medium uppercase tracking-wider text-zinc-500">
                <tr>
                  <th className="py-2 px-3.5">Documento</th>
                  <th className="py-2 px-3">Valor</th>
                  <th className="py-2 px-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {initialDocumentos.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-8 text-center text-xs text-zinc-500 font-mono">
                      Nenhum documento emitido recentemente.
                    </td>
                  </tr>
                ) : (
                  initialDocumentos.slice(0, 8).map((doc) => (
                    <tr
                      key={doc.id}
                      onClick={() => { window.location.href = `/portal/documentos/preview/${doc.id}`; }}
                      className="group cursor-pointer transition-colors hover:bg-white/[0.02]"
                    >
                      <td className="py-2 px-3.5">
                        <div className="font-mono text-cyan-300 group-hover:underline flex items-center gap-1.5 font-medium">
                          {doc.docNumber} <Lock className="size-2.5 text-zinc-500" />
                        </div>
                        <div className="text-[10px] text-zinc-500 font-mono">
                          {doc.docType.replace('_', ' ')}
                        </div>
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap font-mono font-medium text-zinc-200">
                        {formatMoney(Number(doc.totalValue))}
                      </td>
                      <td className="py-2 px-3 text-right whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-mono font-medium border ${
                          doc.status === 'EMITIDO' || doc.status === 'ENVIADO'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                        }`}>
                          <span className={`size-1 rounded-full ${doc.status === 'EMITIDO' || doc.status === 'ENVIADO' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
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

      <ModalNovoLancamento 
        isOpen={isNovoLancamentoOpen} 
        onClose={() => setIsNovoLancamentoOpen(false)} 
        clientOptions={clientOptions} 
      />
    </div>
  );
}
