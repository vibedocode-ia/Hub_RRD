'use client'

import { useState } from 'react'
import { CheckCircle2, HardHat, Pencil, Plus, Settings2, Trash2, Truck, UserCheck, Users, X, Shield, Phone, FileText } from 'lucide-react'
import { ModalChecklistVeiculo } from './ModalChecklistVeiculo'

type Collaborator = {
  id: string
  name: string
  role: string
  phone?: string | null
  document?: string | null
  userId?: string | null
  isActive: boolean
  notes?: string | null
}

type Team = {
  id: string
  name: string
  leaderId?: string | null
  leaderName?: string | null
  phone?: string | null
  description?: string | null
  defaultVehicleId?: string | null
  memberIds?: string[]
  participants?: string[]
  isActive: boolean
}

type Vehicle = {
  id: string
  name: string
  plate?: string | null
  type?: string | null
  description?: string | null
  notes?: string | null
  teamId?: string | null
  isActive: boolean
}

const inputClass = 'w-full rounded-md border border-white/[0.08] bg-zinc-900/60 px-3 py-2 text-xs text-zinc-100 placeholder:text-zinc-500 focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/20'

const COMMON_ROLES = [
  'Técnico de Desentupimento',
  'Operador de Hidrojato',
  'Ajudante Geral',
  'Motorista Operacional',
  'Encanador Hidráulico',
  'Líder Operacional',
]

function Editor({
  kind,
  item,
  teams,
  vehicles,
  collaborators,
  onClose,
  onSaved,
}: {
  kind: 'collaborator' | 'team' | 'vehicle'
  item?: any
  teams: Team[]
  vehicles: Vehicle[]
  collaborators: Collaborator[]
  onClose: () => void
  onSaved: (x: any) => void
}) {
  const isCollab = kind === 'collaborator'
  const isTeam = kind === 'team'
  const x = item || {}

  const [form, setForm] = useState<any>({
    // Collaborator fields
    name: x.name || '',
    role: x.role || COMMON_ROLES[0],
    phone: x.phone || '',
    document: x.document || '',
    notes: x.notes || '',
    createLogin: false,
    password: '',
    // Team fields
    leaderId: x.leaderId || '',
    leaderName: x.leaderName || '',
    defaultVehicleId: x.defaultVehicleId || '',
    memberIds: Array.isArray(x.memberIds) ? x.memberIds : [],
    description: x.description || '',
    // Vehicle fields
    plate: x.plate || '',
    type: x.type || '',
    teamId: x.teamId || '',
  })

  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const set = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }))

  const toggleMember = (collabId: string) => {
    setForm((p: any) => {
      const current = Array.isArray(p.memberIds) ? p.memberIds : []
      if (current.includes(collabId)) {
        return { ...p, memberIds: current.filter((id: string) => id !== collabId) }
      } else {
        return { ...p, memberIds: [...current, collabId] }
      }
    })
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      let endpoint = '/api/operacional/colaboradores'
      let body: any = {}

      if (isCollab) {
        endpoint = '/api/operacional/colaboradores'
        body = {
          name: form.name,
          role: form.role,
          phone: form.phone,
          document: form.document,
          notes: form.notes,
          createLogin: form.createLogin,
          password: form.password,
        }
      } else if (isTeam) {
        endpoint = '/api/operacional/equipes'
        body = {
          name: form.name,
          leaderId: form.leaderId || null,
          defaultVehicleId: form.defaultVehicleId || null,
          memberIds: form.memberIds,
          description: form.description,
          phone: form.phone,
        }
      } else {
        endpoint = '/api/operacional/veiculos'
        body = {
          name: form.name,
          plate: form.plate,
          type: form.type,
          description: form.description,
          notes: form.notes,
          teamId: form.teamId || null,
        }
      }

      if (item?.id) {
        body.id = item.id
      }

      const res = await fetch(endpoint, {
        method: item ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Não foi possível salvar os dados.')
        setLoading(false)
        return
      }

      onSaved(isCollab ? data.collaborator : isTeam ? data.team : data.vehicle)
      onClose()
    } catch {
      setError('Erro de conexão ao salvar.')
      setLoading(false)
    }
  }

  const activeCollabs = collaborators.filter((c) => c.isActive)
  const activeVehicles = vehicles.filter((v) => v.isActive)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4">
      <form onSubmit={save} className="max-h-[90vh] w-full max-w-lg space-y-4 overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h2 className="text-lg font-black text-slate-100 flex items-center gap-2">
            {isCollab ? <HardHat className="w-5 h-5 text-cyan-400" /> : isTeam ? <Users className="w-5 h-5 text-cyan-400" /> : <Truck className="w-5 h-5 text-cyan-400" />}
            {item ? 'Editar' : 'Novo'} {isCollab ? 'colaborador' : isTeam ? 'equipe' : 'veículo'}
          </h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:text-slate-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && <p className="rounded-xl bg-red-950/50 border border-red-800 p-3 text-xs text-red-300">{error}</p>}

        {isCollab && (
          <div className="space-y-3.5">
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-300">Nome completo *</label>
              <input className={inputClass} required placeholder="Ex: Carlos Eduardo Silva" value={form.name} onChange={(e) => set('name', e.target.value)} />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-300">Função / Cargo operacional *</label>
              <input
                className={inputClass}
                required
                list="roles-list"
                placeholder="Selecione ou digite a função"
                value={form.role}
                onChange={(e) => set('role', e.target.value)}
              />
              <datalist id="roles-list">
                {COMMON_ROLES.map((r) => (
                  <option key={r} value={r} />
                ))}
              </datalist>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-300">Telefone / WhatsApp</label>
                <input className={inputClass} placeholder="(21) 99999-9999" value={form.phone} onChange={(e) => set('phone', e.target.value)} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-300">CPF / Documento</label>
                <input className={inputClass} placeholder="000.000.000-00" value={form.document} onChange={(e) => set('document', e.target.value)} />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-300">Observações internas</label>
              <textarea className={inputClass} rows={2} placeholder="Habilitação, certificações, restrições..." value={form.notes} onChange={(e) => set('notes', e.target.value)} />
            </div>

            {!item && (
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.createLogin}
                    onChange={(e) => set('createLogin', e.target.checked)}
                    className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-cyan-400"
                  />
                  <span className="text-xs font-bold text-slate-200">Criar acesso restrito ao Hub RRD (Perfil Técnico/Equipe)</span>
                </label>
                <p className="text-[11px] text-slate-400">
                  Permite ao colaborador entrar no portal para consultar os chamados e ordens de serviço atribuídas a ele, sem acesso a dados financeiros ou administrativos.
                </p>
                {form.createLogin && (
                  <div>
                    <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-300">Senha provisória (mín. 6 dígitos)</label>
                    <input
                      className={inputClass}
                      type="password"
                      placeholder="Padrão: rrd123456"
                      value={form.password}
                      onChange={(e) => set('password', e.target.value)}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {isTeam && (
          <div className="space-y-3.5">
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-300">Nome da equipe *</label>
              <input className={inputClass} required placeholder="Ex: Equipe Alfa (Hidrojato 24h)" value={form.name} onChange={(e) => set('name', e.target.value)} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-300">Líder da equipe</label>
                <select className={inputClass} value={form.leaderId} onChange={(e) => set('leaderId', e.target.value)}>
                  <option value="">Sem líder definido</option>
                  {activeCollabs.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.role})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-300">Veículo padrão</label>
                <select className={inputClass} value={form.defaultVehicleId} onChange={(e) => set('defaultVehicleId', e.target.value)}>
                  <option value="">Sem veículo fixo</option>
                  {activeVehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name} {v.plate ? `(${v.plate})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-300">
                Integrantes da equipe ({form.memberIds.length} selecionado{form.memberIds.length === 1 ? '' : 's'})
              </label>
              {activeCollabs.length === 0 ? (
                <p className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-xs text-slate-400">
                  Nenhum colaborador ativo cadastrado. Cadastre colaboradores na aba correspondente primeiro.
                </p>
              ) : (
                <div className="max-h-48 overflow-y-auto space-y-1 rounded-xl border border-slate-800 bg-slate-950/80 p-2.5">
                  {activeCollabs.map((c) => {
                    const isChecked = form.memberIds.includes(c.id)
                    return (
                      <label
                        key={c.id}
                        className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition ${
                          isChecked ? 'bg-cyan-950/40 border border-cyan-800/60' : 'hover:bg-slate-900 border border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleMember(c.id)}
                            className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-cyan-400"
                          />
                          <span className="text-xs font-semibold text-slate-200">{c.name}</span>
                        </div>
                        <span className="text-[11px] text-slate-400 bg-slate-900 px-2 py-0.5 rounded">{c.role}</span>
                      </label>
                    )
                  })}
                </div>
              )}
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-300">Descrição / Finalidade</label>
              <textarea className={inputClass} rows={2} placeholder="Ex: Atendimento emergencial na Barra e Recreio..." value={form.description} onChange={(e) => set('description', e.target.value)} />
            </div>
          </div>
        )}

        {!isCollab && !isTeam && (
          <div className="space-y-3.5">
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-300">Nome / Identificação *</label>
              <input className={inputClass} required placeholder="Ex: Caminhão Vácuo Heavy 01" value={form.name} onChange={(e) => set('name', e.target.value)} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-300">Placa</label>
                <input className={inputClass} placeholder="ABC-1D23" value={form.plate} onChange={(e) => set('plate', e.target.value)} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-300">Tipo / Modelo</label>
                <input className={inputClass} placeholder="Ex: Mercedes-Benz Atego 1726" value={form.type} onChange={(e) => set('type', e.target.value)} />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-300">Equipe padrão vinculada</label>
              <select className={inputClass} value={form.teamId} onChange={(e) => set('teamId', e.target.value)}>
                <option value="">Sem equipe vinculada</option>
                {teams.filter((t) => t.isActive).map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-300">Descrição e equipamentos embarcados</label>
              <textarea className={inputClass} rows={2} placeholder="Ex: Bomba vácuo 10m³ + hidrojato 1500 bar..." value={form.description} onChange={(e) => set('description', e.target.value)} />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-300">Observações de manutenção / documento</label>
              <textarea className={inputClass} rows={2} placeholder="Ex: Vistoria vence em 10/2026..." value={form.notes} onChange={(e) => set('notes', e.target.value)} />
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2.5 border-t border-slate-800 pt-4">
          <button type="button" onClick={onClose} disabled={loading} className="rounded-xl px-4 py-2 text-xs font-bold text-slate-400 hover:text-slate-200">
            Cancelar
          </button>
          <button type="submit" disabled={loading} className="rounded-xl bg-cyan-600 px-5 py-2 text-xs font-bold text-white hover:bg-cyan-500 disabled:opacity-50">
            {loading ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </form>
    </div>
  )
}

export function OperacionalClient({
  initialColaboradores = [],
  initialEquipes,
  initialFrotas,
}: {
  initialColaboradores?: Collaborator[]
  initialEquipes: Team[]
  initialFrotas: Vehicle[]
}) {
  const [colaboradores, setColaboradores] = useState<Collaborator[]>(initialColaboradores)
  const [teams, setTeams] = useState<Team[]>(initialEquipes)
  const [vehicles, setVehicles] = useState<Vehicle[]>(initialFrotas)
  const [activeTab, setActiveTab] = useState<'colaboradores' | 'equipes' | 'frotas'>('colaboradores')

  const [editor, setEditor] = useState<{ kind: 'collaborator' | 'team' | 'vehicle'; item?: any } | null>(null)
  const [check, setCheck] = useState<any>(null)
  const [details, setDetails] = useState<{ kind: 'collaborator' | 'team' | 'vehicle'; item: any } | null>(null)

  const update = (kind: 'collaborator' | 'team' | 'vehicle', value: any) => {
    if (kind === 'collaborator') {
      setColaboradores((prev) =>
        prev.some((c) => c.id === value.id) ? prev.map((c) => (c.id === value.id ? value : c)) : [...prev, value]
      )
    } else if (kind === 'team') {
      setTeams((prev) => (prev.some((t) => t.id === value.id) ? prev.map((t) => (t.id === value.id ? value : t)) : [...prev, value]))
    } else {
      setVehicles((prev) => (prev.some((v) => v.id === value.id) ? prev.map((v) => (v.id === value.id ? value : v)) : [...prev, value]))
    }
  }

  async function archive(kind: 'collaborator' | 'team' | 'vehicle', id: string) {
    if (!confirm('Arquivar este cadastro? O histórico operacional será preservado com segurança.')) return

    let url = `/api/operacional/veiculos?id=${id}`
    if (kind === 'collaborator') url = `/api/operacional/colaboradores?id=${id}`
    if (kind === 'team') url = `/api/operacional/equipes?id=${id}`

    const res = await fetch(url, { method: 'DELETE' })
    if (res.ok) {
      if (kind === 'collaborator') {
        setColaboradores((prev) => prev.map((c) => (c.id === id ? { ...c, isActive: false } : c)))
      } else if (kind === 'team') {
        setTeams((prev) => prev.map((t) => (t.id === id ? { ...t, isActive: false } : t)))
      } else {
        setVehicles((prev) => prev.map((v) => (v.id === id ? { ...v, isActive: false } : v)))
      }
    }
  }

  const activeCollabs = colaboradores.filter((c) => c.isActive)
  const activeTeams = teams.filter((t) => t.isActive)
  const activeVehicles = vehicles.filter((v) => v.isActive)

  return (
    <div className="space-y-5">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-zinc-500">
            <span>Operação RR</span>
            <span>/</span>
            <span className="text-zinc-300">Recursos de Campo</span>
          </div>
          <h1 className="mt-1 flex items-center gap-2 text-xl sm:text-2xl font-semibold tracking-tight text-zinc-100">
            Gestão Operacional
          </h1>
          <p className="mt-0.5 text-xs text-zinc-400">
            Colaboradores, equipes dinâmicas, veículos e controle de campo.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setEditor({ kind: 'collaborator' })}
            className="flex items-center gap-1.5 rounded-md bg-cyan-500 px-3 py-1.5 text-xs font-medium text-zinc-950 hover:bg-cyan-400 transition shadow-[0_0_15px_rgba(6,182,212,0.3)]"
          >
            <Plus className="h-3.5 w-3.5 stroke-[2.5]" /> Novo colaborador
          </button>
          <button
            onClick={() => setEditor({ kind: 'team' })}
            className="flex items-center gap-1.5 rounded-md border border-white/[0.08] bg-zinc-900/80 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:border-white/[0.2] hover:bg-zinc-800 transition"
          >
            <Plus className="h-3.5 w-3.5" /> Nova equipe
          </button>
          <button
            onClick={() => setEditor({ kind: 'vehicle' })}
            className="flex items-center gap-1.5 rounded-md border border-white/[0.08] bg-zinc-900/80 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:border-white/[0.2] hover:bg-zinc-800 transition"
          >
            <Plus className="h-3.5 w-3.5" /> Novo veículo
          </button>
        </div>
      </header>

      {/* Tabs navigation */}
      <div className="flex items-center rounded-md border border-white/[0.08] bg-zinc-950/80 p-0.5 w-fit">
        <button
          onClick={() => setActiveTab('colaboradores')}
          className={`flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition-all ${
            activeTab === 'colaboradores'
              ? 'bg-zinc-800 text-zinc-100 shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <HardHat className="w-3.5 h-3.5" /> Colaboradores ({activeCollabs.length})
        </button>

        <button
          onClick={() => setActiveTab('equipes')}
          className={`flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition-all ${
            activeTab === 'equipes'
              ? 'bg-zinc-800 text-zinc-100 shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Users className="w-3.5 h-3.5" /> Equipes ({activeTeams.length})
        </button>

        <button
          onClick={() => setActiveTab('frotas')}
          className={`flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition-all ${
            activeTab === 'frotas'
              ? 'bg-zinc-800 text-zinc-100 shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Truck className="w-3.5 h-3.5" /> Frotas & Veículos ({activeVehicles.length})
        </button>
      </div>

      {/* Section: Colaboradores */}
      {activeTab === 'colaboradores' && (
        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-bold text-white">
                <HardHat className="h-5 w-5 text-cyan-400" /> Profissionais da RR Desentupidora
              </h2>
              <p className="text-xs text-slate-400">
                Cadastre técnicos, operadores, encanadores e ajudantes para compor equipes e ordens de serviço.
              </p>
            </div>
            <button
              onClick={() => setEditor({ kind: 'collaborator' })}
              className="text-xs font-bold text-cyan-400 hover:underline"
            >
              + Adicionar profissional
            </button>
          </div>

          {colaboradores.length === 0 ? (
            <div className="p-8 text-center rounded-xl border border-dashed border-slate-800 text-slate-400 text-xs">
              Nenhum colaborador cadastrado ainda. Clique em "Novo colaborador" para registrar os profissionais da RRD.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {colaboradores.map((c) => (
                <article
                  key={c.id}
                  className={`rounded-xl border p-4 transition ${
                    c.isActive ? 'border-slate-800 bg-slate-800/40' : 'border-slate-900 bg-slate-950/40 opacity-60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-bold text-slate-100 flex items-center gap-1.5">
                        {c.name}
                      </h3>
                      <p className="mt-1 text-xs font-semibold text-cyan-400">{c.role}</p>
                      {c.phone && <p className="mt-1 text-xs text-slate-400 flex items-center gap-1"><Phone className="w-3 h-3" /> {c.phone}</p>}
                      {c.document && <p className="mt-0.5 text-xs text-slate-500">Doc: {c.document}</p>}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${c.isActive ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/40' : 'bg-slate-900 text-slate-500'}`}>
                        {c.isActive ? 'Ativo' : 'Arquivado'}
                      </span>
                      {c.userId && (
                        <span className="text-[10px] font-bold text-cyan-300 bg-cyan-950/60 border border-cyan-800/50 px-1.5 py-0.5 rounded flex items-center gap-1">
                          <Shield className="w-2.5 h-2.5" /> Acesso Hub
                        </span>
                      )}
                    </div>
                  </div>

                  {c.notes && <p className="mt-3 text-xs text-slate-400 italic bg-slate-950/40 p-2 rounded-lg">{c.notes}</p>}

                  <div className="mt-4 flex gap-2 pt-2 border-t border-slate-800/60">
                    <button
                      onClick={() => setDetails({ kind: 'collaborator', item: c })}
                      className="flex items-center gap-1 rounded-lg border border-cyan-800/60 px-3 py-1.5 text-xs font-bold text-cyan-300 hover:bg-cyan-950/40"
                    >
                      Ver
                    </button>
                    <button
                      onClick={() => setEditor({ kind: 'collaborator', item: c })}
                      className="flex items-center gap-1 rounded-lg bg-slate-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-600"
                    >
                      <Pencil className="h-3 w-3" /> Editar
                    </button>
                    {c.isActive && (
                      <button
                        onClick={() => archive('collaborator', c.id)}
                        className="flex items-center gap-1 rounded-lg bg-red-950/40 px-3 py-1.5 text-xs font-bold text-red-300 hover:bg-red-900/60"
                      >
                        <Trash2 className="h-3 w-3" /> Arquivar
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Section: Equipes */}
      {activeTab === 'equipes' && (
        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-bold text-white">
                <Users className="h-5 w-5 text-cyan-400" /> Equipes Operacionais
              </h2>
              <p className="text-xs text-slate-400">
                Presets dinâmicos de equipes com líder, veículo e técnicos cadastrados.
              </p>
            </div>
            <button
              onClick={() => setEditor({ kind: 'team' })}
              className="text-xs font-bold text-cyan-400 hover:underline"
            >
              + Criar equipe
            </button>
          </div>

          {teams.length === 0 ? (
            <div className="p-8 text-center rounded-xl border border-dashed border-slate-800 text-slate-400 text-xs">
              Nenhuma equipe criada ainda.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {teams.map((t) => {
                const leader = colaboradores.find((c) => c.id === t.leaderId)
                const defaultVeh = vehicles.find((v) => v.id === t.defaultVehicleId)
                const memberCount = Array.isArray(t.memberIds) && t.memberIds.length > 0 ? t.memberIds.length : (t.participants?.length || 0)

                return (
                  <article
                    key={t.id}
                    className={`rounded-xl border p-4 transition ${
                      t.isActive ? 'border-slate-800 bg-slate-800/40' : 'border-slate-900 bg-slate-950/40 opacity-60'
                    }`}
                  >
                    <div className="flex justify-between gap-3">
                      <div>
                        <h3 className="font-bold text-slate-100">{t.name}</h3>
                        <p className="mt-1 text-xs text-slate-400">
                          Líder: <strong className="text-slate-200">{leader?.name || t.leaderName || 'Não definido'}</strong>
                          {leader ? ` (${leader.role})` : ''}
                        </p>
                        <p className="mt-1 text-xs text-cyan-400">
                          Veículo padrão: {defaultVeh ? `${defaultVeh.name} (${defaultVeh.plate || 's/ placa'})` : 'Nenhum fixo'}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          Integrantes vinculados: <strong className="text-slate-200">{memberCount}</strong> colaborador(es)
                        </p>
                        <p className="mt-2 text-xs text-slate-500">{t.description || 'Sem descrição'}</p>
                      </div>
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${t.isActive ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/40' : 'bg-slate-900 text-slate-500'}`}>
                        {t.isActive ? 'Ativa' : 'Arquivada'}
                      </span>
                    </div>

                    <div className="mt-4 flex gap-2 pt-2 border-t border-slate-800/60">
                      <button
                        onClick={() => setDetails({ kind: 'team', item: t })}
                        className="flex items-center gap-1 rounded-lg border border-cyan-800/60 px-3 py-1.5 text-xs font-bold text-cyan-300 hover:bg-cyan-950/40"
                      >
                        Ver
                      </button>
                      <button
                        onClick={() => setEditor({ kind: 'team', item: t })}
                        className="flex items-center gap-1 rounded-lg bg-slate-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-600"
                      >
                        <Pencil className="h-3 w-3" /> Editar
                      </button>
                      {t.isActive && (
                        <button
                          onClick={() => archive('team', t.id)}
                          className="flex items-center gap-1 rounded-lg bg-red-950/40 px-3 py-1.5 text-xs font-bold text-red-300 hover:bg-red-900/60"
                        >
                          <Trash2 className="h-3 w-3" /> Arquivar
                        </button>
                      )}
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </section>
      )}

      {/* Section: Frotas & Veículos */}
      {activeTab === 'frotas' && (
        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-bold text-white">
                <Truck className="h-5 w-5 text-cyan-400" /> Frotas e veículos
              </h2>
              <p className="text-xs text-slate-400">
                Veículos, caminhões de vácuo, utilitários e máquinas da operação.
              </p>
            </div>
            <button
              onClick={() => setEditor({ kind: 'vehicle' })}
              className="text-xs font-bold text-cyan-400 hover:underline"
            >
              + Criar veículo
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {vehicles.map((v) => (
              <article
                key={v.id}
                className={`rounded-xl border p-4 transition ${
                  v.isActive ? 'border-slate-800 bg-slate-800/40' : 'border-slate-900 bg-slate-950/40 opacity-60'
                }`}
              >
                <div className="flex justify-between">
                  <div>
                    <h3 className="font-bold text-slate-100">{v.name}</h3>
                    <p className="mt-1 text-xs text-slate-400">
                      {v.type || 'Tipo não definido'} · Placa: <strong className="text-slate-200">{v.plate || 'Sem placa'}</strong>
                    </p>
                    <p className="mt-1 text-xs text-cyan-400">
                      Equipe vinculada: {activeTeams.find((t) => t.id === v.teamId)?.name || 'Sem vínculo fixo'}
                    </p>
                  </div>
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${v.isActive ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/40' : 'bg-slate-900 text-slate-500'}`}>
                    {v.isActive ? 'Ativo' : 'Arquivado'}
                  </span>
                </div>

                <div className="mt-4 flex flex-wrap gap-2 pt-2 border-t border-slate-800/60">
                  <button
                    onClick={() => setDetails({ kind: 'vehicle', item: v })}
                    className="flex items-center gap-1 rounded-lg border border-cyan-800/60 px-3 py-1.5 text-xs font-bold text-cyan-300 hover:bg-cyan-950/40"
                  >
                    Ver
                  </button>
                  <button
                    onClick={() => setEditor({ kind: 'vehicle', item: v })}
                    className="flex items-center gap-1 rounded-lg bg-slate-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-600"
                  >
                    <Pencil className="h-3 w-3" /> Editar
                  </button>
                  {v.isActive && (
                    <>
                      <button
                        onClick={() => archive('vehicle', v.id)}
                        className="flex items-center gap-1 rounded-lg bg-red-950/40 px-3 py-1.5 text-xs font-bold text-red-300 hover:bg-red-900/60"
                      >
                        <Trash2 className="h-3 w-3" /> Arquivar
                      </button>
                      <button
                        onClick={() => setCheck(v)}
                        className="flex items-center gap-1 rounded-lg bg-slate-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-600"
                      >
                        <CheckCircle2 className="h-3 w-3" /> Checklist
                      </button>
                    </>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* Details modal */}
      {details && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4">
          <section className="max-h-[90vh] w-full max-w-lg space-y-4 overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-lg font-black text-white">
                Detalhes {details.kind === 'collaborator' ? 'do colaborador' : details.kind === 'team' ? 'da equipe' : 'do veículo'}
              </h2>
              <button onClick={() => setDetails(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <dl className="space-y-3">
              {details.kind === 'collaborator' && (
                <>
                  <div>
                    <dt className="text-xs font-bold text-slate-400 uppercase">Nome</dt>
                    <dd className="text-sm font-semibold text-slate-100">{details.item.name}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-bold text-slate-400 uppercase">Função / Cargo</dt>
                    <dd className="text-sm text-cyan-400 font-semibold">{details.item.role}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-bold text-slate-400 uppercase">Telefone</dt>
                    <dd className="text-sm text-slate-100">{details.item.phone || 'Não informado'}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-bold text-slate-400 uppercase">CPF / Documento</dt>
                    <dd className="text-sm text-slate-100">{details.item.document || 'Não informado'}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-bold text-slate-400 uppercase">Acesso ao Hub</dt>
                    <dd className="text-sm text-slate-100">
                      {details.item.userId ? 'Sim (Perfil Equipe Restrito)' : 'Sem login cadastrado'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-bold text-slate-400 uppercase">Observações</dt>
                    <dd className="whitespace-pre-wrap text-sm text-slate-100">{details.item.notes || 'Nenhuma'}</dd>
                  </div>
                </>
              )}

              {details.kind === 'team' && (
                <>
                  <div>
                    <dt className="text-xs font-bold text-slate-400 uppercase">Nome da equipe</dt>
                    <dd className="text-sm font-semibold text-slate-100">{details.item.name}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-bold text-slate-400 uppercase">Líder</dt>
                    <dd className="text-sm text-slate-100">
                      {colaboradores.find((c) => c.id === details.item.leaderId)?.name || details.item.leaderName || 'Não definido'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-bold text-slate-400 uppercase">Veículo padrão</dt>
                    <dd className="text-sm text-slate-100">
                      {vehicles.find((v) => v.id === details.item.defaultVehicleId)?.name || 'Sem veículo padrão'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-bold text-slate-400 uppercase">Integrantes cadastrados</dt>
                    <dd className="mt-1 text-sm text-slate-100">
                      {Array.isArray(details.item.memberIds) && details.item.memberIds.length > 0 ? (
                        <ul className="list-disc list-inside space-y-1">
                          {details.item.memberIds.map((mid: string) => {
                            const c = colaboradores.find((collab) => collab.id === mid)
                            return (
                              <li key={mid}>
                                {c ? `${c.name} (${c.role})` : mid}
                              </li>
                            )
                          })}
                        </ul>
                      ) : details.item.participants?.length ? (
                        details.item.participants.join(', ')
                      ) : (
                        'Nenhum integrante vinculado'
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-bold text-slate-400 uppercase">Descrição</dt>
                    <dd className="whitespace-pre-wrap text-sm text-slate-100">{details.item.description || 'Não informado'}</dd>
                  </div>
                </>
              )}

              {details.kind === 'vehicle' && (
                <>
                  <div>
                    <dt className="text-xs font-bold text-slate-400 uppercase">Nome / Identificação</dt>
                    <dd className="text-sm font-semibold text-slate-100">{details.item.name}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-bold text-slate-400 uppercase">Placa</dt>
                    <dd className="text-sm text-slate-100">{details.item.plate || 'Não informada'}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-bold text-slate-400 uppercase">Tipo / Modelo</dt>
                    <dd className="text-sm text-slate-100">{details.item.type || 'Não informado'}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-bold text-slate-400 uppercase">Equipe vinculada</dt>
                    <dd className="text-sm text-slate-100">
                      {teams.find((t) => t.id === details.item.teamId)?.name || 'Sem vínculo'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-bold text-slate-400 uppercase">Descrição</dt>
                    <dd className="whitespace-pre-wrap text-sm text-slate-100">{details.item.description || 'Não informada'}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-bold text-slate-400 uppercase">Observações</dt>
                    <dd className="whitespace-pre-wrap text-sm text-slate-100">{details.item.notes || 'Nenhuma'}</dd>
                  </div>
                </>
              )}

              <div>
                <dt className="text-xs font-bold text-slate-400 uppercase">Situação</dt>
                <dd className="text-sm text-slate-100">{details.item.isActive ? 'Ativo(a)' : 'Arquivado(a)'}</dd>
              </div>
            </dl>
          </section>
        </div>
      )}

      {/* Editor modal */}
      {editor && (
        <Editor
          {...editor}
          teams={teams}
          vehicles={vehicles}
          collaborators={colaboradores}
          onClose={() => setEditor(null)}
          onSaved={(x) => update(editor.kind, x)}
        />
      )}

      {/* Vehicle checklist modal */}
      <ModalChecklistVeiculo isOpen={!!check} vehicle={check} onClose={() => setCheck(null)} />
    </div>
  )
}
