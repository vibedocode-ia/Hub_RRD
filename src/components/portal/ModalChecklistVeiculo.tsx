'use client';

import { X } from 'lucide-react';
import { useTransition, useState } from 'react';
import { submitChecklist } from '@/lib/actions/operacional';

export function ModalChecklistVeiculo({ 
  isOpen, 
  onClose,
  vehicle 
}: { 
  isOpen: boolean; 
  onClose: () => void;
  vehicle: any | null;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !vehicle) return null;

  async function handleSubmit(formData: FormData) {
    formData.append('vehicleId', vehicle.id);
    setError(null);
    startTransition(async () => {
      const res = await submitChecklist(formData);
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
          <h2 className="text-lg font-bold text-slate-100">Checklist: {vehicle.name}</h2>
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
          
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input type="checkbox" name="oilChecked" className="rounded bg-slate-950 border-slate-700 text-cyan-500 focus:ring-cyan-500" />
              Óleo e Água do Motor
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input type="checkbox" name="tiresChecked" className="rounded bg-slate-950 border-slate-700 text-cyan-500 focus:ring-cyan-500" />
              Pneus e Calibragem
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input type="checkbox" name="pumpChecked" className="rounded bg-slate-950 border-slate-700 text-cyan-500 focus:ring-cyan-500" />
              Bomba de Vácuo / Hidrojato
            </label>
          </div>
          
          <div className="space-y-1 pt-2">
            <label className="text-xs font-bold text-slate-300 uppercase">Observações / Avarias</label>
            <textarea 
              name="notes" 
              rows={3}
              placeholder="Detalhe se houve alguma avaria..." 
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 transition resize-none"
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
              className="px-4 py-2 rounded-lg text-sm font-bold bg-cyan-600 hover:bg-cyan-500 text-white transition disabled:opacity-50"
            >
              {isPending ? 'Enviando...' : 'Finalizar Checklist'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
