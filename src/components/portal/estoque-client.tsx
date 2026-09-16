'use client';

import { useState } from 'react';
import { Package, Wrench, ArrowRightLeft, AlertTriangle, Plus } from 'lucide-react';
import { ModalNovoInsumo } from './ModalNovoInsumo';
import { ModalMovimentacaoEstoque } from './ModalMovimentacaoEstoque';

export function EstoqueClient({ 
  initialInsumos, 
  initialEquipamentos,
  initialMovements,
}: { 
  initialInsumos: any[]; 
  initialEquipamentos: any[];
  initialMovements: Array<{ id: string; direction: string; quantity: string; reason: string | null; source: string; createdAt: Date | string; insumoName: string; unit: string }>;
}) {
  const [insumos, setInsumos] = useState(initialInsumos);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [isNovoInsumoOpen, setIsNovoInsumoOpen] = useState(false);
  const [isMovimentacaoOpen, setIsMovimentacaoOpen] = useState(false);

  const updateQuantity = async (id: string, diff: number) => {
    setLoadingId(id);
    try {
      const res = await fetch('/api/estoque/insumos', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, diff })
      });
      if (res.ok) {
        const { insumo } = await res.json();
        setInsumos(prev => prev.map(i => i.id === id ? insumo : i));
      }
    } catch (e) {
      console.error('Erro ao atualizar insumo', e);
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-100 tracking-tight flex items-center gap-2">
            Gestão de Estoque <Package className="w-5 h-5 text-emerald-400" />
          </h1>
          <p className="text-sm text-slate-400">
            Controle de Insumos, Ferramental e Movimentações
          </p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setIsMovimentacaoOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 font-bold text-xs border border-slate-700/80 transition"
          >
            <Plus className="w-4 h-4" /> Nova Movimentação
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Inventário de Insumos */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <Package className="w-5 h-5 text-emerald-400" /> Insumos (Dedetização)
              </h2>
              <button 
                onClick={() => setIsNovoInsumoOpen(true)}
                className="text-xs text-emerald-400 hover:underline flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Adicionar Insumo
              </button>
            </div>
            <div className="p-6 overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-xs uppercase text-slate-500">
                    <th className="pb-3 font-semibold">Insumo</th>
                    <th className="pb-3 font-semibold">Categoria</th>
                    <th className="pb-3 font-semibold">Estoque Atual</th>
                    <th className="pb-3 font-semibold text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {insumos.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-4 text-center text-slate-400">
                        Nenhum insumo cadastrado.
                      </td>
                    </tr>
                  ) : (
                    insumos.map((item) => {
                      const isCritical = Number(item.quantidade) <= Number(item.nivelCritico);
                      return (
                        <tr key={item.id} className="border-b border-slate-800/50 hover:bg-slate-800/20">
                          <td className="py-3 text-slate-200 font-medium">
                            {item.nome}
                            {isCritical && (
                              <span className="ml-2 inline-flex items-center gap-1 text-[10px] bg-red-500/10 text-red-400 px-1.5 py-0.5 rounded font-bold uppercase">
                                <AlertTriangle className="w-3 h-3" /> Crítico
                              </span>
                            )}
                          </td>
                          <td className="py-3 text-slate-400">{item.categoria}</td>
                          <td className={`py-3 font-bold ${isCritical ? 'text-red-400' : 'text-slate-200'}`}>
                            {item.quantidade} {item.unidade}
                          </td>
                          <td className="py-3 text-right">
                            <div className="flex justify-end gap-2">
                              <button 
                                disabled={loadingId === item.id}
                                onClick={() => updateQuantity(item.id, -1)}
                                className="text-xs font-semibold px-2 py-1 bg-red-500/10 text-red-400 rounded hover:bg-red-500/20 disabled:opacity-50"
                              >
                                -1 (Saída)
                              </button>
                              <button 
                                disabled={loadingId === item.id}
                                onClick={() => updateQuantity(item.id, 5)}
                                className="text-xs font-semibold px-2 py-1 bg-emerald-500/10 text-emerald-400 rounded hover:bg-emerald-500/20 disabled:opacity-50"
                              >
                                +5 (Entrada)
                              </button>
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

          {/* Inventário de Ferramental */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <Wrench className="w-5 h-5 text-slate-300" /> Ativos e Ferramentas
              </h2>
            </div>
            <div className="p-6">
              {initialEquipamentos.length === 0 ? (
                <p className="text-sm text-slate-400">Nenhum equipamento cadastrado.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {initialEquipamentos.map((eq) => (
                    <div key={eq.id} className="p-3 bg-slate-800/40 border border-slate-700/50 rounded-xl flex items-center justify-between cursor-pointer hover:bg-slate-800/60 transition">
                      <div>
                        <p className="text-sm font-bold text-slate-200">{eq.name}</p>
                        <p className="text-xs text-slate-500">Cód: {eq.code || 'S/N'}</p>
                      </div>
                      <span className={`w-2 h-2 rounded-full ${eq.isActive ? 'bg-emerald-400' : 'bg-red-400'}`}></span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Movimentações Recentes */}
        <div className="space-y-6">
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden sticky top-8">
            <div className="px-6 py-4 border-b border-slate-800">
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-cyan-400" /> Movimentações
              </h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {initialMovements.length === 0 ? (
                  <p className="text-sm text-slate-400">Nenhuma movimentação registrada.</p>
                ) : initialMovements.map((movement) => {
                  const inbound = movement.direction === 'ENTRADA';
                  const createdAt = new Date(movement.createdAt);
                  return (
                    <div key={movement.id} className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${inbound ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                        <ArrowRightLeft className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-200">{inbound ? 'Entrada' : 'Saída'}: {movement.insumoName}</p>
                        <p className="text-xs text-slate-400">{movement.reason || movement.source} • {inbound ? '+' : '-'}{movement.quantity} {movement.unit}</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">{createdAt.toLocaleString('pt-BR')}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      <ModalNovoInsumo isOpen={isNovoInsumoOpen} onClose={() => setIsNovoInsumoOpen(false)} />
      <ModalMovimentacaoEstoque isOpen={isMovimentacaoOpen} onClose={() => setIsMovimentacaoOpen(false)} insumos={insumos} />
    </div>
  );
}
