'use client';

import { X } from 'lucide-react';
import { useTransition, useState } from 'react';
import { createVehicle } from '@/lib/actions/operacional';

export function ModalNovoVeiculo({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  async function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await createVehicle(formData);
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
          <h2 className="text-lg font-bold text-slate-100">Novo Veículo</h2>
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
            <label className="text-xs font-bold text-slate-300 uppercase">Nome / Identificação</label>
            <input 
              name="name" 
              required 
              placeholder="Ex: Caminhão Vácuo Heavy 01" 
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 transition"
            />
          </div>
          
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-300 uppercase">Placa</label>
            <input 
              name="plate" 
              placeholder="Ex: ABC-1234" 
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 transition"
            />
          </div>
          
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-300 uppercase">Tipo de Veículo</label>
            <select 
              name="type" 
              required 
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 transition"
            >
              <option value="CAMINHAO_VACUO">Caminhão Vácuo</option>
              <option value="VACOL_COMPACTO">VACOL Compacto</option>
              <option value="VAN_HIDRO">Van Hidrojateamento</option>
              <option value="CARRO_APOIO">Carro de Apoio</option>
            </select>
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
              className="px-4 py-2 rounded-lg text-sm font-bold bg-cyan-600 hover:bg-cyan-500 text-white transition disabled:opacity-50"
            >
              {isPending ? 'Salvando...' : 'Salvar Veículo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
