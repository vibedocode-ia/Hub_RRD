'use client';

import { useState } from 'react';
import { 
  Package, 
  Wrench, 
  ArrowRightLeft, 
  AlertTriangle, 
  Plus,
  ShieldCheck,
  ArrowDownRight,
  ArrowUpRight
} from 'lucide-react';
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

  const totalInsumos = insumos.length;
  const criticalCount = insumos.filter(i => Number(i.quantidade) <= Number(i.nivelCritico)).length;

  return (
    <div className="space-y-5">
      {/* 1. Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-zinc-500">
            <span>Operação RR</span>
            <span>/</span>
            <span className="text-zinc-300">Almoxarifado & Equipamentos</span>
          </div>
          <div className="mt-1 flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-zinc-100">
              Gestão de Estoque
            </h1>
            <span className="inline-flex items-center rounded-md border border-white/[0.08] bg-zinc-900/80 px-2 py-0.5 text-xs font-mono text-zinc-400">
              {totalInsumos} insumos · {initialEquipamentos.length} ferramentas
            </span>
          </div>
          <p className="mt-0.5 text-xs text-zinc-400">
            Controle de químicos de dedetização, peças, maquinários pesados e histórico de movimentações.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsNovoInsumoOpen(true)}
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-white/[0.08] bg-zinc-900/80 px-3 text-xs font-medium text-zinc-300 hover:border-white/[0.2] hover:bg-zinc-800 hover:text-white transition-colors"
          >
            <Plus className="size-3.5" />
            <span>Novo Insumo</span>
          </button>
          <button 
            onClick={() => setIsMovimentacaoOpen(true)}
            className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-cyan-500 px-3.5 text-xs font-medium text-zinc-950 transition-all hover:bg-cyan-400 active:scale-[0.98] shadow-[0_0_15px_rgba(6,182,212,0.3)]"
          >
            <ArrowRightLeft className="size-3.5" />
            <span>Movimentação</span>
          </button>
        </div>
      </div>

      {/* 2. Metric Strip Contínua */}
      <div className="grid grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-white/[0.08] rounded-lg border border-white/[0.08] bg-zinc-950/70 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]">
        <div className="p-3.5 sm:px-4">
          <span className="text-xs text-zinc-400 font-medium block">Insumos em Catálogo</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl font-semibold font-mono tracking-tight text-zinc-100">{totalInsumos}</span>
            <span className="text-[10px] text-zinc-500 font-mono">itens ativos</span>
          </div>
        </div>

        <div className="p-3.5 sm:px-4">
          <span className="text-xs text-zinc-400 font-medium block">Em Nível Crítico</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className={`text-xl font-semibold font-mono tracking-tight ${criticalCount > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
              {criticalCount}
            </span>
            <span className="text-[10px] text-zinc-500 font-mono">
              {criticalCount > 0 ? 'reposição necessária' : 'níveis ok'}
            </span>
          </div>
        </div>

        <div className="p-3.5 sm:px-4">
          <span className="text-xs text-zinc-400 font-medium block">Ferramentas & Ativos</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl font-semibold font-mono tracking-tight text-cyan-300">
              {initialEquipamentos.length}
            </span>
            <span className="text-[10px] text-zinc-500 font-mono">máquinas</span>
          </div>
        </div>

        <div className="p-3.5 sm:px-4">
          <span className="text-xs text-zinc-400 font-medium block">Movimentações Recentes</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl font-semibold font-mono tracking-tight text-zinc-100">
              {initialMovements.length}
            </span>
            <span className="text-[10px] text-zinc-500 font-mono">registradas</span>
          </div>
        </div>
      </div>

      {/* 3. Grade Principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Insumos & Ferramentas */}
        <div className="lg:col-span-2 space-y-4">
          {/* Tabela de Insumos */}
          <div className="rounded-lg border border-white/[0.08] bg-zinc-950/70 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] overflow-hidden">
            <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-300">
                <Package className="size-3.5 text-emerald-400" />
                <span>Inventário de Insumos Químicos</span>
              </div>
              <button 
                onClick={() => setIsNovoInsumoOpen(true)}
                className="text-[11px] font-mono text-cyan-400 hover:underline"
              >
                + Adicionar Insumo
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-white/[0.04] bg-zinc-900/40 text-[10px] font-medium uppercase tracking-wider text-zinc-500">
                  <tr>
                    <th className="py-2.5 px-3.5">Insumo</th>
                    <th className="py-2.5 px-3">Categoria</th>
                    <th className="py-2.5 px-3 font-mono">Estoque Atual</th>
                    <th className="py-2.5 px-3 text-right">Ajuste Rápido</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {insumos.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-xs text-zinc-500 font-mono">
                        Nenhum insumo cadastrado.
                      </td>
                    </tr>
                  ) : (
                    insumos.map((item) => {
                      const isCritical = Number(item.quantidade) <= Number(item.nivelCritico);

                      return (
                        <tr key={item.id} className="group transition-colors hover:bg-white/[0.02]">
                          <td className="py-2.5 px-3.5">
                            <span className="font-medium text-zinc-200 group-hover:text-white">
                              {item.nome}
                            </span>
                            {isCritical && (
                              <span className="ml-2 inline-flex items-center gap-1 text-[9px] font-mono bg-rose-500/10 text-rose-400 px-1.5 py-0.2 rounded border border-rose-500/20">
                                <AlertTriangle className="size-2.5" /> Crítico
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-zinc-400 font-mono text-[11px]">
                            {item.categoria}
                          </td>
                          <td className={`py-2.5 px-3 font-mono font-medium ${isCritical ? 'text-rose-400' : 'text-zinc-200'}`}>
                            {item.quantidade} {item.unidade}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <div className="flex justify-end gap-1.5">
                              <button 
                                disabled={loadingId === item.id}
                                onClick={() => updateQuantity(item.id, -1)}
                                className="h-6 rounded border border-white/[0.08] bg-zinc-900 px-2 text-[10px] font-mono text-rose-400 hover:border-rose-500/30 hover:bg-rose-950/30 transition-colors disabled:opacity-50"
                              >
                                -1 Saída
                              </button>
                              <button 
                                disabled={loadingId === item.id}
                                onClick={() => updateQuantity(item.id, 5)}
                                className="h-6 rounded border border-white/[0.08] bg-zinc-900 px-2 text-[10px] font-mono text-emerald-400 hover:border-emerald-500/30 hover:bg-emerald-950/30 transition-colors disabled:opacity-50"
                              >
                                +5 Entrada
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

          {/* Ferramentas e Equipamentos */}
          <div className="rounded-lg border border-white/[0.08] bg-zinc-950/70 p-4 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.06] mb-3">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-300">
                <Wrench className="size-3.5 text-zinc-400" />
                <span>Ativos, Máquinas e Ferramentas</span>
              </div>
            </div>

            {initialEquipamentos.length === 0 ? (
              <p className="text-xs text-zinc-500 py-3 font-mono">Nenhum maquinário cadastrado.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {initialEquipamentos.map((eq) => (
                  <div 
                    key={eq.id} 
                    className="p-2.5 bg-zinc-900/60 border border-white/[0.06] rounded-md flex items-center justify-between hover:bg-zinc-800/60 transition-colors"
                  >
                    <div>
                      <p className="text-xs font-medium text-zinc-200">{eq.name}</p>
                      <p className="text-[10px] text-zinc-500 font-mono">Código: {eq.code || 'S/N'}</p>
                    </div>
                    <span className="inline-flex items-center gap-1 text-[10px] font-mono text-emerald-400">
                      <span className="size-1.5 rounded-full bg-emerald-400" /> Ativo
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Movimentações Recentes */}
        <div className="rounded-lg border border-white/[0.08] bg-zinc-950/70 p-4 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] h-fit">
          <div className="flex items-center gap-2 pb-3 border-b border-white/[0.06] mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-300">
            <ArrowRightLeft className="size-3.5 text-cyan-400" />
            <span>Últimas Movimentações</span>
          </div>

          <div className="space-y-3">
            {initialMovements.length === 0 ? (
              <p className="text-xs text-zinc-500 font-mono py-4 text-center">Nenhuma movimentação registrada.</p>
            ) : (
              initialMovements.map((movement) => {
                const inbound = movement.direction === 'ENTRADA';
                const createdAt = new Date(movement.createdAt);

                return (
                  <div key={movement.id} className="flex items-start gap-2.5 text-xs">
                    <div className={`size-6 rounded flex items-center justify-center shrink-0 border ${
                      inbound ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                    }`}>
                      {inbound ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-zinc-200 truncate">
                        {movement.insumoName}
                      </p>
                      <p className="text-[11px] font-mono text-zinc-400">
                        {inbound ? '+' : '-'}{movement.quantity} {movement.unit} · {movement.reason || movement.source}
                      </p>
                      <p className="text-[10px] text-zinc-500 font-mono mt-0.5">
                        {createdAt.toLocaleString('pt-BR')}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      <ModalNovoInsumo isOpen={isNovoInsumoOpen} onClose={() => setIsNovoInsumoOpen(false)} />
      <ModalMovimentacaoEstoque isOpen={isMovimentacaoOpen} onClose={() => setIsMovimentacaoOpen(false)} insumos={insumos} />
    </div>
  );
}
