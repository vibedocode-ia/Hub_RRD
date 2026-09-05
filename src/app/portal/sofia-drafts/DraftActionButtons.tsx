'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, CheckCircle2, Loader2, DollarSign } from 'lucide-react';

export default function DraftActionButtons({ draftId, defaultAmount }: { draftId: string; defaultAmount: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState(defaultAmount);
  const [paymentMethod, setPaymentMethod] = useState('Pix');

  const handleEmit = async (docType: 'RECIBO_GARANTIA' | 'LAUDO_TECNICO') => {
    setLoading(true);
    try {
      const res = await fetch('/api/documents/emit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceRequestId: draftId,
          docType,
          amount,
          paymentMethod,
          warrantyDays: 30,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Erro ao emitir documento.');
        setLoading(false);
        return;
      }

      router.push(data.previewUrl);
    } catch (err) {
      alert('Erro de conexão ao gerar PDF.');
      setLoading(false);
    }
  };

  return (
    <div className="pt-2 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs">
          <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-slate-400">R$</span>
          <input
            type="text"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-20 bg-transparent text-slate-100 font-bold focus:outline-none"
          />
        </div>

        <select
          value={paymentMethod}
          onChange={(e) => setPaymentMethod(e.target.value)}
          className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
        >
          <option value="Pix">Pix</option>
          <option value="Cartão de Crédito/Débito">Cartão</option>
          <option value="Espécie / Dinheiro">Dinheiro</option>
          <option value="Boleto Bancário">Boleto</option>
        </select>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => handleEmit('RECIBO_GARANTIA')}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/20 transition disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
          Emitir Recibo + Garantia
        </button>

        <button
          onClick={() => handleEmit('LAUDO_TECNICO')}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-400 font-bold text-xs border border-slate-700 transition disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
          Emitir Laudo / OS
        </button>
      </div>
    </div>
  );
}
