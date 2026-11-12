'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Save,
  Loader2,
  Plus,
  Users,
  Truck,
  Wrench,
  Package,
  Receipt,
  DollarSign,
  AlertTriangle,
  Trash2,
  Info,
} from 'lucide-react';

interface ClientOpt {
  id: string;
  name: string;
  phone: string;
  addressId?: string;
  addressText?: string;
}

interface TeamOpt {
  id: string;
  name: string;
  leaderId?: string | null;
  defaultVehicleId?: string | null;
  memberIds?: string[];
}

interface VehicleOpt {
  id: string;
  name: string;
  plate?: string | null;
  type?: string | null;
}

interface EquipmentOpt {
  id: string;
  name: string;
  code?: string | null;
}

interface CollaboratorOpt {
  id: string;
  name: string;
  role: string;
  phone?: string | null;
}

interface InsumoOpt {
  id: string;
  nome: string;
  unidade: string;
  quantidade: string;
  nivelCritico: string;
}

interface MaterialItem {
  id: string;
  insumoId?: string;
  description: string;
  quantity: string;
  unit: string;
  unitCost: string;
  totalCost: string;
}

interface ExpenseItem {
  id: string;
  category: string;
  description: string;
  amount: string;
}

const EXPENSE_CATEGORIES = [
  { value: 'COMBUSTIVEL', label: 'Combustível / Abastecimento' },
  { value: 'PEDAGIO', label: 'Pedágio' },
  { value: 'DESCARTE_VAZADOURO', label: 'Taxa de Descarte / Vazadouro' },
  { value: 'DIARIA_EXTRA', label: 'Diária Extra / Ajudante Terceirizado' },
  { value: 'ALIMENTACAO', label: 'Alimentação da Equipe' },
  { value: 'OUTRO', label: 'Outro Custo Operacional' },
];

export default function NovoChamadoForm({
  clients,
  teams = [],
  vehicles = [],
  equipment = [],
  collaborators = [],
  insumos = [],
}: {
  clients: ClientOpt[];
  teams: TeamOpt[];
  vehicles: VehicleOpt[];
  equipment: EquipmentOpt[];
  collaborators: CollaboratorOpt[];
  insumos: InsumoOpt[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Dados básicos
  const [selectedClientId, setSelectedClientId] = useState(clients[0]?.id || '');
  const [serviceType, setServiceType] = useState('DESENTUPIMENTO');
  const [priority, setPriority] = useState('NORMAL');
  const [problemReported, setProblemReported] = useState('');
  const [totalAmount, setTotalAmount] = useState('350.00');
  const [paymentMethod, setPaymentMethod] = useState('Pix');
  const [scheduledAt, setScheduledAt] = useState('');

  // Despacho Operacional
  const [assignedTeamId, setAssignedTeamId] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [equipmentId, setEquipmentId] = useState('');
  const [assignedCollaboratorIds, setAssignedCollaboratorIds] = useState<string[]>([]);

  // Materiais e Despesas
  const [materials, setMaterials] = useState<MaterialItem[]>([]);
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);

  // Inputs temporários para adicionar material
  const [selectedInsumoId, setSelectedInsumoId] = useState('');
  const [customMaterialDesc, setCustomMaterialDesc] = useState('');
  const [materialQty, setMaterialQty] = useState('1');
  const [materialUnit, setMaterialUnit] = useState('Unidade');
  const [materialUnitCost, setMaterialUnitCost] = useState('0.00');

  // Inputs temporários para adicionar despesa
  const [expenseCategory, setExpenseCategory] = useState('COMBUSTIVEL');
  const [expenseDesc, setExpenseDesc] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('50.00');

  // Notas
  const [internalNotes, setInternalNotes] = useState('');
  const [customerNotes, setCustomerNotes] = useState('');

  const selectedClient = clients.find((c) => c.id === selectedClientId);

  // Quando escolhe uma equipe, auto-preenche veículo padrão e colaboradores da equipe
  const handleTeamChange = (teamId: string) => {
    setAssignedTeamId(teamId);
    if (!teamId) return;

    const t = teams.find((item) => item.id === teamId);
    if (t) {
      if (t.defaultVehicleId) {
        setVehicleId(t.defaultVehicleId);
      }
      if (Array.isArray(t.memberIds) && t.memberIds.length > 0) {
        setAssignedCollaboratorIds(t.memberIds);
      }
    }
  };

  const toggleCollaborator = (collabId: string) => {
    setAssignedCollaboratorIds((prev) =>
      prev.includes(collabId) ? prev.filter((id) => id !== collabId) : [...prev, collabId]
    );
  };

  const addMaterial = () => {
    let desc = customMaterialDesc.trim();
    let unit = materialUnit.trim() || 'Unidade';
    let insumoRefId: string | undefined = undefined;

    if (selectedInsumoId) {
      const ins = insumos.find((i) => i.id === selectedInsumoId);
      if (ins) {
        desc = ins.nome;
        unit = ins.unidade;
        insumoRefId = ins.id;
      }
    }

    if (!desc) return;

    const qty = Number(materialQty) || 1;
    const unitCost = Number(materialUnitCost) || 0;
    const totalCost = (qty * unitCost).toFixed(2);

    setMaterials((prev) => [
      ...prev,
      {
        id: Math.random().toString(),
        insumoId: insumoRefId,
        description: desc,
        quantity: qty.toFixed(2),
        unit,
        unitCost: unitCost.toFixed(2),
        totalCost,
      },
    ]);

    setSelectedInsumoId('');
    setCustomMaterialDesc('');
    setMaterialQty('1');
    setMaterialUnit('Unidade');
    setMaterialUnitCost('0.00');
  };

  const removeMaterial = (id: string) => {
    setMaterials((prev) => prev.filter((m) => m.id !== id));
  };

  const addExpense = () => {
    const desc = expenseDesc.trim() || EXPENSE_CATEGORIES.find((c) => c.value === expenseCategory)?.label || 'Despesa';
    const amount = Number(expenseAmount) || 0;
    if (amount <= 0) return;

    setExpenses((prev) => [
      ...prev,
      {
        id: Math.random().toString(),
        category: expenseCategory,
        description: desc,
        amount: amount.toFixed(2),
      },
    ]);

    setExpenseDesc('');
    setExpenseAmount('50.00');
  };

  const removeExpense = (id: string) => {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  };

  // Cálculos de margem interna
  const totalBilled = Number(totalAmount) || 0;
  const totalMaterialsCost = materials.reduce((acc, m) => acc + (Number(m.totalCost) || 0), 0);
  const totalExpensesCost = expenses.reduce((acc, e) => acc + (Number(e.amount) || 0), 0);
  const totalCosts = totalMaterialsCost + totalExpensesCost;
  const estimatedProfit = totalBilled - totalCosts;
  const profitMarginPercent = totalBilled > 0 ? ((estimatedProfit / totalBilled) * 100).toFixed(1) : '0.0';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClientId) {
      setError('Cadastre ou selecione um cliente primeiro.');
      return;
    }
    if (!selectedClient?.addressId) {
      setError('O cliente selecionado precisa ter um endereço de atendimento.');
      return;
    }
    if (!problemReported.trim()) {
      setError('Informe o relato do problema.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/chamados', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: selectedClientId,
          addressId: selectedClient.addressId,
          serviceType,
          priority,
          problemReported,
          totalAmount,
          paymentMethod,
          scheduledAt: scheduledAt || null,
          assignedTeamId: assignedTeamId || null,
          assignedCollaboratorIds,
          vehicleId: vehicleId || null,
          equipmentId: equipmentId || null,
          materials: materials.map((m) => ({
            insumoId: m.insumoId || null,
            description: m.description,
            quantity: m.quantity,
            unit: m.unit,
            unitCost: m.unitCost,
            totalCost: m.totalCost,
          })),
          expenses: expenses.map((e) => ({
            category: e.category,
            description: e.description,
            amount: e.amount,
          })),
          customerNotes,
          internalNotes,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Erro ao criar chamado.');
        setLoading(false);
        return;
      }

      router.push(`/portal/chamados/${data.requestId}`);
      router.refresh();
    } catch {
      setError('Erro de conexão ao criar chamado.');
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-4 rounded-xl bg-red-950/60 border border-red-800 text-red-300 text-xs">
          {error}
        </div>
      )}

      {/* 1. Cliente e Endereço */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="block text-xs font-bold text-slate-300 uppercase">Cliente do Atendimento *</label>
            <Link
              href="/portal/crm/novo"
              className="text-xs text-cyan-400 font-bold hover:underline inline-flex items-center gap-1"
            >
              <Plus className="w-3 h-3" /> Cadastrar Novo Cliente
            </Link>
          </div>

          {clients.length === 0 ? (
            <div className="p-3 bg-amber-950/40 border border-amber-800/60 rounded-xl text-amber-300 text-xs">
              Nenhum cliente cadastrado. Clique no botão acima para cadastrar o cliente primeiro.
            </div>
          ) : (
            <select
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
              className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-sm text-slate-100 focus:border-cyan-500 focus:outline-none"
            >
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} · {c.phone} ({c.addressText})
                </option>
              ))}
            </select>
          )}
        </div>

        {selectedClient && (
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs text-slate-400 flex items-center justify-between">
            <span>
              <strong>Local de Atendimento:</strong> {selectedClient.addressText}
            </span>
            <span className="text-cyan-400 font-semibold">{selectedClient.phone}</span>
          </div>
        )}
      </div>

      {/* 2. Detalhes do Serviço & Agendamento */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
        <h2 className="text-sm font-black text-slate-100 uppercase tracking-wider flex items-center gap-2">
          <Wrench className="w-4 h-4 text-cyan-400" /> Detalhes do Serviço
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Tipo de Serviço</label>
            <select
              value={serviceType}
              onChange={(e) => setServiceType(e.target.value)}
              className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-sm text-slate-100 focus:border-cyan-500 focus:outline-none"
            >
              <option value="DESENTUPIMENTO">Desentupimento Mecânico</option>
              <option value="HIDROJATEAMENTO">Hidrojateamento Alta Pressão</option>
              <option value="LIMPA_FOSSA">Limpa Fossa / Sucção Vácuo</option>
              <option value="CAIXA_GORDURA">Caixa de Gordura</option>
              <option value="DEDETIZACAO">Dedetização / Descupinização</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Prioridade</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-sm text-slate-100 focus:border-cyan-500 focus:outline-none"
            >
              <option value="NORMAL">Normal</option>
              <option value="URGENTE_24H">Urgente 24 Horas</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Data / Hora Agendada</label>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-sm text-slate-100 focus:border-cyan-500 focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Relato do Problema pelo Cliente *</label>
          <textarea
            required
            rows={3}
            placeholder="Ex: Esgoto voltando pelo ralo do banheiro, água não escoa da pia há 2 dias..."
            value={problemReported}
            onChange={(e) => setProblemReported(e.target.value)}
            className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-sm text-slate-100 placeholder:text-slate-600 focus:border-cyan-500 focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Valor Cobrado ao Cliente (R$)</label>
            <input
              type="number"
              step="0.01"
              value={totalAmount}
              onChange={(e) => setTotalAmount(e.target.value)}
              className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-sm text-slate-100 focus:border-cyan-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Forma de Pagamento</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-sm text-slate-100 focus:border-cyan-500 focus:outline-none"
            >
              <option value="Pix">Pix</option>
              <option value="Cartão de Crédito">Cartão de Crédito</option>
              <option value="Cartão de Débito">Cartão de Débito</option>
              <option value="Dinheiro">Dinheiro</option>
              <option value="Boleto Faturado">Boleto Faturado</option>
            </select>
          </div>
        </div>
      </div>

      {/* 3. Despacho Operacional: Equipe, Veículo e Colaboradores */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-black text-slate-100 uppercase tracking-wider flex items-center gap-2">
            <Users className="w-4 h-4 text-cyan-400" /> Despacho Operacional (Equipe, Veículo & Técnicos)
          </h2>
          <span className="text-[11px] text-slate-400">Flexível por atendimento</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Seletor de Equipe */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Equipe Pré-definida</label>
            <select
              value={assignedTeamId}
              onChange={(e) => handleTeamChange(e.target.value)}
              className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-sm text-slate-100 focus:border-cyan-500 focus:outline-none"
            >
              <option value="">Sem equipe pré-montada</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-slate-500">Selecionar uma equipe auto-preenche veículo e técnicos abaixo.</p>
          </div>

          {/* Seletor de Veículo */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Veículo / Caminhão</label>
            <select
              value={vehicleId}
              onChange={(e) => setVehicleId(e.target.value)}
              className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-sm text-slate-100 focus:border-cyan-500 focus:outline-none"
            >
              <option value="">Nenhum veículo alocado</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} {v.plate ? `(${v.plate})` : ''}
                </option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-slate-500">A placa sairá na OS do cliente para portaria/condomínio.</p>
          </div>

          {/* Seletor de Equipamento */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Equipamento Especial</label>
            <select
              value={equipmentId}
              onChange={(e) => setEquipmentId(e.target.value)}
              className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-sm text-slate-100 focus:border-cyan-500 focus:outline-none"
            >
              <option value="">Sem equipamento adicional</option>
              {equipment.map((eq) => (
                <option key={eq.id} value={eq.id}>
                  {eq.name} {eq.code ? `[${eq.code}]` : ''}
                </option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-slate-500">Ex: Máquina K-50, Hidrojato portátil, etc.</p>
          </div>
        </div>

        {/* Seleção individual de técnicos/colaboradores */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs font-bold text-slate-300 uppercase">
              Profissionais / Técnicos Designados ({assignedCollaboratorIds.length} selecionado{assignedCollaboratorIds.length === 1 ? '' : 's'})
            </label>
            <Link href="/portal/operacional" className="text-[11px] text-cyan-400 hover:underline">
              + Gerenciar colaboradores
            </Link>
          </div>

          {collaborators.length === 0 ? (
            <p className="p-3 rounded-xl border border-slate-800 bg-slate-950 text-xs text-slate-400">
              Nenhum colaborador ativo cadastrado. Cadastre colaboradores na aba Operacional.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 p-3 rounded-xl border border-slate-800 bg-slate-950/60 max-h-48 overflow-y-auto">
              {collaborators.map((c) => {
                const isSelected = assignedCollaboratorIds.includes(c.id);
                return (
                  <label
                    key={c.id}
                    className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition text-xs ${
                      isSelected
                        ? 'bg-cyan-950/50 border border-cyan-800/60 text-slate-100'
                        : 'hover:bg-slate-900 border border-transparent text-slate-400'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleCollaborator(c.id)}
                      className="h-3.5 w-3.5 rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-cyan-400"
                    />
                    <div className="truncate">
                      <p className="font-semibold truncate">{c.name}</p>
                      <p className="text-[10px] text-cyan-400/80">{c.role}</p>
                    </div>
                  </label>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 4. Controle Interno: Materiais e Insumos Utilizados */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-black text-slate-100 uppercase tracking-wider flex items-center gap-2">
            <Package className="w-4 h-4 text-cyan-400" /> Materiais & Insumos Utilizados (Controle Interno)
          </h2>
          <span className="text-[11px] text-amber-400 font-semibold flex items-center gap-1">
            <Info className="w-3 h-3" /> Não vaza para a OS do cliente
          </span>
        </div>

        {/* Lembrete de Estoque */}
        <div className="rounded-xl border border-cyan-900/40 bg-cyan-950/20 p-3 text-xs text-cyan-300 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
          <span>
            <strong>Lembrete Operacional:</strong> Mantenha os insumos cadastrados e com quantidades atualizadas no estoque para garantir relatórios de margem precisos.
          </span>
        </div>

        {/* Adicionar Material */}
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 p-3.5 rounded-xl border border-slate-800 bg-slate-950/60 items-end">
          <div className="sm:col-span-2">
            <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">Insumo do Estoque</label>
            <select
              value={selectedInsumoId}
              onChange={(e) => {
                setSelectedInsumoId(e.target.value);
                const ins = insumos.find((i) => i.id === e.target.value);
                if (ins) {
                  setMaterialUnit(ins.unidade);
                }
              }}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none"
            >
              <option value="">-- Selecionar do Estoque ou digitar avulso --</option>
              {insumos.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.nome} ({i.quantidade} {i.unidade} em estoque)
                </option>
              ))}
            </select>
            {!selectedInsumoId && (
              <input
                type="text"
                placeholder="Ou digite o nome do material..."
                value={customMaterialDesc}
                onChange={(e) => setCustomMaterialDesc(e.target.value)}
                className="mt-1.5 w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-slate-200 placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none"
              />
            )}
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">Quantidade</label>
            <input
              type="number"
              step="0.1"
              value={materialQty}
              onChange={(e) => setMaterialQty(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">Custo Unitário (R$)</label>
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
              type="button"
              onClick={addMaterial}
              className="w-full rounded-lg bg-cyan-700 hover:bg-cyan-600 px-3 py-2 text-xs font-bold text-white transition flex items-center justify-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Adicionar
            </button>
          </div>
        </div>

        {/* Lista de Materiais Adicionados */}
        {materials.length > 0 && (
          <div className="space-y-1.5 pt-2">
            {materials.map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between p-2.5 rounded-lg border border-slate-800 bg-slate-950 text-xs"
              >
                <div>
                  <span className="font-semibold text-slate-200">{m.description}</span>
                  <span className="text-slate-400 ml-2">
                    ({m.quantity} {m.unit} x R$ {m.unitCost})
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-cyan-400">R$ {m.totalCost}</span>
                  <button
                    type="button"
                    onClick={() => removeMaterial(m.id)}
                    className="text-red-400 hover:text-red-300"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
            <div className="text-right text-xs text-slate-400 font-semibold pt-1">
              Subtotal Materiais: <strong className="text-slate-200">R$ {totalMaterialsCost.toFixed(2)}</strong>
            </div>
          </div>
        )}
      </div>

      {/* 5. Controle Interno: Despesas Operacionais (Combustível, Pedágio, Vazadouro, etc.) */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-black text-slate-100 uppercase tracking-wider flex items-center gap-2">
            <Receipt className="w-4 h-4 text-cyan-400" /> Despesas Operacionais do Atendimento (Controle Interno)
          </h2>
          <span className="text-[11px] text-amber-400 font-semibold flex items-center gap-1">
            <Info className="w-3 h-3" /> Não vaza para a OS do cliente
          </span>
        </div>

        {/* Adicionar Despesa */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 p-3.5 rounded-xl border border-slate-800 bg-slate-950/60 items-end">
          <div>
            <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">Categoria</label>
            <select
              value={expenseCategory}
              onChange={(e) => setExpenseCategory(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none"
            >
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">Descrição / Detalhe</label>
            <input
              type="text"
              placeholder="Ex: Abastecimento Diesel Posto Shell, 2x Pedágio Linha Amarela..."
              value={expenseDesc}
              onChange={(e) => setExpenseDesc(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-slate-200 placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none"
            />
          </div>

          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">Valor (R$)</label>
              <input
                type="number"
                step="0.01"
                value={expenseAmount}
                onChange={(e) => setExpenseAmount(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none"
              />
            </div>
            <button
              type="button"
              onClick={addExpense}
              className="self-end rounded-lg bg-cyan-700 hover:bg-cyan-600 px-3 py-2 text-xs font-bold text-white transition flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Adicionar
            </button>
          </div>
        </div>

        {/* Lista de Despesas Adicionadas */}
        {expenses.length > 0 && (
          <div className="space-y-1.5 pt-2">
            {expenses.map((e) => (
              <div
                key={e.id}
                className="flex items-center justify-between p-2.5 rounded-lg border border-slate-800 bg-slate-950 text-xs"
              >
                <div>
                  <span className="font-semibold text-slate-200">{e.description}</span>
                  <span className="text-slate-400 ml-2">
                    [{EXPENSE_CATEGORIES.find((c) => c.value === e.category)?.label || e.category}]
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-amber-400">R$ {e.amount}</span>
                  <button
                    type="button"
                    onClick={() => removeExpense(e.id)}
                    className="text-red-400 hover:text-red-300"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
            <div className="text-right text-xs text-slate-400 font-semibold pt-1">
              Subtotal Despesas Operacionais: <strong className="text-slate-200">R$ {totalExpensesCost.toFixed(2)}</strong>
            </div>
          </div>
        )}
      </div>

      {/* 6. Resumo Financeiro & Margem da OS (Painel do Rafael) */}
      <div className="rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900/90 to-slate-950 p-6 space-y-4">
        <h2 className="text-sm font-black text-slate-100 uppercase tracking-wider flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-emerald-400" /> Resumo Financeiro & Margem Estimada
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-1">
          <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/70">
            <p className="text-[11px] font-bold uppercase text-slate-400">Valor Cobrado</p>
            <p className="mt-1 text-lg font-black text-slate-100">R$ {totalBilled.toFixed(2)}</p>
          </div>

          <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/70">
            <p className="text-[11px] font-bold uppercase text-slate-400">(-) Materiais</p>
            <p className="mt-1 text-lg font-black text-cyan-400">R$ {totalMaterialsCost.toFixed(2)}</p>
          </div>

          <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/70">
            <p className="text-[11px] font-bold uppercase text-slate-400">(-) Despesas Op.</p>
            <p className="mt-1 text-lg font-black text-amber-400">R$ {totalExpensesCost.toFixed(2)}</p>
          </div>

          <div className="p-3.5 rounded-xl border border-emerald-900/50 bg-emerald-950/30">
            <p className="text-[11px] font-bold uppercase text-emerald-400">(=) Lucro / Margem</p>
            <p className="mt-1 text-lg font-black text-emerald-300">
              R$ {estimatedProfit.toFixed(2)}
              <span className="text-xs font-semibold ml-1.5 opacity-80">({profitMarginPercent}%)</span>
            </p>
          </div>
        </div>
      </div>

      {/* 7. Observações e Notas Segregadas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Observações ao Cliente (Públicas na OS) */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-slate-300 uppercase">
              Observações na OS do Cliente (Público)
            </label>
            <span className="text-[10px] text-emerald-400 font-bold uppercase">Visível no Laudo/OS</span>
          </div>
          <textarea
            rows={3}
            placeholder="Instruções de uso, cuidados pós-desentupimento, recomendações que o cliente lerá..."
            value={customerNotes}
            onChange={(e) => setCustomerNotes(e.target.value)}
            className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-sm text-slate-100 placeholder:text-slate-600 focus:border-cyan-500 focus:outline-none"
          />
        </div>

        {/* Notas Internas (Confidenciais) */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-slate-300 uppercase">
              Notas Internas (Confidencial)
            </label>
            <span className="text-[10px] text-amber-400 font-bold uppercase">Apenas Rafael / Interno</span>
          </div>
          <textarea
            rows={3}
            placeholder="Dificuldades no acesso, diárias a acertar, combinação interna com a equipe..."
            value={internalNotes}
            onChange={(e) => setInternalNotes(e.target.value)}
            className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-sm text-slate-100 placeholder:text-slate-600 focus:border-cyan-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Botão de Envio */}
      <button
        type="submit"
        disabled={loading}
        className="w-full py-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-cyan-950/50 transition disabled:opacity-50"
      >
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" /> Registrando Ordem de Serviço...
          </>
        ) : (
          <>
            <Save className="w-5 h-5" /> Abrir e Despachar Chamado / OS
          </>
        )}
      </button>
    </form>
  );
}
