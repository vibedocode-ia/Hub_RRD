import Link from 'next/link';
import { asc, eq } from 'drizzle-orm';
import { Plus, Wrench } from 'lucide-react';
import { db, serviceCatalog } from '@/db';
import { DEFAULT_SERVICE_CATALOG } from '@/lib/rr-defaults';
import DeleteResourceButton from '@/components/DeleteResourceButton';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Serviços · Hub RR' };

async function loadServices(){
  if(!db) return [];
  for (const item of DEFAULT_SERVICE_CATALOG) {
    const existing = await db.select({ id: serviceCatalog.id }).from(serviceCatalog).where(eq(serviceCatalog.name, item.name)).limit(1);
    if (existing.length === 0) await db.insert(serviceCatalog).values(item);
  }
  return db.select().from(serviceCatalog).orderBy(asc(serviceCatalog.displayOrder), asc(serviceCatalog.name));
}

export default async function ServicesPage(){
  const services = await loadServices();
  return <div className="space-y-6">
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div><h1 className="text-2xl font-black text-slate-100 flex items-center gap-2">Serviços RR <Wrench className="w-5 h-5 text-cyan-400"/></h1><p className="text-sm text-slate-400">Catálogo editável usado pela operação, atendimento, orçamentos e Sofia.</p></div>
      <Link href="/portal/servicos/novo" className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-4 py-3 text-sm font-bold text-white hover:bg-cyan-500"><Plus className="w-4 h-4"/> Novo Serviço</Link>
    </div>
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden">
      <div className="grid grid-cols-12 gap-2 border-b border-slate-800 px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-500"><div className="col-span-4">Serviço</div><div className="col-span-2">Categoria</div><div className="col-span-2">Preço</div><div className="col-span-2">Garantia</div><div className="col-span-2 text-right">Ações</div></div>
      {services.map((s:any)=><div key={s.id} className="grid grid-cols-12 gap-2 border-b border-slate-800/70 px-4 py-4 text-sm last:border-0">
        <div className="col-span-4"><div className="font-bold text-slate-100">{s.name}</div><div className="text-xs text-slate-400 line-clamp-2">{s.description}</div><div className="mt-1 text-[10px] text-cyan-300">{s.requiresInspection?'Exige avaliação':'Pode pré-orçar'} · {s.isEmergencyEligible?'Emergência 24h':'Sem emergência'}</div></div>
        <div className="col-span-2 text-slate-300">{s.category}</div><div className="col-span-2 text-slate-300">R$ {Number(s.basePrice||0).toFixed(2)}</div><div className="col-span-2 text-slate-300">{s.warrantyDays} dias<br/><span className="text-[10px] text-slate-500">{s.status}</span></div>
        <div className="col-span-2 flex justify-end gap-2"><Link href={`/portal/servicos/${s.id}/editar`} className="rounded-lg border border-cyan-800/70 px-3 py-1.5 text-xs font-bold text-cyan-300 hover:bg-cyan-950/50">Editar</Link><DeleteResourceButton endpoint={`/api/services/${s.id}`} confirmText={`Excluir o serviço ${s.name}?`} /></div>
      </div>)}
    </div>
  </div>
}
