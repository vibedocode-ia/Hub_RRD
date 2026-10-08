'use client'

import { FormEvent, useEffect, useState } from 'react'
import { CheckCircle2, Copy, KeyRound, Pencil, Plus, ShieldCheck, UserRoundCog, UserX, X } from 'lucide-react'
import { DEFAULT_PERMISSIONS_BY_ROLE, canChangePasswordFor, isRoleManageableBy, LOCAL_USER_ROLES, RRD_PERMISSIONS, type LocalUserRole, type RrdPermission } from '@/lib/permissions'

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

type RecoveryLink = { url: string, personName: string }

const labels: Record<RrdPermission, string> = {
  'people.manage': 'Pessoas e acessos', 'crm.read': 'Ver CRM', 'crm.write': 'Editar CRM',
  'operations.read': 'Ver operação', 'operations.write': 'Editar operação',
  'inventory.read': 'Ver estoque', 'inventory.write': 'Editar estoque',
  'financial.read': 'Ver financeiro', 'financial.write': 'Editar financeiro',
  'documents.read': 'Ver documentos', 'documents.prepare': 'Preparar documentos',
  'documents.approve': 'Aprovar documentos', 'documents.issue': 'Emitir documentos',
  'documents.send': 'Enviar documentos', 'sofia.drafts.review': 'Revisar rascunhos Sofia', 'sofia.use': 'Usar Sofia no Hub RRD',
  'settings.manage': 'Configurações operacionais',
}

function formFor(person?: Person): FormState {
  return person ? { name: person.name, phone: person.phone, email: person.email ?? '', password: '', role: person.role, permissions: person.permissions, isActive: person.isActive } : {
    name: '', phone: '', email: '', password: '', role: 'OPERATOR', permissions: [...DEFAULT_PERMISSIONS_BY_ROLE.OPERATOR], isActive: true,
  }
}

type ValidationDetails = { fieldErrors?: Record<string, string[]>, formErrors?: string[] }
const fieldLabels: Record<string, string> = { name: 'Nome', phone: 'Telefone', email: 'E-mail', password: 'Senha temporária', role: 'Papel local', permissions: 'Permissões' }
function formatPeopleValidationError(error: unknown, details: unknown): string {
  const parsed = details && typeof details === 'object' ? details as ValidationDetails : null
  const fieldErrors = Object.entries(parsed?.fieldErrors ?? {}).flatMap(([field, messages]) => messages.map((message) => `${fieldLabels[field] ?? field}: ${message}`))
  const formErrors = parsed?.formErrors ?? []
  return fieldErrors.length || formErrors.length ? [...fieldErrors, ...formErrors].join(' ') : typeof error === 'string' && error ? error : 'Não foi possível salvar a pessoa.'
}

export default function PeopleAccessClient({ currentUserId, currentUserRole }: { currentUserId: string, currentUserRole: LocalUserRole }) {
  const [people, setPeople] = useState<Person[]>([])
  const [pageError, setPageError] = useState('')
  const [formError, setFormError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Person | null | undefined>(undefined)
  const [form, setForm] = useState<FormState>(formFor())
  const [saving, setSaving] = useState(false)
  const [recoveryLink, setRecoveryLink] = useState<RecoveryLink | null>(null)
  const [recoveryError, setRecoveryError] = useState('')
  const [recoveryBusy, setRecoveryBusy] = useState('')
  const [recoveryCopied, setRecoveryCopied] = useState(false)

  // The one-time recovery link must never outlive the person it was minted for.
  useEffect(() => {
    setRecoveryLink(null); setRecoveryError(''); setRecoveryCopied(false)
  }, [editing])

  useEffect(() => () => {
    setRecoveryLink(null); setRecoveryError(''); setRecoveryCopied(false)
  }, [])

  function closeRecovery() {
    setRecoveryLink(null); setRecoveryError(''); setRecoveryCopied(false)
  }

  async function copyRecoveryLink() {
    if (!recoveryLink) return
    try {
      await navigator.clipboard.writeText(recoveryLink.url)
      setRecoveryCopied(true)
    } catch {
      setRecoveryError('Não foi possível copiar automaticamente. Selecione o link e copie manualmente.')
    }
  }

  async function requestRecoveryLink(person: Person) {
    // Mirrors the server authority check so a peer/superior never even sees the action.
    if (!canChangePasswordFor(currentUserRole, person.role, person.id === currentUserId)) return
    setRecoveryLink(null); setRecoveryError(''); setRecoveryCopied(false)
    setRecoveryBusy(person.id)
    try {
      const response = await fetch(`/api/settings/people/${person.id}/password-recovery`, { method: 'POST' })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) { setRecoveryError(result.error || 'Não foi possível gerar o link de recuperação.'); return }
      setRecoveryLink({ url: result.url, personName: person.name })
    } catch {
      setRecoveryError('Não foi possível gerar o link de recuperação.')
    } finally {
      setRecoveryBusy('')
    }
  }

  async function load() {
    setLoading(true)
    const response = await fetch('/api/settings/people')
    const payload = await response.json().catch(() => ({}))
    if (!response.ok) setPageError(payload.error || 'Não foi possível carregar as pessoas.')
    else { setPeople(payload.people || []); setPageError('') }
    setLoading(false)
  }
  useEffect(() => { void load() }, [])

  function open(person?: Person) { setFormError(''); setMessage(''); setEditing(person ?? null); setForm(formFor(person)) }
  function changeRole(role: LocalUserRole) { setForm((current) => ({ ...current, role, permissions: [...DEFAULT_PERMISSIONS_BY_ROLE[role]] })) }
  function toggle(permission: RrdPermission) { setForm((current) => ({ ...current, permissions: current.permissions.includes(permission) ? current.permissions.filter((item) => item !== permission) : [...current.permissions, permission] })) }
  const selectedRoleManageable = isRoleManageableBy(currentUserRole, form.role)

  async function submit(event: FormEvent) {
    event.preventDefault()
    const isNew = editing === null
    const isSelf = !isNew && editing?.id === currentUserId
    if (!isSelf && !selectedRoleManageable) { setFormError('Escolha um papel igual ou inferior ao seu antes de salvar.'); return }
    setSaving(true); setFormError(''); setMessage('')
    const payload = {
      name: form.name, ...(isNew ? { phone: form.phone, password: form.password } : {}),
      ...(form.email ? { email: form.email } : (!isNew ? { email: null } : {})),
      ...(!isSelf ? { role: form.role, permissions: form.permissions, isActive: form.isActive } : {}),
      ...(!isNew && form.password ? { password: form.password } : {}),
    }
    const response = await fetch(isNew ? '/api/settings/people' : `/api/settings/people/${editing?.id}`, { method: isNew ? 'POST' : 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) })
    const result = await response.json().catch(() => ({}))
    setSaving(false)
    if (!response.ok) { setFormError(formatPeopleValidationError(result.error, result.details)); return }
    setMessage(isNew ? 'Pessoa criada com acesso local ao Hub RRD.' : 'Acessos atualizados e sessões revogadas quando aplicável.')
    setEditing(undefined); await load()
  }

  return <section className="space-y-5">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div><h2 className="flex items-center gap-2 text-lg font-black text-slate-100"><UserRoundCog className="h-5 w-5 text-cyan-400" /> Pessoas e Acessos RRD</h2><p className="mt-1 text-xs text-slate-400">Controle somente o portal e as operações locais da RR. Este cadastro é opcional para a Sofia: os acessos por WhatsApp são concedidos e revogados pela Central Sofia.</p></div>
      <button onClick={() => open()} className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-cyan-500"><Plus className="h-4 w-4" /> Nova pessoa</button>
    </div>
    {message && <p className="rounded-xl border border-emerald-800 bg-emerald-950/30 p-3 text-xs text-emerald-300">{message}</p>}
    {pageError && <p className="rounded-xl border border-red-800 bg-red-950/30 p-3 text-xs text-red-300">{pageError}</p>}
    {loading ? <p className="text-sm text-slate-400">Carregando pessoas...</p> : <div className="grid gap-3">{people.map((person) => <article key={person.id} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex items-center gap-2"><h3 className="font-bold text-slate-100">{person.name}</h3><span className={person.isActive ? 'rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400' : 'rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-bold text-red-400'}>{person.isActive ? 'ATIVO' : 'DESATIVADO'}</span></div><p className="mt-1 text-xs text-slate-400">{person.phone} · {person.role}</p><p className="mt-2 text-[11px] text-slate-500">{person.permissions.map((permission) => labels[permission]).join(' · ') || 'Sem permissões'}</p></div><div className="flex flex-wrap items-center gap-2"><button onClick={() => open(person)} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-bold text-cyan-300 hover:bg-slate-700"><Pencil className="h-3.5 w-3.5" /> Editar</button>{canChangePasswordFor(currentUserRole, person.role, person.id === currentUserId) && <button type="button" disabled={recoveryBusy === person.id} onClick={() => void requestRecoveryLink(person)} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-bold text-amber-300 hover:bg-slate-700 disabled:opacity-50"><KeyRound className="h-3.5 w-3.5" /> {recoveryBusy === person.id ? 'Gerando link...' : 'Link de recuperação'}</button>}</div></div></article>)}</div>}
    {recoveryError && <div className="flex items-center justify-between gap-3 rounded-xl border border-red-800 bg-red-950/30 p-3 text-xs text-red-300"><span>{recoveryError}</span><button type="button" onClick={closeRecovery} className="font-bold text-red-200 hover:text-white">Fechar e limpar</button></div>}{recoveryLink && <div className="fixed inset-0 z-[110] flex items-end bg-slate-950/80 p-3 sm:items-center sm:justify-center" role="dialog" aria-modal="true"><div className="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-2xl"><div className="mb-4 flex items-start justify-between gap-3"><div><h3 className="flex items-center gap-2 font-black text-slate-100"><KeyRound className="h-4 w-4 text-amber-300" /> Link de recuperação</h3><p className="mt-1 text-xs text-slate-400">Uso único, válido por 15 minutos, para {recoveryLink.personName}. Ele só aparece uma vez e desaparece ao fechar.</p></div><button type="button" onClick={closeRecovery} aria-label="Fechar link de recuperação" className="text-slate-400 hover:text-white"><X /></button></div><input readOnly value={recoveryLink.url} onFocus={(event) => event.target.select()} aria-label="Link de recuperação" className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100" /><div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end"><button type="button" onClick={() => void copyRecoveryLink()} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-bold text-cyan-300 hover:bg-slate-700"><Copy className="h-4 w-4" /> {recoveryCopied ? 'Link copiado' : 'Copiar link'}</button><button type="button" onClick={closeRecovery} className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-700 px-4 py-2 text-xs font-bold text-white hover:bg-slate-600">Fechar e limpar</button></div></div></div>}{editing !== undefined && <div className="fixed inset-0 z-[100] flex items-end bg-slate-950/80 p-3 sm:items-center sm:justify-center"><form onSubmit={submit} className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-2xl"><div className="mb-5 flex items-center justify-between"><div><h3 className="font-black text-slate-100">{editing === null ? 'Nova pessoa local' : 'Editar pessoa local'}</h3><p className="text-xs text-slate-400">Nunca cria acesso na Central Sofia.</p></div><button type="button" onClick={() => setEditing(undefined)} className="text-slate-400 hover:text-white"><X /></button></div>{formError && <p className="mb-4 rounded-xl bg-red-950/40 p-3 text-xs text-red-300">{formError}</p>}<div className="grid gap-3 sm:grid-cols-2"><Field label="Nome"><input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></Field><Field label="Telefone (DDI+DDD)"><input required disabled={editing !== null} value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value.replace(/\D/g, '') })} /></Field><Field label="E-mail (opcional)"><input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></Field><Field label={editing === null ? 'Senha temporária' : 'Nova senha (opcional)'}><input type="password" required={editing === null} minLength={12} value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} /></Field><Field label="Papel local"><select value={form.role} onChange={(event) => changeRole(event.target.value as LocalUserRole)}>{LOCAL_USER_ROLES.map((role) => <option key={role} disabled={!isRoleManageableBy(currentUserRole, role)}>{role}</option>)}</select>{!selectedRoleManageable && <p className="text-[11px] font-medium text-amber-300">Escolha um papel igual ou inferior ao seu antes de salvar.</p>}</Field><label className="flex items-center gap-2 pt-6 text-xs font-bold text-slate-300"><input type="checkbox" checked={form.isActive} onChange={(event) => setForm({ ...form, isActive: event.target.checked })} /> Conta ativa</label></div><div className="mt-5"><p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">Áreas permitidas</p><div className="grid gap-2 sm:grid-cols-2">{RRD_PERMISSIONS.map((permission) => <label key={permission} className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-950/40 p-2 text-xs text-slate-300"><input type="checkbox" checked={form.permissions.includes(permission)} onChange={() => toggle(permission)} /> {labels[permission]}</label>)}</div></div><div className="mt-6 flex justify-end gap-3"><button type="button" onClick={() => setEditing(undefined)} className="rounded-xl px-4 py-2 text-xs font-bold text-slate-400">Cancelar</button><button disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-50"><CheckCircle2 className="h-4 w-4" /> {saving ? 'Salvando...' : 'Salvar acessos'}</button></div></form></div>}
  </section>
}

function Field({ label, children }: { label: string, children: React.ReactNode }) { return <label className="grid gap-1 text-xs font-bold text-slate-300"><span>{label}</span><span className="[&>input]:w-full [&>input]:rounded-xl [&>input]:border [&>input]:border-slate-700 [&>input]:bg-slate-950 [&>input]:px-3 [&>input]:py-2 [&>input]:text-slate-100 [&>select]:w-full [&>select]:rounded-xl [&>select]:border [&>select]:border-slate-700 [&>select]:bg-slate-950 [&>select]:px-3 [&>select]:py-2 [&>select]:text-slate-100">{children}</span></label> }
