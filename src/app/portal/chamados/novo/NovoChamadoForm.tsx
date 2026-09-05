'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Save, Loader2, Plus } from 'lucide-react';

interface ClientOpt {
  id: string;
  name: string;
  phone: string;
  addressId?: string;
  addressText?: string;
}

export default function NovoChamadoForm({ clients }: { clients: ClientOpt[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedClientId, setSelectedClientId] = useState(clients[0]?.id || '');
  const [serviceType, setServiceType] = useState('DESENTUPIMENTO');
  const [priority, setPriority] = useState('NORMAL');
  const [problemReported, setProblemReported] = useState('');
  const [totalAmount, setTotalAmount] = useState('300.00');
  const [internalNotes, setInternalNotes] = useState('');

  const selectedClient = clients.find((c) => c.id === selectedClientId);

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
          internalNotes,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Erro ao criar chamado.');
        setLoading(false);
        return;
      }

      router.push('/portal/chamados');
      router.refresh();
    } catch (err) {
      setError('Erro de conexão.');
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

      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="block text-xs font-bold text-slate-300 uppercase">Cliente do Atendimento *</label>
            <Link href="/portal/crm/novo" className="text-xs text-cyan-400 font-bold hover:underline inline-flex items-center gap-1">
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
                  {c.name} ({c.phone}) — {c.addressText}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Tipo de Serviço *</label>
            <select
              value={serviceType}
              onChange={(e) => setServiceType(e.target.value)}
              className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-sm text-slate-100 focus:border-cyan-500 focus:outline-none"
            >
              <option value="DESENTUPIMENTO">Desentupimento em Geral</option>
              <option value="HIDROJATEAMENTO">Hidrojateamento Alta Pressão</option>
              <option value="CAIXA_GORDURA">Limpeza & Rasparia de Caixa de Gordura</option>
              <option value="LIMPA_FOSSA">Esgotamento de Fossa (Vácuo)</option>
              <option value="DEDETIZACAO">Dedetização & Controle de Pragas</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Urgência / Prioridade</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-sm text-slate-100 focus:border-cyan-500 focus:outline-none"
            >
              <option value="NORMAL">Atendimento Normal</option>
              <option value="URGENTE_24H">Emergência URGENTE 24H</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Relato do Problema / Serviço Solicitado *</label>
          <textarea
            required
            rows={3}
            value={problemReported}
            onChange={(e) => setProblemReported(e.target.value)}
            placeholder="Ex: Ralo da cozinha e caixa de gordura entupidos com retorno de efluentes no restaurante."
            className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-sm text-slate-100 placeholder-slate-600 focus:border-cyan-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Valor do Serviço (R$)</label>
          <input
            type="text"
            value={totalAmount}
            onChange={(e) => setTotalAmount(e.target.value)}
            placeholder="300.00"
            className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-sm text-slate-100 placeholder-slate-600 focus:border-cyan-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Observações Internas (Equipes / Equipamento)</label>
          <textarea
            rows={2}
            value={internalNotes}
            onChange={(e) => setInternalNotes(e.target.value)}
            placeholder="Ex: Utilizar caminhão VACOL compacto para acesso a subsolo."
            className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-sm text-slate-100 placeholder-slate-600 focus:border-cyan-500 focus:outline-none"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={loading || clients.length === 0}
        className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold py-4 px-6 rounded-xl shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 transition disabled:opacity-50"
      >
        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
        Criar Chamado Operacional
      </button>
    </form>
  );
}
