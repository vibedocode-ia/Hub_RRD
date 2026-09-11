'use client';

import { X } from 'lucide-react';
import { useTransition, useState } from 'react';
import { createInsumo } from '@/lib/actions/estoque';

export function ModalNovoInsumo({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  async function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await createInsumo(formData);
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
          <h2 className="text-lg font-bold text-slate-100">Novo Insumo</h2>
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
            <label className="text-xs font-bold text-slate-300 uppercase">Nome do Insumo</label>
            <input 
              name="nome" 
              required 
              placeholder="Ex: K-Othrine WG" 
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 transition"
            />
          </div>
          
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-300 uppercase">Categoria</label>
            <select 
              name="categoria" 
              required 
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 transition"
            >
              <option value="Inseticida">Inseticida</option>
              <option value="Raticida">Raticida</option>
              <option value="Equipamento de Apoio">Equipamento de Apoio</option>
              <option value="EPI">EPI</option>
              <option value="Outros">Outros</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-300 uppercase">Unidade</label>
              <select 
                name="unidade" 
                required 
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 transition"
              >
                <option value="Litros">Litros (L)</option>
                <option value="Kg">Quilos (Kg)</option>
                <option value="Unidades">Unidades</option>
                <option value="Caixas">Caixas</option>
              </select>
            </div>
            
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-300 uppercase">Nível Crítico</label>
              <input 
                name="nivelCritico"
                type="number" 
                step="0.1"
                placeholder="Ex: 5" 
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 transition"
              />
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
              className="px-4 py-2 rounded-lg text-sm font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition disabled:opacity-50"
            >
              {isPending ? 'Salvando...' : 'Salvar Insumo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
