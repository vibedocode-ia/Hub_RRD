'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Save } from 'lucide-react';

const CATEGORIES = ['DESENTUPIMENTO','HIDROJATEAMENTO','CAIXA_GORDURA','LIMPA_FOSSA','DEDETIZACAO'];
const STATUS = ['ACTIVE','INACTIVE'];

export default function ServiceForm({ initial }: { initial?: any }) {
  const router = useRouter();
  const [loading,setLoading]=useState(false); const [error,setError]=useState('');
  const [form,setForm]=useState({
    name: initial?.name || '', category: initial?.category || 'DESENTUPIMENTO', description: initial?.description || '', basePrice: initial?.basePrice || '0.00', priceNotes: initial?.priceNotes || '', warrantyDays: initial?.warrantyDays || 30, defaultDurationMinutes: initial?.defaultDurationMinutes || 90, requiresInspection: Boolean(initial?.requiresInspection), isEmergencyEligible: initial?.isEmergencyEligible !== false, status: initial?.status || 'ACTIVE', displayOrder: initial?.displayOrder || 0,
  });
  const ch=(e:any)=>{const {name,value,type,checked}=e.target; setForm({...form,[name]:type==='checkbox'?checked:value});};
  const submit=async(e:any)=>{e.preventDefault(); setLoading(true); setError(''); const res=await fetch(initial?`/api/services/${initial.id}`:'/api/services',{method:initial?'PATCH':'POST',headers:{'content-type':'application/json'},body:JSON.stringify(form)}); const data=await res.json().catch(()=>({})); setLoading(false); if(!res.ok){setError(data.error||'Erro ao salvar serviço.'); return;} router.push('/portal/servicos'); router.refresh();};
  return <form onSubmit={submit} className="space-y-5 rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
    {error&&<div className="rounded-xl border border-red-800 bg-red-950/50 p-3 text-xs text-red-200">{error}</div>}
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <Field name="name" label="Nome do serviço" value={form.name} onChange={ch} required />
      <Select name="category" label="Categoria" value={form.category} onChange={ch} options={CATEGORIES}/>
      <Field name="basePrice" label="Preço base" value={form.basePrice} onChange={ch}/>
      <Field name="warrantyDays" label="Garantia (dias)" value={form.warrantyDays} onChange={ch}/>
      <Field name="defaultDurationMinutes" label="Duração padrão (min)" value={form.defaultDurationMinutes} onChange={ch}/>
      <Field name="displayOrder" label="Ordem" value={form.displayOrder} onChange={ch}/>
      <Select name="status" label="Status" value={form.status} onChange={ch} options={STATUS}/>
    </div>
    <Area name="description" label="Descrição operacional" value={form.description} onChange={ch}/>
    <Area name="priceNotes" label="Notas de preço/precificação" value={form.priceNotes} onChange={ch}/>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-slate-300"><label className="flex items-center gap-2"><input type="checkbox" name="requiresInspection" checked={form.requiresInspection} onChange={ch}/> Exige avaliação/visita</label><label className="flex items-center gap-2"><input type="checkbox" name="isEmergencyEligible" checked={form.isEmergencyEligible} onChange={ch}/> Atende emergência 24h</label></div>
    <button disabled={loading} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-600 px-4 py-3 text-sm font-bold text-white hover:bg-cyan-500 disabled:opacity-50">{loading?<Loader2 className="w-4 h-4 animate-spin"/>:<Save className="w-4 h-4"/>} Salvar serviço</button>
  </form>
}
function Field(p:any){return <label className="block"><span className="text-xs font-bold uppercase text-slate-300">{p.label}</span><input {...p} className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950 p-3 text-sm text-slate-100" /></label>}
function Area(p:any){return <label className="block"><span className="text-xs font-bold uppercase text-slate-300">{p.label}</span><textarea name={p.name} value={p.value} onChange={p.onChange} rows={4} className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950 p-3 text-sm text-slate-100" /></label>}
function Select({name,label,value,onChange,options}:any){return <label className="block"><span className="text-xs font-bold uppercase text-slate-300">{label}</span><select name={name} value={value} onChange={onChange} className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950 p-3 text-sm text-slate-100">{options.map((o:string)=><option key={o} value={o}>{o}</option>)}</select></label>}
