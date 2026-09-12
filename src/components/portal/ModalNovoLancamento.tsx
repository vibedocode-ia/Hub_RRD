'use client';

import { X } from 'lucide-react';
import { useTransition, useState } from 'react';
import { createTransaction } from '@/lib/actions/financeiro';

export function ModalNovoLancamento({ isOpen, onClose, clientOptions }: { isOpen: boolean; onClose: () => void; clientOptions: Array<{ id: string; name: string }> }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [tipo, setTipo] = useState('DESPESA');

  if (!isOpen) return null;

  async function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await createTransaction(formData);
      if (res.error) {
        setError(res.error);
      } else {
        onClose();
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
        <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
          <h2 className="text-lg font-bold text-slate-100">Novo Lançamento Avulso</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form action={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg">
              {error}
            </div>
          )}
          
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-300 uppercase">Tipo</label>
            <div className="flex bg-slate-950 rounded-lg p-1 border border-slate-800">
              <label className={`flex-1 text-center py-2 text-sm font-bold rounded-md cursor-pointer transition ${tipo === 'RECEITA' ? 'bg-emerald-500/20 text-emerald-400' : 'text-slate-400 hover:text-slate-300'}`}>
                <input type="radio" name="tipo" value="RECEITA" checked={tipo === 'RECEITA'} onChange={() => setTipo('RECEITA')} className="hidden" />
                Receita
              </label>
              <label className={`flex-1 text-center py-2 text-sm font-bold rounded-md cursor-pointer transition ${tipo === 'DESPESA' ? 'bg-red-500/20 text-red-400' : 'text-slate-400 hover:text-slate-300'}`}>
                <input type="radio" name="tipo" value="DESPESA" checked={tipo === 'DESPESA'} onChange={() => setTipo('DESPESA')} className="hidden" />
                Despesa
              </label>
            </div>
          </div>
          
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-300 uppercase">Descrição</label>
            <input 
              name="descricao" 
              required 
              placeholder={tipo === 'RECEITA' ? 'Ex: Venda Equipamento Antigo' : 'Ex: Abastecimento Frota 01'} 
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 transition"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-300 uppercase">Valor (R$)</label>
              <input 
                name="valor"
                type="number" 
                step="0.01"
                required
                min="0.01"
                placeholder="0.00" 
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 transition"
              />
            </div>
            
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-300 uppercase">Data</label>
              <input 
                name="data"
                type="date" 
                required
                defaultValue={new Date().toISOString().split('T')[0]}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 transition"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-300 uppercase">Cliente vinculado</label>
            <select name="clientId" className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 transition">
              <option value="">Lançamento geral / sem cliente</option>
              {clientOptions.map(client => <option key={client.id} value={client.id}>{client.name}</option>)}
            </select>
            <p className="text-[11px] text-slate-500">Vincule receitas ou pendências ao cliente para atualizar LTV e CRM.</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-300 uppercase">Categoria</label>
              <select 
                name="categoria" 
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 transition"
              >
                <option value="Serviços Extras">Serviços Extras</option>
                <option value="Combustível">Combustível</option>
                <option value="Manutenção">Manutenção</option>
                <option value="Suprimentos">Suprimentos</option>
                <option value="Outros">Outros</option>
              </select>
            </div>
            
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-300 uppercase">Status</label>
              <select 
                name="status" 
                required 
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 transition"
              >
                <option value="EFETIVADO">Efetivado (Pago/Recebido)</option>
                <option value="PENDENTE">Pendente</option>
              </select>
            </div>
          </div>
          
          <div className="pt-4 flex justify-end gap-3">
            <button 
              type="button" 
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              disabled={isPending}
              className={`px-4 py-2 rounded-lg text-sm font-bold text-white transition disabled:opacity-50 ${tipo === 'RECEITA' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-red-600 hover:bg-red-500'}`}
            >
              {isPending ? 'Salvando...' : 'Confirmar Lançamento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
