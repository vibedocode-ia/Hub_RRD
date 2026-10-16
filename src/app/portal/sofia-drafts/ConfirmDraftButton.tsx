'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function ConfirmDraftButton({ draftId, reviewVersion }: { draftId: string; reviewVersion: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  async function confirm() {
    if (loading || !window.confirm('Confirma os dados e consentimentos exibidos para emitir um documento oficial? Não cria cadastro ou chamado e não envia PDF nem mensagem ao WhatsApp.')) return
    setLoading(true)
    setMessage('')
    try {
      const res = await fetch(`/api/sofia/drafts/${draftId}/confirm`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ confirmation: 'CONFIRMO', reviewVersion }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Não foi possível emitir o documento.')
      if (typeof data.documentId !== 'string' || data.previewUrl !== `/portal/documentos/preview/${data.documentId}`) throw new Error('Resultado de emissão inconclusivo. Atualize a página antes de continuar.')
      setMessage('Documento emitido. Abrindo a visualização; nenhum envio foi realizado.')
      router.push(data.previewUrl)
      router.refresh()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Não foi possível emitir o documento.')
    } finally {
      setLoading(false)
    }
  }
  return <div className="flex flex-col items-start gap-2"><button onClick={confirm} disabled={loading} className="rounded-xl bg-cyan-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-50">{loading ? 'Emitindo...' : 'Confirmar e emitir documento'}</button>{message && <p role="status" className="text-xs text-slate-300">{message}</p>}</div>
}
