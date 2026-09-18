'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { Archive, Building2, Mail, Pencil, Phone, Plus, Search, UserRound, Users } from 'lucide-react'

type Contact = { id: string; name: string; phone: string | null; email: string | null; title: string | null; photoUrl: string | null; linkedinUrl: string | null; instagramUrl: string | null; websiteUrl: string | null; clientId: string | null }
type Company = { id: string; name: string }
type ContactForm = { name: string; phone: string; email: string; title: string; photoUrl: string; linkedinUrl: string; instagramUrl: string; websiteUrl: string; clientId: string }

const emptyForm: ContactForm = { name: '', phone: '', email: '', title: '', photoUrl: '', linkedinUrl: '', instagramUrl: '', websiteUrl: '', clientId: '' }
const inputClass = 'rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm text-slate-100 outline-none focus:border-cyan-500'

function formFromContact(contact: Contact): ContactForm {
  return { name: contact.name, phone: contact.phone ?? '', email: contact.email ?? '', title: contact.title ?? '', photoUrl: contact.photoUrl ?? '', linkedinUrl: contact.linkedinUrl ?? '', instagramUrl: contact.instagramUrl ?? '', websiteUrl: contact.websiteUrl ?? '', clientId: contact.clientId ?? '' }
}

export default function ContactsClient({ initial, companies }: { initial: Contact[]; companies: Company[] }) {
  const [items, setItems] = useState(initial)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('TODOS')
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Contact | null>(null)
  const [form, setForm] = useState<ContactForm>(emptyForm)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const filtered = useMemo(() => items.filter(item => {
    const q = query.toLowerCase()
    const matches = !q || [item.name, item.email, item.phone, item.title].some(value => String(value ?? '').toLowerCase().includes(q))
    const kind = filter === 'VINCULADOS' ? Boolean(item.clientId) : filter === 'SEM_VINCULO' ? !item.clientId : true
    return matches && kind
  }), [items, query, filter])
  const linked = items.filter(item => item.clientId).length
  const set = (key: keyof ContactForm, value: string) => setForm(current => ({ ...current, [key]: value }))

  function openCreate() { setEditing(null); setForm(emptyForm); setError(''); setOpen(true) }
  function openEdit(contact: Contact) { setEditing(contact); setForm(formFromContact(contact)); setError(''); setOpen(true) }
  function closeForm() { if (!saving) { setOpen(false); setEditing(null); setError('') } }

  async function save(event: React.FormEvent) {
    event.preventDefault()
    setSaving(true); setError('')
    try {
      const payload = Object.fromEntries(Object.entries(form).map(([key, value]) => [key, value || null]))
      const response = await fetch(editing ? `/api/contatos/${editing.id}` : '/api/contatos', { method: editing ? 'PATCH' : 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) { setError(data.error || 'Não foi possível salvar o contato.'); return }
      setItems(current => editing ? current.map(item => item.id === editing.id ? data.contact : item) : [...current, data.contact])
      setMessage(editing ? 'Contato atualizado com sucesso.' : 'Contato salvo com sucesso.')
      setOpen(false); setEditing(null); setForm(emptyForm)
    } catch {
      setError('Não foi possível salvar o contato. Verifique a conexão e tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  async function archive(id: string, name: string) {
    if (!window.confirm(`Arquivar ${name}? O contato deixará a lista ativa, sem apagar o histórico.`)) return
    setError(''); setMessage('')
    try {
      const response = await fetch(`/api/contatos/${id}`, { method: 'DELETE' })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) { setError(data.error || 'Não foi possível arquivar o contato.'); return }
      setItems(current => current.filter(item => item.id !== id))
      setMessage('Contato arquivado. O histórico foi preservado.')
    } catch {
      setError('Não foi possível arquivar o contato. Verifique a conexão e tente novamente.')
    }
  }

  return <div className="space-y-5">
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4"><Metric label="Contatos" value={items.length} icon={<Users />} tone="cyan" /><Metric label="Vinculados a clientes" value={linked} icon={<Building2 />} tone="emerald" /><Metric label="Sem vínculo" value={items.length - linked} icon={<UserRound />} tone="amber" /><Metric label="Com telefone" value={items.filter(item => item.phone).length} icon={<Phone />} tone="blue" /></div>
    <div className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 md:flex-row md:items-center md:justify-between"><div className="flex flex-1 flex-col gap-3 sm:flex-row"><label className="relative flex-1"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar contato, telefone ou e-mail" className="w-full rounded-xl border border-slate-700 bg-slate-950 py-2.5 pl-9 pr-3 text-sm text-slate-100 outline-none focus:border-cyan-500" /></label><select value={filter} onChange={event => setFilter(event.target.value)} className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200"><option value="TODOS">Todos os contatos</option><option value="VINCULADOS">Vinculados a clientes</option><option value="SEM_VINCULO">Sem vínculo</option></select></div><button onClick={openCreate} className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-cyan-500"><Plus className="h-4 w-4" />Novo Contato</button></div>
    {open && <form onSubmit={save} className="grid gap-3 rounded-2xl border border-cyan-500/30 bg-slate-900 p-5 md:grid-cols-3"><h2 className="md:col-span-3 text-sm font-black text-slate-100">{editing ? 'Editar contato' : 'Cadastrar contato'}</h2><input required value={form.name} onChange={event => set('name', event.target.value)} placeholder="Nome da pessoa ou empresa" className={inputClass} /><input value={form.phone} onChange={event => set('phone', event.target.value)} placeholder="Telefone / WhatsApp" className={inputClass} /><input type="email" value={form.email} onChange={event => set('email', event.target.value)} placeholder="E-mail" className={inputClass} /><input value={form.title} onChange={event => set('title', event.target.value)} placeholder="Cargo / função" className={inputClass} /><select value={form.clientId} onChange={event => set('clientId', event.target.value)} className={inputClass}><option value="">Sem cliente vinculado</option>{companies.map(company => <option key={company.id} value={company.id}>{company.name}</option>)}</select><input type="url" value={form.websiteUrl} onChange={event => set('websiteUrl', event.target.value)} placeholder="Website (opcional)" className={inputClass} />{error && <p className="md:col-span-3 rounded-xl border border-red-500/30 bg-red-950/30 px-3 py-2 text-sm text-red-200">{error}</p>}<div className="md:col-span-3 flex gap-2"><button disabled={saving} className="rounded-xl bg-cyan-600 px-4 py-2 text-sm font-bold disabled:opacity-60">{saving ? 'Salvando…' : editing ? 'Salvar alterações' : 'Salvar contato'}</button><button type="button" disabled={saving} onClick={closeForm} className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-bold text-slate-300">Cancelar</button></div></form>}
    {message && <p className="rounded-xl border border-emerald-500/30 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-300">{message}</p>}{error && !open && <p className="rounded-xl border border-red-500/30 bg-red-950/30 px-4 py-3 text-sm text-red-200">{error}</p>}
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{filtered.map(item => <article key={item.id} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 transition hover:-translate-y-0.5 hover:border-cyan-500/40"><div className="flex items-start justify-between gap-3"><div className="flex items-center gap-3">{item.photoUrl ? <img src={item.photoUrl} alt="" className="h-11 w-11 rounded-full object-cover" /> : <div className="flex h-11 w-11 items-center justify-center rounded-full bg-cyan-500/15 text-lg font-black text-cyan-300">{item.name.slice(0, 1).toUpperCase()}</div>}<div><h3 className="font-bold text-slate-100">{item.name}</h3><p className="text-xs text-slate-500">{item.title || 'Contato operacional'}</p></div></div><span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase ${item.clientId ? 'bg-emerald-500/10 text-emerald-300' : 'bg-amber-500/10 text-amber-300'}`}>{item.clientId ? 'Cliente' : 'Contato'}</span></div><div className="mt-5 space-y-2 text-xs text-slate-400">{item.phone && <p className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-cyan-400" />{item.phone}</p>}{item.email && <p className="flex items-center gap-2 truncate"><Mail className="h-3.5 w-3.5 text-cyan-400" />{item.email}</p>}{item.clientId && <div className="mt-3"><Link href={`/portal/crm/${item.clientId}`} className="inline-flex items-center gap-2 rounded-lg text-xs font-bold text-emerald-300 hover:text-emerald-200"><Building2 className="h-3.5 w-3.5" />Abrir CRM</Link></div>}</div><div className="mt-5 flex gap-2 border-t border-slate-800 pt-4"><button onClick={() => openEdit(item)} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-cyan-800/70 px-3 py-2 text-xs font-bold text-cyan-300 hover:bg-cyan-950/40"><Pencil className="h-3.5 w-3.5" />Editar contato</button><button onClick={() => archive(item.id, item.name)} className="inline-flex items-center justify-center gap-2 rounded-xl border border-amber-900/70 px-3 py-2 text-xs font-bold text-amber-300 hover:bg-amber-950/30"><Archive className="h-3.5 w-3.5" />Arquivar contato</button></div></article>)}</div>
    {!filtered.length && <div className="rounded-2xl border border-dashed border-slate-700 p-10 text-center text-sm text-slate-500">Nenhum contato encontrado.</div>}
  </div>
}

function Metric({ label, value, icon, tone }: { label: string; value: number; icon: React.ReactNode; tone: string }) { const tones: Record<string, string> = { cyan: 'bg-cyan-500/10 text-cyan-400', emerald: 'bg-emerald-500/10 text-emerald-400', amber: 'bg-amber-500/10 text-amber-400', blue: 'bg-blue-500/10 text-blue-400' }; return <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4"><div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-xl ${tones[tone] || tones.cyan}`}>{icon}</div><p className="text-xs text-slate-500">{label}</p><p className="mt-1 text-2xl font-black text-slate-100">{value}</p></div> }
