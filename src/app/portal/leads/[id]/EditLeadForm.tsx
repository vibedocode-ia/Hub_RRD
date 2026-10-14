'use client'
import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function EditLeadForm({lead,onSaved}:any){
  const router = useRouter()
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setMessage('')
    const form = new FormData(event.currentTarget)
    const body = Object.fromEntries(['name','phone','email','document','sourceChannel','status','priority','serviceType','problemReported','notes'].map(key => [key, form.get(key)]))
    try {
      const response = await fetch(`/api/leads/${lead.id}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) { setMessage(data.error || 'Não foi possível salvar o lead.'); return }
      router.refresh(); onSaved?.()
    } catch { setMessage('Falha de conexão ao salvar o lead.') } finally { setSaving(false) }
  }
  const statuses = [['NEW','Novo'],['QUOTING','Em orçamento'],['APPROVED','Aprovado'],['LOST','Perdido']]
  return <form onSubmit={submit} className="mx-auto max-w-3xl space-y-5 rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
    <Link href={`/portal/leads/${lead.id}`} className="text-sm font-bold text-cyan-300">← Voltar ao lead</Link>
    <h1 className="text-2xl font-black">Editar Lead</h1>
    {message && <p role="alert" className="rounded-xl border border-red-500/30 bg-red-950/30 p-3 text-sm text-red-200">{message}</p>}
    <div className="grid gap-4 sm:grid-cols-2">
      <Field name="name" label="Nome" defaultValue={lead.name} required />
      <Field name="phone" label="Telefone" defaultValue={lead.phone} required />
      <Field name="email" label="E-mail" type="email" defaultValue={lead.email || ''} />
      <Field name="document" label="CPF/CNPJ" defaultValue={lead.document || ''} />
      <Field name="sourceChannel" label="Origem" defaultValue={lead.sourceChannel} />
      <label className="text-sm font-semibold text-slate-300">Status<select name="status" defaultValue={lead.status} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 p-3">{statuses.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
      <label className="text-sm font-semibold text-slate-300">Prioridade<select name="priority" defaultValue={lead.priority} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 p-3"><option value="NORMAL">Normal</option><option value="URGENTE_24H">Urgente 24h</option></select></label>
      <Field name="serviceType" label="Serviço de interesse" defaultValue={lead.serviceType || ''} />
    </div>
    <Field name="problemReported" label="Problema relatado" defaultValue={lead.problemReported || ''} />
    <label className="block text-sm font-semibold text-slate-300">Observações<textarea name="notes" rows={4} defaultValue={lead.notes || ''} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 p-3" /></label>
    <button disabled={saving} className="rounded-xl bg-cyan-600 px-5 py-3 font-bold text-white disabled:opacity-60">{saving ? 'Salvando…' : 'Salvar alterações'}</button>
  </form>
}
function Field(props: {name:string;label:string;defaultValue?:string;required?:boolean;type?:string}) { return <label className="block text-sm font-semibold text-slate-300">{props.label}<input {...props} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 p-3" /></label> }
