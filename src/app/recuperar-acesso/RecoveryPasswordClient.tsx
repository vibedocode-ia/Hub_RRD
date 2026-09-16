'use client'

import { FormEvent, useState } from 'react'
import Link from 'next/link'

export default function RecoveryPasswordClient({ token }: { token: string }) {
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setMessage('')
    if (password !== confirmation) return setMessage('As senhas não conferem.')
    if (password.length < 12) return setMessage('Use pelo menos 12 caracteres.')
    setSaving(true)
    const response = await fetch('/api/auth/recover-password', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token, password }) })
    const data = await response.json().catch(() => ({}))
    setSaving(false)
    setMessage(data.message || data.error || 'Não foi possível concluir a recuperação.')
  }

  return <main className="min-h-screen bg-slate-950 px-4 py-16 text-slate-100"><section className="mx-auto max-w-md rounded-3xl border border-slate-700 bg-slate-900 p-7 shadow-2xl"><p className="text-xs font-bold tracking-widest text-cyan-400">HUB RR DESENTUPIDORA</p><h1 className="mt-2 text-2xl font-black">Cadastrar nova senha</h1><p className="mt-2 text-sm text-slate-400">Este link é pessoal, expira em breve e só pode ser usado uma vez.</p><form onSubmit={submit} className="mt-6 space-y-4"><label className="block text-sm font-medium">Nova senha<input aria-label="Nova senha" type="password" autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 p-3" required /></label><label className="block text-sm font-medium">Confirmar nova senha<input aria-label="Confirmar nova senha" type="password" autoComplete="new-password" value={confirmation} onChange={e => setConfirmation(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 p-3" required /></label>{message && <p className="text-sm text-cyan-300" role="status">{message}</p>}<button disabled={saving} className="w-full rounded-xl bg-cyan-500 px-4 py-3 font-bold text-slate-950 disabled:opacity-50">{saving ? 'Salvando…' : 'Cadastrar senha e entrar'}</button></form><Link href="/portal" className="mt-5 block text-center text-sm text-slate-400 underline">Voltar ao acesso do Hub</Link></section></main>
}
