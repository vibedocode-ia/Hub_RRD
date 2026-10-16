'use client';

import { useRef, useState } from 'react';
import { Printer, ArrowLeft, Download } from 'lucide-react';
import Link from 'next/link';
import { prepareOfficialPdfDownload } from '@/lib/official-pdf-download';

export function PrinterButton({ documentId, canIssue = false }: { documentId: string; canIssue?: boolean }) {
  const locked = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);
  const downloadPdf = async () => {
    if (locked.current) return;
    locked.current = true;
    setBusy(true); setError(''); setReady(false);
    try {
      const blob = await prepareOfficialPdfDownload(documentId, undefined, canIssue);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url; anchor.download = `documento-${documentId}.pdf`;
      document.body.appendChild(anchor); anchor.click(); anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
      setReady(true);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Falha ao baixar PDF oficial. Tente novamente.');
    } finally { locked.current = false; setBusy(false); }
  };
  const printDocument = () => {
    const frame = document.getElementById('rrd-document-frame') as HTMLIFrameElement | null;
    frame?.contentWindow?.focus();
    frame?.contentWindow?.print();
  };

  return (
    <div className="flex flex-col gap-2 min-w-0 w-full sm:w-auto sm:max-w-md">
      <div className="flex flex-wrap items-center gap-2">
        <Link href="/portal/documentos" className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition">
          <ArrowLeft className="w-4 h-4" /> Voltar ao Hub
        </Link>
        <button type="button" onClick={downloadPdf} disabled={busy} aria-busy={busy} className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-60 text-slate-950 font-bold text-xs transition">
          <Download className="w-4 h-4" /> {busy ? 'Preparando PDF…' : error ? 'Tentar novamente' : 'Gerar / baixar PDF oficial'}
        </button>
        <button type="button" onClick={printDocument} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition">
          <Printer className="w-4 h-4" /> Imprimir / Salvar PDF
        </button>
      </div>
      <p className="text-xs text-slate-400" aria-live="polite">{ready ? 'Download solicitado. ' : ''}Gerar ou baixar não envia o documento ao cliente.</p>
      {error && <p role="alert" className="text-xs text-amber-300 break-words">{error}</p>}
    </div>
  );
}
