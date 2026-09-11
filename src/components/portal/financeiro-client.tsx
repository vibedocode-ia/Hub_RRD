'use client';

import { useState } from 'react';
import { CircleDollarSign, TrendingUp, TrendingDown, FileText, Plus, Wallet, Lock } from 'lucide-react';
import { ModalNovoLancamento } from './ModalNovoLancamento';

export function FinanceiroClient({ 
  initialLancamentos, 
  initialDocumentos 
}: { 
  initialLancamentos: any[]; 
  initialDocumentos: any[]; 
}) {
  const [lancamentos, setLancamentos] = useState(initialLancamentos);
  const [isNovoLancamentoOpen, setIsNovoLancamentoOpen] = useState(false);

  // Totais reativos
  const entradas = lancamentos.filter(l => l.tipo === 'RECEITA').reduce((acc, l) => acc + Number(l.valor), 0);
  const saidas = lancamentos.filter(l => l.tipo === 'DESPESA').reduce((acc, l) => acc + Number(l.valor), 0);
  const saldo = entradas - saidas;

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
          <button 
            onClick={() => setIsNovoLancamentoOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 font-bold text-xs border border-slate-700/80 transition"
          >
            <Plus className="w-4 h-4" /> Novo Lançamento
          </button>
        </div>
      </div>

      {/* DRE Simplificada (Visão de Caixa) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <TrendingUp className="w-16 h-16 text-emerald-500" />
          </div>
          <p className="text-sm font-medium text-slate-400 mb-1">Entradas (Mês)</p>
          <p className="text-2xl font-black text-emerald-400">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(entradas)}
          </p>
        </div>
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <TrendingDown className="w-16 h-16 text-red-500" />
          </div>
          <p className="text-sm font-medium text-slate-400 mb-1">Saídas (Mês)</p>
          <p className="text-2xl font-black text-red-400">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(saidas)}
          </p>
        </div>
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Wallet className="w-16 h-16 text-cyan-500" />
          </div>
          <p className="text-sm font-medium text-slate-400 mb-1">Saldo Líquido</p>
          <p className={`text-2xl font-black ${saldo >= 0 ? 'text-cyan-400' : 'text-red-400'}`}>
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(saldo)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Lançamentos (Contas a Pagar/Receber) */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <CircleDollarSign className="w-5 h-5 text-emerald-400" /> Movimentações Recentes
            </h2>
            <button className="text-xs text-emerald-400 hover:underline">Ver Todas</button>
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
                {lancamentos.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-8 px-6 text-center text-slate-400">
                      Nenhuma movimentação registrada.
                    </td>
                  </tr>
                ) : (
                  lancamentos.map((l) => (
                    <tr key={l.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition">
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
                      onClick={() => alertDocumentLock(doc.docNumber)}
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

      <ModalNovoLancamento isOpen={isNovoLancamentoOpen} onClose={() => setIsNovoLancamentoOpen(false)} />
    </div>
  );
}
