import Link from 'next/link'
import { redirect } from 'next/navigation'
import { requireLocalPermission } from '@/lib/require-local-permission'
import { db, sofiaDrafts, SOFIA_DRAFT_STATUS } from '@/db'
import { desc, eq } from 'drizzle-orm'
import ConfirmDraftButton from './ConfirmDraftButton'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Central de Rascunhos Sofia · Hub RR' }

type DraftPayload = { customerName?: string; customerPhone?: string; serviceType?: string; problemReported?: string; address?: { street?: string; number?: string; neighborhood?: string } }

export default async function SofiaDraftsPage() {
  if (!await requireLocalPermission('sofia.drafts.review')) redirect('/portal')
  const drafts = db ? await db.select().from(sofiaDrafts).orderBy(desc(sofiaDrafts.updatedAt)).limit(100) : []
  return <div className="space-y-6"><div><h1 className="text-2xl font-black text-slate-100">Fila de Rascunhos da Sofia</h1><p className="mt-1 text-sm text-slate-400">Revise os dados enviados pelo WhatsApp e confirme antes de criar qualquer chamado ou documento.</p></div>{drafts.length === 0 ? <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-10 text-center text-sm text-slate-400">Nenhum rascunho recebido ainda.</div> : <div className="space-y-4">{drafts.map(draft => { const payload = draft.draftPayload as DraftPayload; const missing = Array.isArray(draft.pendingFields) ? draft.pendingFields as Array<{ label?: string }> : []; return <article key={draft.id} className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-5"><div className="flex flex-wrap items-center justify-between gap-2"><div><p className="font-bold text-slate-100">{payload.customerName || 'Cliente a confirmar'}</p><p className="text-xs text-cyan-300">{draft.intent} · {draft.status}</p></div><time className="text-xs text-slate-500">{new Date(draft.updatedAt).toLocaleString('pt-BR')}</time></div><div className="grid gap-2 text-sm text-slate-300 md:grid-cols-2"><p><b>Serviço:</b> {payload.serviceType || 'A confirmar'}</p><p><b>Contato:</b> {payload.customerPhone || 'A confirmar'}</p><p className="md:col-span-2"><b>Endereço:</b> {[payload.address?.street, payload.address?.number, payload.address?.neighborhood].filter(Boolean).join(', ') || 'A confirmar'}</p><p className="md:col-span-2"><b>Pedido:</b> {payload.problemReported || 'A confirmar'}</p></div>{missing.length > 0 && <p className="rounded-lg bg-amber-950/40 p-3 text-xs text-amber-200">Ainda falta: {missing.map(item => item.label || 'informação').join(', ')}.</p>}{draft.status === SOFIA_DRAFT_STATUS.PENDING_REVIEW && <ConfirmDraftButton draftId={draft.id} />}{draft.status === SOFIA_DRAFT_STATUS.CONVERTED && draft.serviceRequestId && <Link className="text-xs font-bold text-cyan-300" href={`/portal/chamados/${draft.serviceRequestId}/editar`}>Abrir chamado confirmado</Link>}</article> })}</div>}</div>
}
