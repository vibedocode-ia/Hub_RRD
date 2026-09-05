'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Save, Loader2 } from 'lucide-react';

export default function EditClientForm({ initial }: { initial: any }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(initial);
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm({ ...form, [e.target.name]: e.target.value });
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError(null);
    const res = await fetch(`/api/crm/${initial.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { setError(data.error || 'Erro ao salvar.'); setLoading(false); return; }
    router.push(`/portal/crm/${initial.id}`); router.refresh();
  };
  return <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
    {error && <div className="rounded-xl border border-red-800 bg-red-950/50 p-3 text-xs text-red-200">{error}</div>}
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <Field name="name" label="Nome / Razão Social" value={form.name} onChange={handleChange} required />
      <Select name="type" label="Tipo" value={form.type} onChange={handleChange} options={['PF','PJ','CONDOMINIO','RESTAURANTE','INDUSTRIA']} />
      <Field name="phone" label="Telefone" value={form.phone} onChange={handleChange} required />
      <Field name="document" label="CPF/CNPJ" value={form.document || ''} onChange={handleChange} />
      <Field name="email" label="E-mail" value={form.email || ''} onChange={handleChange} />
      <Field name="contactPerson" label="Pessoa de contato" value={form.contactPerson || ''} onChange={handleChange} />
      <Field name="street" label="Rua" value={form.street || ''} onChange={handleChange} />
      <Field name="number" label="Número" value={form.number || ''} onChange={handleChange} />
      <Field name="neighborhood" label="Bairro" value={form.neighborhood || ''} onChange={handleChange} required />
      <Field name="city" label="Cidade" value={form.city || ''} onChange={handleChange} />
      <Field name="state" label="UF" value={form.state || 'RJ'} onChange={handleChange} />
      <Field name="referencePoint" label="Referência" value={form.referencePoint || ''} onChange={handleChange} />
    </div>
    <label className="block"><span className="text-xs font-bold uppercase text-slate-300">Notas internas</span><textarea name="notes" value={form.notes || ''} onChange={handleChange} rows={3} className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950 p-3 text-sm text-slate-100" /></label>
    <label className="block"><span className="text-xs font-bold uppercase text-slate-300">Notas de acesso</span><textarea name="serviceAccessNotes" value={form.serviceAccessNotes || ''} onChange={handleChange} rows={2} className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950 p-3 text-sm text-slate-100" /></label>
    <button disabled={loading} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-600 px-4 py-3 text-sm font-bold text-white hover:bg-cyan-500 disabled:opacity-50">{loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Salvar alterações</button>
  </form>;
}
function Field(props: any) { return <label className="block"><span className="text-xs font-bold uppercase text-slate-300">{props.label}</span><input {...props} label={undefined} className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950 p-3 text-sm text-slate-100" /></label>; }
function Select({ name, label, value, onChange, options }: any) { return <label className="block"><span className="text-xs font-bold uppercase text-slate-300">{label}</span><select name={name} value={value} onChange={onChange} className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950 p-3 text-sm text-slate-100">{options.map((o: string) => <option key={o} value={o}>{o}</option>)}</select></label>; }
