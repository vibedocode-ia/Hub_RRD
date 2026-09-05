'use client';

import { useState } from 'react';
import { Loader2, Save } from 'lucide-react';

type Profile = {
  id: string; audience: string; title: string; description: string; initialLookupFields: string; initialContext: string; responsePrompt: string; allowedData: string; blockedData: string; isActive: boolean;
};

export default function SofiaProfileEditor({ profiles }: { profiles: Profile[] }) {
  const [items, setItems] = useState(profiles);
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const update = (id: string, key: keyof Profile, value: string | boolean) => setItems(items.map(p => p.id === id ? { ...p, [key]: value } : p));
  const save = async (profile: Profile) => {
    setSaving(profile.id); setMessage(null);
    const res = await fetch('/api/settings/sofia-profiles', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(profile) });
    const data = await res.json().catch(() => ({}));
    setSaving(null);
    if (!res.ok) { setMessage(data.error || 'Erro ao salvar perfil.'); return; }
    setMessage(`Perfil "${profile.title}" salvo.`);
  };

  return <div className="space-y-5">
    {message && <div className="rounded-xl border border-cyan-700 bg-cyan-950/40 p-3 text-xs text-cyan-200">{message}</div>}
    {items.map((p, idx) => <section key={p.id} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-cyan-400">Atendimento {idx + 1} · {p.audience}</div>
          <input value={p.title} onChange={e=>update(p.id,'title',e.target.value)} className="mt-1 w-full bg-transparent text-lg font-black text-slate-100 outline-none" />
          <textarea value={p.description} onChange={e=>update(p.id,'description',e.target.value)} rows={2} className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 p-3 text-xs text-slate-300" />
        </div>
        <label className="inline-flex items-center gap-2 text-xs text-slate-300"><input type="checkbox" checked={p.isActive} onChange={e=>update(p.id,'isActive',e.target.checked)} /> Ativo</label>
      </div>
      <TextArea label="Campos de consulta inicial / identificação" value={p.initialLookupFields} onChange={v=>update(p.id,'initialLookupFields',v)} rows={4}/>
      <TextArea label="Contexto inicial da Sofia" value={p.initialContext} onChange={v=>update(p.id,'initialContext',v)} rows={6}/>
      <TextArea label="Prompt — como a Sofia deve responder" value={p.responsePrompt} onChange={v=>update(p.id,'responsePrompt',v)} rows={7}/>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <TextArea label="Dados liberados" value={p.allowedData} onChange={v=>update(p.id,'allowedData',v)} rows={4}/>
        <TextArea label="Dados bloqueados" value={p.blockedData} onChange={v=>update(p.id,'blockedData',v)} rows={4}/>
      </div>
      <button onClick={()=>save(p)} disabled={saving===p.id} className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-4 py-2 text-sm font-bold text-white hover:bg-cyan-500 disabled:opacity-50">
        {saving===p.id ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4"/>} Salvar este perfil
      </button>
    </section>)}
  </div>
}

function TextArea({label,value,onChange,rows}:{label:string; value:string; onChange:(v:string)=>void; rows:number}){
  return <label className="block"><span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</span><textarea value={value || ''} onChange={e=>onChange(e.target.value)} rows={rows} className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950 p-3 text-sm leading-relaxed text-slate-100 outline-none focus:border-cyan-500" /></label>
}
