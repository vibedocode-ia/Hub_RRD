'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Save, Loader2, Users, Truck, Wrench, UserCheck } from 'lucide-react';

export default function EditChamadoForm({
  initial,
  teams = [],
  vehicles = [],
  equipment = [],
  collaborators = [],
}: {
  initial: any;
  teams: any[];
  vehicles: any[];
  equipment: any[];
  collaborators: any[];
}) {
  const router = useRouter();
  const [form, setForm] = useState({
    ...initial,
    assignedCollaboratorIds: Array.isArray(initial.assignedCollaboratorIds) ? initial.assignedCollaboratorIds : [],
    scheduledAt: initial.scheduledAt ? new Date(initial.scheduledAt).toISOString().slice(0, 16) : '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ch = (e: any) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleTeamChange = (e: any) => {
    const teamId = e.target.value;
    const selectedTeam = teams.find((t) => t.id === teamId);
    setForm((prev: any) => {
      const updated = { ...prev, assignedTeamId: teamId || null };
      if (selectedTeam) {
        if (selectedTeam.defaultVehicleId) updated.vehicleId = selectedTeam.defaultVehicleId;
        if (Array.isArray(selectedTeam.memberIds) && selectedTeam.memberIds.length > 0) {
          updated.assignedCollaboratorIds = selectedTeam.memberIds;
        }
      }
      return updated;
    });
  };

  const toggleCollaborator = (collabId: string) => {
    setForm((prev: any) => {
      const current = Array.isArray(prev.assignedCollaboratorIds) ? prev.assignedCollaboratorIds : [];
      const updated = current.includes(collabId)
        ? current.filter((id: string) => id !== collabId)
        : [...current, collabId];
      return { ...prev, assignedCollaboratorIds: updated };
    });
  };

  const submit = async (e: any) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const body = {
      ...form,
      assignedTeamId: form.assignedTeamId || null,
      vehicleId: form.vehicleId || null,
      equipmentId: form.equipmentId || null,
      scheduledAt: form.scheduledAt ? new Date(form.scheduledAt).toISOString() : null,
    };

    const res = await fetch(`/api/chamados/${initial.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || 'Erro ao salvar chamado.');
      setLoading(false);
      return;
    }

    router.push(`/portal/chamados/${initial.id}`);
    router.refresh();
  };

  return (
    <form onSubmit={submit} className="space-y-6 rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
      {error && (
        <div className="rounded-xl border border-red-800 bg-red-950/50 p-3 text-xs text-red-200">
          {error}
        </div>
      )}

      {/* Dados Gerais do Chamado */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Select
          name="serviceType"
          label="Serviço"
          value={form.serviceType}
          onChange={ch}
          options={['DESENTUPIMENTO', 'HIDROJATEAMENTO', 'CAIXA_GORDURA', 'LIMPA_FOSSA', 'DEDETIZACAO']}
        />
        <Select
          name="priority"
          label="Prioridade"
          value={form.priority}
          onChange={ch}
          options={['NORMAL', 'URGENTE_24H']}
        />
        <Select
          name="status"
          label="Status"
          value={form.status}
          onChange={ch}
          options={['PENDING_REVIEW', 'AGENDADO', 'EM_EXECUCAO', 'CONCLUIDO', 'CANCELADO']}
        />
        <Field name="totalAmount" label="Valor Cobrado (R$)" value={form.totalAmount || '0.00'} onChange={ch} />
        <Field name="paymentMethod" label="Forma de Pagamento" value={form.paymentMethod || 'Pix'} onChange={ch} />
        <Field name="warrantyDays" label="Garantia (dias)" value={form.warrantyDays || 30} onChange={ch} />
      </div>

      <div>
        <label className="block text-xs font-bold uppercase text-slate-300 mb-1">Data / Hora Agendada</label>
        <input
          type="datetime-local"
          name="scheduledAt"
          value={form.scheduledAt || ''}
          onChange={ch}
          className="w-full rounded-xl border border-slate-800 bg-slate-950 p-3 text-sm text-slate-100 focus:border-cyan-500 focus:outline-none"
        />
      </div>

      {/* Despacho Operacional: Equipe, Veículo e Colaboradores */}
      <div className="space-y-4 rounded-xl border border-slate-800 bg-slate-950/60 p-4">
        <h3 className="text-xs font-black uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
          <Truck className="w-4 h-4" /> Despacho de Campo (Equipe & Frota)
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-bold uppercase text-slate-300 mb-1">Equipe</label>
            <select
              name="assignedTeamId"
              value={form.assignedTeamId || ''}
              onChange={handleTeamChange}
              className="w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-xs text-slate-100 focus:border-cyan-500 focus:outline-none"
            >
              <option value="">Sem equipe vinculada</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-300 mb-1">Veículo / Placa</label>
            <select
              name="vehicleId"
              value={form.vehicleId || ''}
              onChange={ch}
              className="w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-xs text-slate-100 focus:border-cyan-500 focus:outline-none"
            >
              <option value="">Sem veículo vinculado</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} {v.plate ? `(${v.plate})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-300 mb-1">Equipamento</label>
            <select
              name="equipmentId"
              value={form.equipmentId || ''}
              onChange={ch}
              className="w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-xs text-slate-100 focus:border-cyan-500 focus:outline-none"
            >
              <option value="">Sem equipamento específico</option>
              {equipment.map((eq) => (
                <option key={eq.id} value={eq.id}>
                  {eq.name} {eq.code ? `[${eq.code}]` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Colaboradores Designados */}
        <div>
          <label className="block text-xs font-bold uppercase text-slate-300 mb-1 flex items-center justify-between">
            <span>Técnicos Designados ({form.assignedCollaboratorIds.length} selecionado{form.assignedCollaboratorIds.length === 1 ? '' : 's'})</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 p-2.5 rounded-xl border border-slate-800 bg-slate-900/60 max-h-40 overflow-y-auto">
            {collaborators.map((c) => {
              const isChecked = form.assignedCollaboratorIds.includes(c.id);
              return (
                <label
                  key={c.id}
                  className={`flex items-center gap-2 p-1.5 rounded-lg cursor-pointer text-xs ${
                    isChecked ? 'bg-cyan-950/50 text-cyan-300 font-bold' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleCollaborator(c.id)}
                    className="h-3.5 w-3.5 rounded border-slate-700 bg-slate-950 text-cyan-500 focus:ring-cyan-400"
                  />
                  <span className="truncate">{c.name}</span>
                </label>
              );
            })}
          </div>
        </div>
      </div>

      {/* Relato e Diagnóstico */}
      <Area name="problemReported" label="Problema Relatado *" value={form.problemReported || ''} onChange={ch} required />
      <Area name="problemFound" label="Diagnóstico Técnico Encontrado" value={form.problemFound || ''} onChange={ch} />

      {/* Notas Segregadas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Area
          name="customerNotes"
          label="Observações ao Cliente (OS Pública)"
          value={form.customerNotes || ''}
          onChange={ch}
          hint="Sai impressa no laudo do cliente."
        />
        <Area
          name="internalNotes"
          label="Notas Internas (Confidencial Rafael/Equipe)"
          value={form.internalNotes || ''}
          onChange={ch}
          hint="Nunca vaza para o cliente."
        />
      </div>

      {form.status === 'CANCELADO' && (
        <Area name="cancelReason" label="Motivo do Cancelamento" value={form.cancelReason || ''} onChange={ch} />
      )}

      <button
        type="submit"
        disabled={loading}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-600 px-4 py-3 text-sm font-bold text-white hover:bg-cyan-500 disabled:opacity-50 shadow-lg shadow-cyan-950/40"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Salvar Alterações do Chamado
      </button>
    </form>
  );
}

function Field(p: any) {
  return (
    <label className="block">
      <span className="text-xs font-bold uppercase text-slate-300">{p.label}</span>
      <input
        {...p}
        label={undefined}
        className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950 p-3 text-sm text-slate-100 focus:border-cyan-500 focus:outline-none"
      />
    </label>
  );
}

function Area(p: any) {
  return (
    <label className="block">
      <span className="text-xs font-bold uppercase text-slate-300 flex items-center justify-between">
        <span>{p.label}</span>
        {p.hint && <span className="text-[10px] text-slate-500 font-normal lowercase">{p.hint}</span>}
      </span>
      <textarea
        {...p}
        label={undefined}
        hint={undefined}
        rows={3}
        className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950 p-3 text-sm text-slate-100 focus:border-cyan-500 focus:outline-none"
      />
    </label>
  );
}

function Select({ name, label, value, onChange, options }: any) {
  return (
    <label className="block">
      <span className="text-xs font-bold uppercase text-slate-300">{label}</span>
      <select
        name={name}
        value={value}
        onChange={onChange}
        className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950 p-3 text-sm text-slate-100 focus:border-cyan-500 focus:outline-none"
      >
        {options.map((o: string) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}
