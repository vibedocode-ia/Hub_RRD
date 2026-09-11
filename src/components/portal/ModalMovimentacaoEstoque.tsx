'use client';

import { X } from 'lucide-react';
import { useTransition, useState } from 'react';
import { registerStockMovement } from '@/lib/actions/estoque';

export function ModalMovimentacaoEstoque({ 
  isOpen, 
  onClose,
  insumos 
}: { 
  isOpen: boolean; 
  onClose: () => void;
  insumos: any[];
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [type, setType] = useState('SAIDA');

  if (!isOpen) return null;

  async function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await registerStockMovement(formData);
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
          <h2 className="text-lg font-bold text-slate-100">Nova Movimentação</h2>
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
              <label className={`flex-1 text-center py-2 text-sm font-bold rounded-md cursor-pointer transition ${type === 'ENTRADA' ? 'bg-emerald-500/20 text-emerald-400' : 'text-slate-400 hover:text-slate-300'}`}>
                <input type="radio" name="type" value="ENTRADA" checked={type === 'ENTRADA'} onChange={() => setType('ENTRADA')} className="hidden" />
                Entrada
              </label>
              <label className={`flex-1 text-center py-2 text-sm font-bold rounded-md cursor-pointer transition ${type === 'SAIDA' ? 'bg-red-500/20 text-red-400' : 'text-slate-400 hover:text-slate-300'}`}>
                <input type="radio" name="type" value="SAIDA" checked={type === 'SAIDA'} onChange={() => setType('SAIDA')} className="hidden" />
                Saída
              </label>
            </div>
          </div>
          
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-300 uppercase">Insumo</label>
            <select 
              name="insumoId" 
              required 
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 transition"
            >
              <option value="">Selecione um insumo...</option>
              {insumos.map(i => (
                <option key={i.id} value={i.id}>{i.nome} ({i.quantidade} {i.unidade} em estoque)</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-300 uppercase">Quantidade</label>
            <input 
              name="quantity"
              type="number" 
              step="0.1"
              required
              min="0.1"
              placeholder="Ex: 5" 
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 transition"
            />
          </div>
          
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-300 uppercase">Motivo / Observação</label>
            <input 
              name="reason" 
              placeholder={type === 'ENTRADA' ? 'Ex: Compra Nota 123' : 'Ex: Equipe Alpha (Desentupimento)'}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 transition"
            />
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
              className={`px-4 py-2 rounded-lg text-sm font-bold text-white transition disabled:opacity-50 ${type === 'ENTRADA' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-red-600 hover:bg-red-500'}`}
            >
              {isPending ? 'Registrando...' : 'Confirmar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
