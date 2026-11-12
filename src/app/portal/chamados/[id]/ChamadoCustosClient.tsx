'use client';

import { useState } from 'react';
import {
  Package,
  Receipt,
  DollarSign,
  Plus,
  Trash2,
  AlertTriangle,
  Info,
  Loader2,
} from 'lucide-react';

interface Material {
  id: string;
  insumoId?: string | null;
  description: string;
  quantity: string;
  unit: string;
  unitCost: string;
  totalCost: string;
  stockDeducted?: boolean;
}

interface Expense {
  id: string;
  category: string;
  description: string;
  amount: string;
}

interface Insumo {
  id: string;
  nome: string;
  unidade: string;
  quantidade: string;
  nivelCritico: string;
}

const EXPENSE_CATEGORIES: Record<string, string> = {
  COMBUSTIVEL: 'Combustível / Abastecimento',
  PEDAGIO: 'Pedágio',
  DESCARTE_VAZADOURO: 'Taxa de Descarte / Vazadouro',
  DIARIA_EXTRA: 'Diária Extra / Terceirizado',
  ALIMENTACAO: 'Alimentação da Equipe',
  OUTRO: 'Outro Custo Operacional',
};

export default function ChamadoCustosClient({
  serviceRequestId,
  initialMaterials = [],
  initialExpenses = [],
  insumos = [],
  totalAmount = '0.00',
  canEdit = true,
}: {
  serviceRequestId: string;
  initialMaterials: Material[];
  initialExpenses: Expense[];
  insumos: Insumo[];
  totalAmount: string;
  canEdit: boolean;
}) {
  const [materials, setMaterials] = useState<Material[]>(initialMaterials);
  const [expenses, setExpenses] = useState<Expense[]>(initialExpenses);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  // Formulário de novo material
  const [selectedInsumoId, setSelectedInsumoId] = useState('');
  const [customMaterialDesc, setCustomMaterialDesc] = useState('');
  const [materialQty, setMaterialQty] = useState('1');
  const [materialUnit, setMaterialUnit] = useState('Unidade');
  const [materialUnitCost, setMaterialUnitCost] = useState('0.00');

  // Formulário de nova despesa
  const [expenseCategory, setExpenseCategory] = useState('COMBUSTIVEL');
  const [expenseDesc, setExpenseDesc] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('50.00');

  const addMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    let desc = customMaterialDesc.trim();
    let unit = materialUnit.trim() || 'Unidade';
    let insumoRefId: string | null = null;

    if (selectedInsumoId) {
      const ins = insumos.find((i) => i.id === selectedInsumoId);
      if (ins) {
        desc = ins.nome;
        unit = ins.unidade;
        insumoRefId = ins.id;
      }
    }

    if (!desc) return;
    setLoadingAction('add_material');

    try {
      const res = await fetch(`/api/chamados/${serviceRequestId}/materiais`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          insumoId: insumoRefId,
          description: desc,
          quantity: materialQty,
          unit,
          unitCost: materialUnitCost,
          totalCost: (Number(materialQty) * Number(materialUnitCost)).toFixed(2),
        }),
      });

      const data = await res.json();
      if (res.ok && data.material) {
        setMaterials((prev) => [...prev, data.material]);
        setSelectedInsumoId('');
        setCustomMaterialDesc('');
        setMaterialQty('1');
        setMaterialUnit('Unidade');
        setMaterialUnitCost('0.00');
      }
    } finally {
      setLoadingAction(null);
    }
  };

  const removeMaterial = async (materialId: string) => {
    if (!confirm('Remover este material do registro de custos?')) return;
    setLoadingAction(`remove_material_${materialId}`);

    try {
      const res = await fetch(`/api/chamados/${serviceRequestId}/materiais?materialId=${materialId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setMaterials((prev) => prev.filter((m) => m.id !== materialId));
      }
    } finally {
      setLoadingAction(null);
    }
  };

  const addExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const desc = expenseDesc.trim() || EXPENSE_CATEGORIES[expenseCategory] || 'Despesa';
    const amount = Number(expenseAmount) || 0;
    if (amount <= 0) return;
    setLoadingAction('add_expense');

    try {
      const res = await fetch(`/api/chamados/${serviceRequestId}/despesas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: expenseCategory,
          description: desc,
          amount: amount.toFixed(2),
        }),
      });

      const data = await res.json();
      if (res.ok && data.expense) {
        setExpenses((prev) => [...prev, data.expense]);
        setExpenseDesc('');
        setExpenseAmount('50.00');
      }
    } finally {
      setLoadingAction(null);
    }
  };

  const removeExpense = async (expenseId: string) => {
    if (!confirm('Remover esta despesa operacional?')) return;
    setLoadingAction(`remove_expense_${expenseId}`);

    try {
      const res = await fetch(`/api/chamados/${serviceRequestId}/despesas?expenseId=${expenseId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setExpenses((prev) => prev.filter((e) => e.id !== expenseId));
      }
    } finally {
      setLoadingAction(null);
    }
  };

  // Cálculos de Margem & Lucro
  const billed = Number(totalAmount) || 0;
  const totalMaterials = materials.reduce((acc, m) => acc + (Number(m.totalCost) || 0), 0);
  const totalExpenses = expenses.reduce((acc, e) => acc + (Number(e.amount) || 0), 0);
  const totalCosts = totalMaterials + totalExpenses;
  const netProfit = billed - totalCosts;
  const marginPercent = billed > 0 ? ((netProfit / billed) * 100).toFixed(1) : '0.0';

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 space-y-6">
      {/* Header do Controle Interno */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-base font-black text-slate-100 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-emerald-400" />
            Controle Interno Operacional & Custos do Atendimento
          </h2>
          <p className="text-xs text-slate-400">
            Painel exclusivo da administração (Rafael). Zero vazamento para a OS entregue ao cliente.
          </p>
        </div>

        <span className="text-xs font-bold text-amber-400 bg-amber-950/40 border border-amber-800/40 px-3 py-1 rounded-lg flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5" /> Informações Confidenciais
        </span>
      </div>

      {/* Resumo Financeiro & Margem */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/80">
          <p className="text-[11px] font-bold uppercase text-slate-400">Valor Cobrado</p>
          <p className="mt-1 text-xl font-black text-slate-100">R$ {billed.toFixed(2)}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">Entrada / Faturamento</p>
        </div>

        <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/80">
          <p className="text-[11px] font-bold uppercase text-slate-400">(-) Insumos / Materiais</p>
          <p className="mt-1 text-xl font-black text-cyan-400">R$ {totalMaterials.toFixed(2)}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">{materials.length} item(ns) consumido(s)</p>
        </div>

        <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/80">
          <p className="text-[11px] font-bold uppercase text-slate-400">(-) Despesas Operacionais</p>
          <p className="mt-1 text-xl font-black text-amber-400">R$ {totalExpenses.toFixed(2)}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">Combustível, pedágio, vazadouro...</p>
        </div>

        <div className="p-4 rounded-xl border border-emerald-900/60 bg-emerald-950/30">
          <p className="text-[11px] font-bold uppercase text-emerald-400">(=) Lucro Líquido Estimado</p>
          <p className="mt-1 text-xl font-black text-emerald-300">R$ {netProfit.toFixed(2)}</p>
          <p className="text-[10px] font-semibold text-emerald-400 mt-0.5">Margem Operacional: {marginPercent}%</p>
        </div>
      </div>

      {/* Lembrete de Estoque */}
      <div className="rounded-xl border border-cyan-900/40 bg-cyan-950/20 p-3.5 text-xs text-cyan-300 flex items-start gap-2.5">
        <AlertTriangle className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
        <div>
          <strong className="font-bold">Lembrete para o Rafael:</strong> Mantenha os produtos e insumos atualizados no Almoxarifado para que a conferência de estoque e custos de cada OS seja precisa e confiável.
        </div>
      </div>

      {/* Tabela de Materiais Consumidos */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
          <Package className="w-4 h-4 text-cyan-400" /> Materiais & Produtos Utilizados ({materials.length})
        </h3>

        {materials.length === 0 ? (
          <p className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/60 text-xs text-slate-400">
            Nenhum material registrado para este atendimento.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/60">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-800 bg-slate-900/80 text-[10px] font-bold uppercase text-slate-400">
                <tr>
                  <th className="p-3">Descrição do Material</th>
                  <th className="p-3">Qtd.</th>
                  <th className="p-3">Custo Unitário</th>
                  <th className="p-3">Custo Total</th>
                  {canEdit && <th className="p-3 text-right">Ação</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {materials.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-900/40">
                    <td className="p-3 font-semibold text-slate-200">
                      {m.description}
                      {m.insumoId && (
                        <span className="ml-2 text-[10px] font-bold text-cyan-400 bg-cyan-950/50 border border-cyan-800/40 px-1.5 py-0.5 rounded">
                          Estoque
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-slate-300">
                      {m.quantity} {m.unit}
                    </td>
                    <td className="p-3 text-slate-400">R$ {m.unitCost}</td>
                    <td className="p-3 font-bold text-cyan-400">R$ {m.totalCost}</td>
                    {canEdit && (
                      <td className="p-3 text-right">
                        <button
                          type="button"
                          onClick={() => removeMaterial(m.id)}
                          disabled={loadingAction === `remove_material_${m.id}`}
                          className="text-red-400 hover:text-red-300 disabled:opacity-50"
                        >
                          <Trash2 className="w-3.5 h-3.5 inline" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Formulário rápido para adicionar material */}
        {canEdit && (
          <form onSubmit={addMaterial} className="grid grid-cols-1 sm:grid-cols-5 gap-2.5 p-3 rounded-xl border border-slate-800 bg-slate-950/40 items-end">
            <div className="sm:col-span-2">
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Insumo do Estoque</label>
              <select
                value={selectedInsumoId}
                onChange={(e) => {
                  setSelectedInsumoId(e.target.value);
                  const ins = insumos.find((i) => i.id === e.target.value);
                  if (ins) setMaterialUnit(ins.unidade);
                }}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none"
              >
                <option value="">-- Escolher do Estoque ou avulso --</option>
                {insumos.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.nome} ({i.quantidade} {i.unidade})
                  </option>
                ))}
              </select>
              {!selectedInsumoId && (
                <input
                  type="text"
                  placeholder="Ou digite o nome do material..."
                  value={customMaterialDesc}
                  onChange={(e) => setCustomMaterialDesc(e.target.value)}
                  className="mt-1 w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none"
                />
              )}
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Quantidade</label>
              <input
                type="number"
                step="0.1"
                value={materialQty}
                onChange={(e) => setMaterialQty(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Custo Unitário (R$)</label>
              <input
                type="number"
                step="0.01"
                value={materialUnitCost}
                onChange={(e) => setMaterialUnitCost(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div>
              <button
                type="submit"
                disabled={loadingAction === 'add_material'}
                className="w-full rounded-lg bg-cyan-700 hover:bg-cyan-600 px-3 py-2 text-xs font-bold text-white transition flex items-center justify-center gap-1 disabled:opacity-50"
              >
                {loadingAction === 'add_material' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                Adicionar
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Tabela de Despesas Operacionais */}
      <div className="space-y-3 pt-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
          <Receipt className="w-4 h-4 text-cyan-400" /> Despesas Operacionais do Atendimento ({expenses.length})
        </h3>

        {expenses.length === 0 ? (
          <p className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/60 text-xs text-slate-400">
            Nenhuma despesa operacional lançada para este chamado.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/60">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-800 bg-slate-900/80 text-[10px] font-bold uppercase text-slate-400">
                <tr>
                  <th className="p-3">Categoria</th>
                  <th className="p-3">Descrição / Detalhe</th>
                  <th className="p-3">Valor da Despesa</th>
                  {canEdit && <th className="p-3 text-right">Ação</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {expenses.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-900/40">
                    <td className="p-3 font-semibold text-slate-200">
                      {EXPENSE_CATEGORIES[e.category] || e.category}
                    </td>
                    <td className="p-3 text-slate-300">{e.description}</td>
                    <td className="p-3 font-bold text-amber-400">R$ {e.amount}</td>
                    {canEdit && (
                      <td className="p-3 text-right">
                        <button
                          type="button"
                          onClick={() => removeExpense(e.id)}
                          disabled={loadingAction === `remove_expense_${e.id}`}
                          className="text-red-400 hover:text-red-300 disabled:opacity-50"
                        >
                          <Trash2 className="w-3.5 h-3.5 inline" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Formulário rápido para adicionar despesa */}
        {canEdit && (
          <form onSubmit={addExpense} className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 p-3 rounded-xl border border-slate-800 bg-slate-950/40 items-end">
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Categoria</label>
              <select
                value={expenseCategory}
                onChange={(e) => setExpenseCategory(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none"
              >
                {Object.entries(EXPENSE_CATEGORIES).map(([val, label]) => (
                  <option key={val} value={val}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Descrição</label>
              <input
                type="text"
                placeholder="Ex: Combustível, Pedágio Linha Vermelha..."
                value={expenseDesc}
                onChange={(e) => setExpenseDesc(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-slate-200 placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div className="flex gap-2">
              <div className="flex-1">
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Valor (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  value={expenseAmount}
                  onChange={(e) => setExpenseAmount(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={loadingAction === 'add_expense'}
                className="self-end rounded-lg bg-cyan-700 hover:bg-cyan-600 px-3 py-2 text-xs font-bold text-white transition flex items-center gap-1 disabled:opacity-50"
              >
                {loadingAction === 'add_expense' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                Lançar
              </button>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}
