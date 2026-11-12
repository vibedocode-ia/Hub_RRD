'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { 
  Archive, 
  Building2, 
  Mail, 
  Pencil, 
  Phone, 
  Plus, 
  Search, 
  Users,
  Table as TableIcon,
  LayoutGrid,
  ExternalLink
} from 'lucide-react';

type Contact = { 
  id: string; 
  name: string; 
  phone: string | null; 
  email: string | null; 
  title: string | null; 
  photoUrl: string | null; 
  linkedinUrl: string | null; 
  instagramUrl: string | null; 
  websiteUrl: string | null; 
  clientId: string | null; 
};

type Company = { id: string; name: string };
type ContactForm = { 
  name: string; 
  phone: string; 
  email: string; 
  title: string; 
  photoUrl: string; 
  linkedinUrl: string; 
  instagramUrl: string; 
  websiteUrl: string; 
  clientId: string; 
};

const emptyForm: ContactForm = { 
  name: '', 
  phone: '', 
  email: '', 
  title: '', 
  photoUrl: '', 
  linkedinUrl: '', 
  instagramUrl: '', 
  websiteUrl: '', 
  clientId: '' 
};

const inputClass = 'h-9 w-full rounded-md border border-white/[0.08] bg-zinc-900 px-3 text-xs text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20';

function formFromContact(contact: Contact): ContactForm {
  return { 
    name: contact.name, 
    phone: contact.phone ?? '', 
    email: contact.email ?? '', 
    title: contact.title ?? '', 
    photoUrl: contact.photoUrl ?? '', 
    linkedinUrl: contact.linkedinUrl ?? '', 
    instagramUrl: contact.instagramUrl ?? '', 
    websiteUrl: contact.websiteUrl ?? '', 
    clientId: contact.clientId ?? '' 
  };
}

export default function ContactsClient({ initial, companies }: { initial: Contact[]; companies: Company[] }) {
  const [items, setItems] = useState(initial);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('TODOS');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Contact | null>(null);
  const [form, setForm] = useState<ContactForm>(emptyForm);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  const companyMap = useMemo(() => new Map(companies.map(c => [c.id, c.name])), [companies]);

  const filtered = useMemo(() => items.filter(item => {
    const q = query.toLowerCase();
    const matches = !q || [item.name, item.email, item.phone, item.title].some(value => String(value ?? '').toLowerCase().includes(q));
    const kind = filter === 'VINCULADOS' ? Boolean(item.clientId) : filter === 'SEM_VINCULO' ? !item.clientId : true;
    return matches && kind;
  }), [items, query, filter]);

  const linked = items.filter(item => item.clientId).length;
  const set = (key: keyof ContactForm, value: string) => setForm(current => ({ ...current, [key]: value }));

  function openCreate() { 
    setEditing(null); 
    setForm(emptyForm); 
    setError(''); 
    setOpen(true); 
  }

  function openEdit(contact: Contact) { 
    setEditing(contact); 
    setForm(formFromContact(contact)); 
    setError(''); 
    setOpen(true); 
  }

  function closeForm() { 
    if (!saving) { 
      setOpen(false); 
      setEditing(null); 
      setError(''); 
    } 
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true); 
    setError('');
    try {
      const payload = Object.fromEntries(Object.entries(form).map(([key, value]) => [key, value || null]));
      const response = await fetch(editing ? `/api/contatos/${editing.id}` : '/api/contatos', { 
        method: editing ? 'PATCH' : 'POST', 
        headers: { 'content-type': 'application/json' }, 
        body: JSON.stringify(payload) 
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) { 
        setError(data.error || 'Não foi possível salvar o contato.'); 
        return; 
      }
      setItems(current => editing ? current.map(item => item.id === editing.id ? data.contact : item) : [...current, data.contact]);
      setMessage(editing ? 'Contato atualizado com sucesso.' : 'Contato salvo com sucesso.');
      setOpen(false); 
      setEditing(null); 
      setForm(emptyForm);
    } catch {
      setError('Não foi possível salvar o contato. Verifique a conexão e tente novamente.');
    } finally {
      setSaving(false);
    }
  }

  async function archive(id: string, name: string) {
    if (!window.confirm(`Arquivar ${name}? O contato deixará a lista ativa, sem apagar o histórico.`)) return;
    setError(''); 
    setMessage('');
    try {
      const response = await fetch(`/api/contatos/${id}`, { method: 'DELETE' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) { 
        setError(data.error || 'Não foi possível arquivar o contato.'); 
        return; 
      }
      setItems(current => current.filter(item => item.id !== id));
      setMessage('Contato arquivado. O histórico foi preservado.');
    } catch {
      setError('Não foi possível arquivar o contato. Verifique a conexão e tente novamente.');
    }
  }

  return (
    <div className="space-y-5">
      {/* 1. Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-zinc-500">
            <span>Operação Comercial</span>
            <span>/</span>
            <span className="text-zinc-300">Agenda de Contatos</span>
          </div>
          <div className="mt-1 flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-zinc-100">
              Contatos
            </h1>
            <span className="inline-flex items-center rounded-md border border-white/[0.08] bg-zinc-900/80 px-2 py-0.5 text-xs font-mono text-zinc-400">
              {items.length} pessoas
            </span>
          </div>
          <p className="mt-0.5 text-xs text-zinc-400">
            Pessoas reais de relacionamento, vinculadas a clientes quando houver vínculo corporativo.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={openCreate}
            className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-cyan-500 px-3.5 text-xs font-medium text-zinc-950 transition-all hover:bg-cyan-400 active:scale-[0.98] shadow-[0_0_15px_rgba(6,182,212,0.3)]"
          >
            <Plus className="size-3.5 stroke-[2.5]" />
            <span>Novo Contato</span>
          </button>
        </div>
      </div>

      {/* 2. Metric Strip Contínua */}
      <div className="grid grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-white/[0.08] rounded-lg border border-white/[0.08] bg-zinc-950/70 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]">
        <div className="p-3.5 sm:px-4">
          <div className="flex items-center justify-between text-xs text-zinc-400 font-medium">
            <span>Total de Contatos</span>
            <Users className="size-3.5 text-zinc-400" />
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl font-semibold font-mono tracking-tight text-zinc-100">{items.length}</span>
            <span className="text-[10px] text-zinc-500 font-mono">cadastrados</span>
          </div>
        </div>

        <div className="p-3.5 sm:px-4">
          <div className="flex items-center justify-between text-xs text-zinc-400 font-medium">
            <span>Vinculados a Empresas</span>
            <Building2 className="size-3.5 text-emerald-400" />
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl font-semibold font-mono tracking-tight text-emerald-400">{linked}</span>
            <span className="text-[10px] text-zinc-500 font-mono">no CRM</span>
          </div>
        </div>

        <div className="p-3.5 sm:px-4">
          <div className="flex items-center justify-between text-xs text-zinc-400 font-medium">
            <span>Contatos Avulsos</span>
            <span className="size-2 rounded-full bg-amber-400" />
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl font-semibold font-mono tracking-tight text-amber-300">{items.length - linked}</span>
            <span className="text-[10px] text-zinc-500 font-mono">sem empresa</span>
          </div>
        </div>

        <div className="p-3.5 sm:px-4">
          <div className="flex items-center justify-between text-xs text-zinc-400 font-medium">
            <span>Com Telefone / WhatsApp</span>
            <Phone className="size-3.5 text-cyan-400" />
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl font-semibold font-mono tracking-tight text-cyan-300">
              {items.filter(item => item.phone).length}
            </span>
            <span className="text-[10px] text-zinc-500 font-mono">acionáveis</span>
          </div>
        </div>
      </div>

      {/* Formulário Modal/Drawer */}
      {open && (
        <form onSubmit={save} className="rounded-lg border border-white/[0.08] bg-zinc-950/90 p-4 shadow-xl space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-200">
              {editing ? 'Editar Contato' : 'Cadastrar Novo Contato'}
            </h2>
            <button type="button" onClick={closeForm} className="text-xs text-zinc-400 hover:text-white">✕</button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] font-mono uppercase text-zinc-400 block mb-1">Nome completo *</label>
              <input required value={form.name} onChange={e => set('name', e.target.value)} placeholder="Ex: Carlos Silva" className={inputClass} />
            </div>
            <div>
              <label className="text-[10px] font-mono uppercase text-zinc-400 block mb-1">Telefone / WhatsApp</label>
              <input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="(21) 99999-9999" className={inputClass} />
            </div>
            <div>
              <label className="text-[10px] font-mono uppercase text-zinc-400 block mb-1">E-mail</label>
              <input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="carlos@empresa.com" className={inputClass} />
            </div>
            <div>
              <label className="text-[10px] font-mono uppercase text-zinc-400 block mb-1">Cargo / Função</label>
              <input value={form.title} onChange={e => set('title', e.target.value)} placeholder="Ex: Síndico / Gerente Predial" className={inputClass} />
            </div>
            <div>
              <label className="text-[10px] font-mono uppercase text-zinc-400 block mb-1">Cliente Vinculado</label>
              <select value={form.clientId} onChange={e => set('clientId', e.target.value)} className={inputClass}>
                <option value="">Sem cliente vinculado</option>
                {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-mono uppercase text-zinc-400 block mb-1">Website</label>
              <input type="url" value={form.websiteUrl} onChange={e => set('websiteUrl', e.target.value)} placeholder="https://..." className={inputClass} />
            </div>
          </div>

          {error && <p className="text-xs text-rose-400 font-mono">{error}</p>}

          <div className="flex items-center gap-2 pt-2 border-t border-white/[0.06]">
            <button disabled={saving} className="h-8 rounded-md bg-cyan-500 px-3 text-xs font-medium text-zinc-950 hover:bg-cyan-400 disabled:opacity-50">
              {saving ? 'Salvando…' : editing ? 'Salvar Alterações' : 'Cadastrar Contato'}
            </button>
            <button type="button" disabled={saving} onClick={closeForm} className="h-8 rounded-md border border-white/[0.08] bg-zinc-900 px-3 text-xs text-zinc-300 hover:text-white">
              Cancelar
            </button>
          </div>
        </form>
      )}

      {message && (
        <div className="rounded-md border border-emerald-500/30 bg-emerald-950/20 px-3 py-2 text-xs font-mono text-emerald-300">
          {message}
        </div>
      )}

      {/* 3. Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-zinc-400" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Filtrar por nome, telefone, cargo ou e-mail..."
            className="h-8 w-full rounded-md border border-white/[0.08] bg-zinc-900/60 pl-8 pr-3 text-xs text-zinc-200 placeholder:text-zinc-500 focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/20 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-md border border-white/[0.08] bg-zinc-950/80 p-0.5">
            {[
              { id: 'TODOS', label: 'Todos' },
              { id: 'VINCULADOS', label: 'Vinculados' },
              { id: 'SEM_VINCULO', label: 'Sem Vínculo' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id)}
                className={`rounded px-2.5 py-1 text-xs font-medium transition-all ${
                  filter === tab.id
                    ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center rounded-md border border-white/[0.08] bg-zinc-950/80 p-0.5">
            <button
              onClick={() => setViewMode('table')}
              title="Tabela Densa"
              className={`rounded p-1 transition-all ${
                viewMode === 'table' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <TableIcon className="size-3.5" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              title="Cards"
              className={`rounded p-1 transition-all ${
                viewMode === 'grid' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <LayoutGrid className="size-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 4. Tabela de Alta Densidade */}
      {viewMode === 'table' ? (
        <div className="w-full rounded-lg border border-white/[0.08] bg-zinc-950/70 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-white/[0.08] bg-zinc-900/40 text-[11px] font-medium uppercase tracking-wider text-zinc-400">
                <tr>
                  <th className="py-2.5 px-3.5 font-medium">Nome / Cargo</th>
                  <th className="py-2.5 px-3 font-medium">Cliente Vinculado</th>
                  <th className="py-2.5 px-3 font-medium">Telefone / WhatsApp</th>
                  <th className="py-2.5 px-3 font-medium">E-mail</th>
                  <th className="py-2.5 px-3 font-medium">Status</th>
                  <th className="py-2.5 px-3 text-right font-medium">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-xs text-zinc-500 font-mono">
                      Nenhum contato encontrado.
                    </td>
                  </tr>
                ) : (
                  filtered.map((item) => (
                    <tr key={item.id} className="group transition-colors hover:bg-white/[0.02]">
                      <td className="py-2.5 px-3.5">
                        <div className="flex items-center gap-2.5">
                          {item.photoUrl ? (
                            <img src={item.photoUrl} alt="" className="size-6 rounded-full object-cover" />
                          ) : (
                            <div className="flex size-6 items-center justify-center rounded-full bg-zinc-800 text-[10px] font-mono font-semibold text-zinc-300 border border-white/[0.08]">
                              {item.name.slice(0, 1).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <span className="font-medium text-zinc-200 group-hover:text-white block">
                              {item.name}
                            </span>
                            <span className="text-[10px] text-zinc-500 font-mono">
                              {item.title || 'Operacional'}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-2.5 px-3 whitespace-nowrap">
                        {item.clientId ? (
                          <Link
                            href={`/portal/crm/${item.clientId}`}
                            className="inline-flex items-center gap-1 rounded bg-zinc-900 px-2 py-0.5 text-[11px] font-mono text-emerald-400 hover:underline border border-white/[0.06]"
                          >
                            <Building2 className="size-2.5" />
                            <span>{companyMap.get(item.clientId) || 'Empresa'}</span>
                          </Link>
                        ) : (
                          <span className="text-zinc-500 font-mono text-[11px]">—</span>
                        )}
                      </td>

                      <td className="py-2.5 px-3 whitespace-nowrap font-mono text-zinc-300">
                        {item.phone ? (
                          <a href={`tel:${item.phone}`} className="hover:text-cyan-300">
                            {item.phone}
                          </a>
                        ) : (
                          <span className="text-zinc-600">—</span>
                        )}
                      </td>

                      <td className="py-2.5 px-3 whitespace-nowrap text-zinc-400">
                        {item.email ? (
                          <a href={`mailto:${item.email}`} className="hover:text-cyan-300 font-mono text-[11px]">
                            {item.email}
                          </a>
                        ) : (
                          <span className="text-zinc-600">—</span>
                        )}
                      </td>

                      <td className="py-2.5 px-3 whitespace-nowrap">
                        {item.clientId ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-mono font-medium text-emerald-400 border border-emerald-500/20">
                            <span className="size-1.5 rounded-full bg-emerald-400" />
                            Cliente CRM
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] font-mono text-zinc-400 border border-white/[0.06]">
                            Avulso
                          </span>
                        )}
                      </td>

                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEdit(item)}
                            className="inline-flex h-7 items-center rounded border border-white/[0.08] bg-zinc-900/80 px-2 text-[11px] text-zinc-300 hover:border-white/[0.2] hover:bg-zinc-800 hover:text-white transition-colors"
                          >
                            Editar contato
                          </button>
                          <button
                            onClick={() => archive(item.id, item.name)}
                            className="inline-flex h-7 items-center rounded border border-white/[0.08] bg-zinc-900/80 px-2 text-[11px] text-rose-400 hover:border-rose-500/30 hover:bg-rose-950/40 transition-colors"
                          >
                            Arquivar contato
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* 5. Modo Cards */
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="flex flex-col justify-between rounded-lg border border-white/[0.08] bg-zinc-950/70 p-4 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] hover:border-white/[0.18] transition-colors"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {item.photoUrl ? (
                      <img src={item.photoUrl} alt="" className="size-8 rounded-full object-cover" />
                    ) : (
                      <div className="flex size-8 items-center justify-center rounded-full bg-zinc-800 text-xs font-mono font-semibold text-zinc-300 border border-white/[0.08]">
                        {item.name.slice(0, 1).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <h3 className="text-xs font-medium text-zinc-100">{item.name}</h3>
                      <p className="text-[10px] text-zinc-500 font-mono">{item.title || 'Operacional'}</p>
                    </div>
                  </div>
                  {item.clientId && (
                    <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-mono text-emerald-400 border border-emerald-500/20">
                      CRM
                    </span>
                  )}
                </div>

                <div className="mt-3 space-y-1 text-xs text-zinc-400 font-mono">
                  {item.phone && <p className="flex items-center gap-1.5"><Phone className="size-3 text-zinc-500" />{item.phone}</p>}
                  {item.email && <p className="flex items-center gap-1.5 truncate"><Mail className="size-3 text-zinc-500" />{item.email}</p>}
                  {item.clientId && <div className="mt-2"><Link href={`/portal/crm/${item.clientId}`} className="inline-flex items-center gap-1 text-xs font-mono text-emerald-400 hover:underline"><Building2 className="size-3" />Abrir CRM</Link></div>}
                </div>
              </div>

              <div className="mt-4 flex items-center justify-end gap-1.5 border-t border-white/[0.06] pt-3">
                <button
                  onClick={() => openEdit(item)}
                  className="rounded border border-white/[0.08] bg-zinc-900 px-2 py-1 text-[11px] text-zinc-300 hover:text-white"
                >
                  Editar
                </button>
                <button
                  onClick={() => archive(item.id, item.name)}
                  className="rounded border border-white/[0.08] bg-zinc-900 px-2 py-1 text-[11px] text-rose-400 hover:border-rose-500/30"
                >
                  Arquivar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
