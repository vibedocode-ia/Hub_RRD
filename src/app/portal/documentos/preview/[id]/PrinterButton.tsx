'use client';

import { Printer, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export function PrinterButton() {
  return (
    <div className="flex items-center gap-3">
      <Link
        href="/portal/documentos"
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
      >
        <ArrowLeft className="w-4 h-4" /> Voltar ao Hub
      </Link>
      <button
        onClick={() => window.print()}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20 transition"
      >
        <Printer className="w-4 h-4" /> Imprimir / Salvar PDF
      </button>
    </div>
  );
}
