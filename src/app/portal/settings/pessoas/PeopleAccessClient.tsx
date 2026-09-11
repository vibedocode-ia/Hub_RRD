'use client'

import { FormEvent, useEffect, useState } from 'react'
import { CheckCircle2, Pencil, Plus, ShieldCheck, UserRoundCog, UserX, X } from 'lucide-react'
import { DEFAULT_PERMISSIONS_BY_ROLE, LOCAL_USER_ROLES, RRD_PERMISSIONS, type LocalUserRole, type RrdPermission } from '@/lib/permissions'

type Person = {
  id: string
  name: string
  phone: string
  email: string | null
  role: LocalUserRole
  isActive: boolean
  lastLoginAt: string | null
  permissions: RrdPermission[]
}

type FormState = {
  name: string
  phone: string
  email: string
  password: string
  role: LocalUserRole
  permissions: RrdPermission[]
  isActive: boolean
}

const labels: Record<RrdPermission, string> = {
  'people.manage': 'Pessoas e acessos', 'crm.read': 'Ver CRM', 'crm.write': 'Editar CRM',
  'operations.read': 'Ver operação', 'operations.write': 'Editar operação',
  'inventory.read': 'Ver estoque', 'inventory.write': 'Editar estoque',
  'financial.read': 'Ver financeiro', 'financial.write': 'Editar financeiro',
  'documents.read': 'Ver documentos', 'documents.prepare': 'Preparar documentos',
  'documents.approve': 'Aprovar documentos', 'documents.issue': 'Emitir documentos',
  'documents.send': 'Enviar documentos', 'sofia.drafts.review': 'Revisar rascunhos Sofia',
  'settings.manage': 'Configurações operacionais',
}

function formFor(person?: Person): FormState {
  return person ? { name: person.name, phone: person.phone, email: person.email ?? '', password: '', role: person.role, permissions: person.permissions, isActive: person.isActive } : {
    name: '', phone: '', email: '', password: '', role: 'OPERATOR', permissions: [...DEFAULT_PERMISSIONS_BY_ROLE.OPERATOR], isActive: true,
  }
}

export default function PeopleAccessClient({ currentUserId }: { currentUserId: string }) {
  const [people, setPeople] = useState<Person[]>([])
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Person | null | undefined>(undefined)
  const [form, setForm] = useState<FormState>(formFor())
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    const response = await fetch('/api/settings/people')
    const payload = await response.json().catch(() => ({}))
    if (!response.ok) setError(payload.error || 'Não foi possível carregar as pessoas.')
    else setPeople(payload.people || [])
    setLoading(false)
  }
  useEffect(() => { void load() }, [])

  function open(person?: Person) { setError(''); setMessage(''); setEditing(person ?? null); setForm(formFor(person)) }
  function changeRole(role: LocalUserRole) { setForm((current) => ({ ...current, role, permissions: [...DEFAULT_PERMISSIONS_BY_ROLE[role]] })) }
  function toggle(permission: RrdPermission) { setForm((current) => ({ ...current, permissions: current.permissions.includes(permission) ? current.permissions.filter((item) => item !== permission) : [...current.permissions, permission] })) }

  async function submit(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError(''); setMessage('')
    const isNew = editing === null
    const isSelf = !isNew && editing?.id === currentUserId
    const payload = {
      name: form.name, ...(isNew ? { phone: form.phone, password: form.password } : {}),
      ...(form.email ? { email: form.email } : (!isNew ? { email: null } : {})),
      ...(!isSelf ? { role: form.role, permissions: form.permissions, isActive: form.isActive } : {}),
      ...(!isNew && form.password ? { password: form.password } : {}),
    }
    const response = await fetch(isNew ? '/api/settings/people' : `/api/settings/people/${editing?.id}`, { method: isNew ? 'POST' : 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) })
    const result = await response.json().catch(() => ({}))
    setSaving(false)
    if (!response.ok) { setError(result.error || 'Não foi possível salvar a pessoa.'); return }
    setMessage(isNew ? 'Pessoa criada com acesso local ao Hub RRD.' : 'Acessos atualizados e sessões revogadas quando aplicável.')
    setEditing(undefined); await load()
  }

  return <section className="space-y-5">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div><h2 className="flex items-center gap-2 text-lg font-black text-slate-100"><UserRoundCog className="h-5 w-5 text-cyan-400" /> Pessoas e Acessos RRD</h2><p className="mt-1 text-xs text-slate-400">Controle somente o portal e as operações da RR. Números e grants WhatsApp continuam na Central Sofia.</p></div>
      <button onClick={() => open()} className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-cyan-500"><Plus className="h-4 w-4" /> Nova pessoa</button>
    </div>
    {message && <p className="rounded-xl border border-emerald-800 bg-emerald-950/30 p-3 text-xs text-emerald-300">{message}</p>}
    {error && <p className="rounded-xl border border-red-800 bg-red-950/30 p-3 text-xs text-red-300">{error}</p>}
    {loading ? <p className="text-sm text-slate-400">Carregando pessoas...</p> : <div className="grid gap-3">{people.map((person) => <article key={person.id} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex items-center gap-2"><h3 className="font-bold text-slate-100">{person.name}</h3><span className={person.isActive ? 'rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400' : 'rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-bold text-red-400'}>{person.isActive ? 'ATIVO' : 'DESATIVADO'}</span></div><p className="mt-1 text-xs text-slate-400">{person.phone} · {person.role}</p><p className="mt-2 text-[11px] text-slate-500">{person.permissions.map((permission) => labels[permission]).join(' · ') || 'Sem permissões'}</p></div><button onClick={() => open(person)} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-bold text-cyan-300 hover:bg-slate-700"><Pencil className="h-3.5 w-3.5" /> Editar</button></div></article>)}</div>}
    {editing !== undefined && <div className="fixed inset-0 z-[100] flex items-end bg-slate-950/80 p-3 sm:items-center sm:justify-center"><form onSubmit={submit} className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-2xl"><div className="mb-5 flex items-center justify-between"><div><h3 className="font-black text-slate-100">{editing === null ? 'Nova pessoa local' : 'Editar pessoa local'}</h3><p className="text-xs text-slate-400">Nunca cria acesso na Central Sofia.</p></div><button type="button" onClick={() => setEditing(undefined)} className="text-slate-400 hover:text-white"><X /></button></div>{error && <p className="mb-4 rounded-xl bg-red-950/40 p-3 text-xs text-red-300">{error}</p>}<div className="grid gap-3 sm:grid-cols-2"><Field label="Nome"><input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></Field><Field label="Telefone (DDI+DDD)"><input required disabled={editing !== null} value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value.replace(/\D/g, '') })} /></Field><Field label="E-mail (opcional)"><input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></Field><Field label={editing === null ? 'Senha temporária' : 'Nova senha (opcional)'}><input type="password" required={editing === null} minLength={12} value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} /></Field><Field label="Papel local"><select value={form.role} onChange={(event) => changeRole(event.target.value as LocalUserRole)}>{LOCAL_USER_ROLES.map((role) => <option key={role}>{role}</option>)}</select></Field><label className="flex items-center gap-2 pt-6 text-xs font-bold text-slate-300"><input type="checkbox" checked={form.isActive} onChange={(event) => setForm({ ...form, isActive: event.target.checked })} /> Conta ativa</label></div><div className="mt-5"><p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">Áreas permitidas</p><div className="grid gap-2 sm:grid-cols-2">{RRD_PERMISSIONS.map((permission) => <label key={permission} className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-950/40 p-2 text-xs text-slate-300"><input type="checkbox" checked={form.permissions.includes(permission)} onChange={() => toggle(permission)} /> {labels[permission]}</label>)}</div></div><div className="mt-6 flex justify-end gap-3"><button type="button" onClick={() => setEditing(undefined)} className="rounded-xl px-4 py-2 text-xs font-bold text-slate-400">Cancelar</button><button disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-50"><CheckCircle2 className="h-4 w-4" /> {saving ? 'Salvando...' : 'Salvar acessos'}</button></div></form></div>}
  </section>
}

function Field({ label, children }: { label: string, children: React.ReactNode }) { return <label className="grid gap-1 text-xs font-bold text-slate-300"><span>{label}</span><span className="[&>input]:w-full [&>input]:rounded-xl [&>input]:border [&>input]:border-slate-700 [&>input]:bg-slate-950 [&>input]:px-3 [&>input]:py-2 [&>input]:text-slate-100 [&>select]:w-full [&>select]:rounded-xl [&>select]:border [&>select]:border-slate-700 [&>select]:bg-slate-950 [&>select]:px-3 [&>select]:py-2 [&>select]:text-slate-100">{children}</span></label> }
