'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function ConfirmDraftButton({ draftId }: { draftId: string }) {
  const router = useRouter(); const [loading, setLoading] = useState(false); const [message, setMessage] = useState('')
  async function confirm() {
    if (!window.confirm('Confirmar os dados do rascunho e criar o chamado para emissão?')) return
    setLoading(true); setMessage('')
    try { const res = await fetch(`/api/sofia/drafts/${draftId}/confirm`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ confirmation: 'CONFIRMO' }) }); const data = await res.json(); if (!res.ok) throw new Error(data.error || 'Não foi possível confirmar o rascunho.'); setMessage('Confirmado. Agora preencha valor e forma de pagamento para emitir o documento.'); router.refresh() } catch (error) { setMessage(error instanceof Error ? error.message : 'Não foi possível confirmar o rascunho.') } finally { setLoading(false) }
  }
  return <div className="flex flex-col items-start gap-2"><button onClick={confirm} disabled={loading} className="rounded-xl bg-cyan-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-50">{loading ? 'Confirmando...' : 'Confirmar rascunho'}</button>{message && <p className="text-xs text-slate-300">{message}</p>}</div>
}
