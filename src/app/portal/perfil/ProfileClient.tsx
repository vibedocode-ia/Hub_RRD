'use client'

import { FormEvent, useRef, useState } from 'react'
import { Camera, CheckCircle2, Globe, Link2, Loader2, MapPin, Phone, Save, UserCircle2, X } from 'lucide-react'

type Profile = { id: string; name: string; phone: string; email: string | null; role: string; jobTitle: string | null; photoUrl: string | null; company: string | null; city: string | null; state: string | null; instagramUrl: string | null; websiteUrl: string | null; personalNotes: string | null }

export default function ProfileClient({ profile: initial }: { profile: Profile }) {
  const [profile, setProfile] = useState(initial)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const [passwords, setPasswords] = useState({ currentPassword: '', password: '', confirmation: '' })
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordMessage, setPasswordMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const update = (key: keyof Profile, value: string | null) => setProfile((current) => ({ ...current, [key]: value }))
  const initials = profile.name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'RR'

  function choosePhoto(file?: File) {
    if (!file) return
    if (!file.type.startsWith('image/')) { setMessage({ ok: false, text: 'Escolha um arquivo de imagem.' }); return }
    if (file.size > 2 * 1024 * 1024) { setMessage({ ok: false, text: 'A imagem deve ter no máximo 2 MB.' }); return }
    const reader = new FileReader()
    reader.onload = () => update('photoUrl', String(reader.result))
    reader.onerror = () => setMessage({ ok: false, text: 'Não foi possível carregar a imagem.' })
    reader.readAsDataURL(file)
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setMessage(null)
    const payload = { name: profile.name, phone: profile.phone, email: profile.email || null, jobTitle: profile.jobTitle || null, photoUrl: profile.photoUrl || null, company: profile.company || null, city: profile.city || null, state: profile.state || null, instagramUrl: profile.instagramUrl || null, websiteUrl: profile.websiteUrl || null, personalNotes: profile.personalNotes || null }
    const response = await fetch('/api/profile', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) })
    const data = await response.json().catch(() => ({})); setSaving(false)
    if (!response.ok) { setMessage({ ok: false, text: data.error || 'Não foi possível salvar o perfil.' }); return }
    setProfile(data.profile); setMessage({ ok: true, text: 'Perfil salvo com sucesso.' })
  }

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPasswordMessage(null)
    if (passwords.password !== passwords.confirmation) { setPasswordMessage({ ok: false, text: 'A confirmação da nova senha não confere.' }); return }
    setPasswordSaving(true)
    const response = await fetch('/api/auth/change-password', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ currentPassword: passwords.currentPassword, password: passwords.password }) })
    const data = await response.json().catch(() => ({})); setPasswordSaving(false)
    if (!response.ok) { setPasswordMessage({ ok: false, text: data.error || 'Não foi possível alterar a senha.' }); return }
    setPasswords({ currentPassword: '', password: '', confirmation: '' })
    setPasswordMessage({ ok: true, text: data.message || 'Senha alterada. Entre novamente para continuar.' })
  }

  return <div className="mx-auto max-w-5xl space-y-6">
    <header><div className="flex items-center gap-2"><UserCircle2 className="h-6 w-6 text-cyan-400" /><h1 className="text-2xl font-black tracking-tight text-slate-100">Meu perfil</h1></div><p className="mt-1 text-sm text-slate-400">Essas informações aparecem no topo do Hub RR Operacional.</p></header>
    <form onSubmit={save} className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/70 shadow-2xl shadow-black/20">
      <section className="relative overflow-hidden border-b border-slate-800 bg-gradient-to-br from-cyan-950/80 via-slate-900 to-slate-950 p-6 sm:p-8"><div className="absolute -right-16 -top-24 h-64 w-64 rounded-full bg-cyan-400/10 blur-3xl" /><div className="relative flex flex-col gap-5 sm:flex-row sm:items-center"><div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-3xl border-2 border-cyan-400/60 bg-gradient-to-br from-cyan-400 to-emerald-400 text-3xl font-black text-slate-950 shadow-xl shadow-cyan-500/20">{profile.photoUrl ? <img src={profile.photoUrl} alt={`Foto de ${profile.name}`} className="h-full w-full object-cover" /> : initials}</div><div className="min-w-0"><div className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-300">Hub RR Operacional</div><h2 className="mt-1 truncate text-2xl font-black text-white">{profile.name}</h2><p className="truncate text-sm text-slate-300">{profile.email || 'E-mail não informado'}</p><div className="mt-3 inline-flex rounded-full border border-cyan-400/20 bg-slate-950/60 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-cyan-200">Perfil pessoal · {profile.jobTitle || profile.role.replaceAll('_', ' ')}</div></div></div></section>
      <section className="grid gap-6 p-6 sm:p-8"><div><h3 className="text-sm font-black text-slate-100">Identidade profissional</h3><p className="mt-1 text-xs text-slate-500">Informações usadas para identificar você dentro da operação.</p></div><div className="grid gap-5 md:grid-cols-2"><Field label="Nome completo" required value={profile.name} onChange={(v) => update('name', v)} /><Field label="E-mail" type="email" value={profile.email || ''} onChange={(v) => update('email', v)} /><Field label="Cargo" placeholder="Ex.: Superadministrador" value={profile.jobTitle || ''} onChange={(v) => update('jobTitle', v)} /><Field label="Empresa" placeholder="Ex.: RR Desentupidora" value={profile.company || ''} onChange={(v) => update('company', v)} /></div></section>
      <section className="border-t border-slate-800 p-6 sm:p-8"><div><h3 className="text-sm font-black text-slate-100">Contato e localização</h3><p className="mt-1 text-xs text-slate-500">O WhatsApp deve conter DDI e DDD, somente com números.</p></div><div className="mt-5 grid gap-5 md:grid-cols-3"><Field label="WhatsApp" icon={<Phone className="h-4 w-4" />} value={profile.phone} onChange={(v) => update('phone', v.replace(/\D/g, ''))} /><Field label="Cidade" icon={<MapPin className="h-4 w-4" />} placeholder="Ex.: Niterói" value={profile.city || ''} onChange={(v) => update('city', v)} /><Field label="Estado" placeholder="RJ" maxLength={2} value={profile.state || ''} onChange={(v) => update('state', v.toUpperCase())} /></div></section>
      <section className="border-t border-slate-800 p-6 sm:p-8"><div><h3 className="text-sm font-black text-slate-100">Foto de perfil</h3><p className="mt-1 text-xs text-slate-500">Escolha uma imagem do seu dispositivo. JPG, PNG ou WebP de até 2 MB.</p></div><div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center"><div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-cyan-400/40 bg-gradient-to-br from-cyan-400 to-emerald-400 text-2xl font-black text-slate-950">{profile.photoUrl ? <img src={profile.photoUrl} alt="Prévia da foto de perfil" className="h-full w-full object-cover" /> : initials}</div><input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(event) => choosePhoto(event.target.files?.[0])} /><div className="flex flex-wrap gap-2"><button type="button" onClick={() => fileInputRef.current?.click()} className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-2.5 text-sm font-black text-slate-950 transition hover:bg-cyan-400"><Camera className="h-4 w-4" />Escolher imagem</button>{profile.photoUrl && <button type="button" onClick={() => update('photoUrl', null)} className="rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-bold text-slate-300 transition hover:bg-slate-800">Remover</button>}</div></div></section><section className="border-t border-slate-800 p-6 sm:p-8"><div><h3 className="text-sm font-black text-slate-100">Presença pública</h3><p className="mt-1 text-xs text-slate-500">Links opcionais para sua presença profissional.</p></div><div className="mt-5 grid gap-5 md:grid-cols-2"><Field label="Instagram" icon={<Link2 className="h-4 w-4" />} type="url" placeholder="https://instagram.com/..." value={profile.instagramUrl || ''} onChange={(v) => update('instagramUrl', v)} /><Field label="Website" icon={<Globe className="h-4 w-4" />} type="url" placeholder="https://..." value={profile.websiteUrl || ''} onChange={(v) => update('websiteUrl', v)} /></div></section>
      <section className="border-t border-slate-800 p-6 sm:p-8"><Field label="Observações pessoais" placeholder="Informações opcionais sobre você..." value={profile.personalNotes || ''} onChange={(v) => update('personalNotes', v)} textarea /></section>
      <footer className="flex flex-col-reverse gap-3 border-t border-slate-800 bg-slate-950/40 p-5 sm:flex-row sm:items-center sm:justify-between sm:px-8"><div className="min-h-6 text-xs">{message && <span className={`inline-flex items-center gap-1.5 ${message.ok ? 'text-emerald-300' : 'text-red-300'}`}>{message.ok ? <CheckCircle2 className="h-4 w-4" /> : <X className="h-4 w-4" />}{message.text}</span>}</div><div className="flex justify-end gap-3"><a href="/portal/dashboard" className="rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-bold text-slate-300 transition hover:bg-slate-800">Cancelar</a><button type="submit" disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 px-5 py-2.5 text-sm font-black text-slate-950 shadow-lg shadow-cyan-500/10 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{saving ? 'Salvando...' : 'Salvar perfil'}</button></div></footer>
    </form>
    <form onSubmit={changePassword} className="rounded-3xl border border-amber-700/50 bg-amber-950/10 p-6 sm:p-8">
      <h2 className="text-lg font-black text-slate-100">Alterar senha</h2><p className="mt-1 text-xs text-slate-400">Para sua segurança, informe a senha atual. Ao confirmar, todas as suas sessões serão encerradas.</p>
      <div className="mt-5 grid gap-4 md:grid-cols-3"><Field label="Senha atual" type="password" required value={passwords.currentPassword} onChange={(currentPassword) => setPasswords({ ...passwords, currentPassword })} /><Field label="Nova senha" type="password" required value={passwords.password} onChange={(password) => setPasswords({ ...passwords, password })} /><Field label="Confirmar nova senha" type="password" required value={passwords.confirmation} onChange={(confirmation) => setPasswords({ ...passwords, confirmation })} /></div>
      <div className="mt-5 flex items-center justify-between gap-3"><p className={`text-xs ${passwordMessage?.ok ? 'text-emerald-300' : 'text-red-300'}`}>{passwordMessage?.text}</p><button disabled={passwordSaving} className="rounded-xl bg-amber-400 px-4 py-2.5 text-sm font-black text-slate-950 disabled:opacity-60">{passwordSaving ? 'Alterando...' : 'Alterar senha'}</button></div>
    </form>
  </div>
}

function Field({ label, value, onChange, type = 'text', placeholder, required, maxLength, textarea, icon }: { label: string; value: string; onChange: (value: string) => void; type?: string; placeholder?: string; required?: boolean; maxLength?: number; textarea?: boolean; icon?: React.ReactNode }) {
  const classes = 'mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3.5 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/10'
  return <label className="block"><span className="flex items-center gap-1.5 text-xs font-bold text-slate-300">{icon}{label}{required && <b className="text-cyan-400">*</b>}</span>{textarea ? <textarea required={required} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={4} className={classes} /> : <input required={required} type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} maxLength={maxLength} className={classes} />}</label>
}
