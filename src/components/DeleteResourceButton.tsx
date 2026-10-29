'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, Loader2 } from 'lucide-react';

export default function DeleteResourceButton({
  endpoint,
  label = 'Excluir',
  confirmText = 'Tem certeza que deseja excluir este registro?',
  confirmPhrase,
  redirectTo,
  className = '',
}: {
  endpoint: string;
  label?: string;
  confirmText?: string;
  confirmPhrase?: string;
  redirectTo?: string;
  className?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!confirm(confirmText)) return;
    if (confirmPhrase && prompt(`Para confirmar, digite ${confirmPhrase}:`) !== confirmPhrase) {
      alert('Confirmação não corresponde. Nada foi excluído.');
      return;
    }
    setLoading(true);
    try {
      const call = async (url: string) => {
        const res = await fetch(url, { method: 'DELETE' });
        const data = await res.json().catch(() => ({}));
        return { res, data };
      };

      let { res, data } = await call(endpoint);

      // 409 = o cliente tem histórico (documentos/chamados/propostas/anexos).
      // Só segue com a exclusão definitiva depois de uma segunda confirmação explícita.
      if (res.status === 409 && data?.blockers) {
        const b = data.blockers;
        const detail = `Documentos: ${b.documents ?? 0} · Chamados: ${b.serviceRequests ?? 0} · Propostas: ${b.proposals ?? 0} · Anexos: ${b.attachments ?? 0}`;
        if (!confirm(`${data.error}\n\n${detail}\n\nExcluir TUDO definitivamente? Não há como desfazer.`)) {
          setLoading(false);
          return;
        }
        const url = endpoint + (endpoint.includes('?') ? '&' : '?') + 'force=1';
        ({ res, data } = await call(url));
      }

      if (!res.ok) {
        alert(data.error || 'Não foi possível excluir.');
        setLoading(false);
        return;
      }
      if (redirectTo) router.push(redirectTo);
      router.refresh();
    } catch {
      alert('Erro de conexão ao excluir.');
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={loading}
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg border border-red-800/60 bg-red-950/40 px-3 py-1.5 text-xs font-bold text-red-300 transition hover:bg-red-900/60 disabled:opacity-50 ${className}`}
    >
      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
      {label}
    </button>
  );
}
