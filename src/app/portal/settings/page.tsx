import { Settings, ShieldCheck, Truck, Wrench, Users, CheckCircle2, Bot } from 'lucide-react';
import { db, sofiaResponseProfiles } from '@/db';
import { asc } from 'drizzle-orm';
import { DEFAULT_SOFIA_PROFILES } from '@/lib/rr-defaults';
import SofiaProfileEditor from './SofiaProfileEditor';

export const metadata = { title: 'Configurações Operacionais · Hub RR' };
export const dynamic = 'force-dynamic';

async function loadProfiles() {
  if (!db) return [];
  for (const profile of DEFAULT_SOFIA_PROFILES) {
    await db.insert(sofiaResponseProfiles).values(profile).onConflictDoNothing();
  }
  return db.select().from(sofiaResponseProfiles).orderBy(asc(sofiaResponseProfiles.audience));
}

export default async function SettingsPage() {
  const profiles = await loadProfiles();
  return <div className="space-y-8 max-w-6xl">
    <div>
      <h1 className="text-2xl font-black text-slate-100 tracking-tight flex items-center gap-2">Configurações Operacionais da RR <Settings className="w-5 h-5 text-cyan-400" /></h1>
      <p className="text-sm text-slate-400">Perfis da Sofia, equipes, frotas, equipamentos e termos operacionais.</p>
    </div>

    <section className="rounded-2xl border border-cyan-900/70 bg-cyan-950/20 p-5">
      <div className="flex items-center gap-2 text-sm font-bold text-cyan-300 mb-2"><Bot className="w-4 h-4"/> Prompts e consultas iniciais da Sofia</div>
      <p className="text-xs text-slate-300 leading-relaxed mb-5">Configure como a Sofia atende cada público: Rafael/admin, profissionais da RR, leads e clientes. Estes campos são a base para roteamento seguro, consulta de contexto e bloqueio de dados sensíveis.</p>
      <SofiaProfileEditor profiles={profiles as any} />
    </section>

    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card icon={<Users className="w-4 h-4"/>} title="Equipes de Atendimento" lines={[['Equipe Alpha (Hidrojato)','Líder: Leonardo Santos'],['Equipe Bravo (Vácuo)','Líder: Rafael (Operador Master)']]}/>
      <Card icon={<Truck className="w-4 h-4"/>} title="Frota Própria RR" lines={[['Caminhão Vácuo Heavy','Capacidade: 10m³ • Esgotamento'],['VACOL Compacto 4x4','Subsolos até 2.1m • Garagens Niterói']]}/>
      <Card icon={<Wrench className="w-4 h-4"/>} title="Equipamentos" lines={[['Hidrojato 1.500 BAR','Alta Pressão Ecológica'],['Máquina K-50 / K-500','Desentupimento Rotativo']]}/>
    </div>

    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-3">
      <div className="flex items-center gap-2 text-sm font-bold text-cyan-400"><ShieldCheck className="w-4 h-4" /> Política de Garantia Padrão</div>
      <p className="text-xs text-slate-300 leading-relaxed">A garantia padrão dos serviços de desentupimento e manutenção executados pela RR Desentupidora é de <strong>30 dias</strong>, válida desde que não seja constatado mau uso das instalações hidráulicas. Para contratos corporativos e condomínios, o período de garantia e termos específicos podem ser editados diretamente ao emitir cada recibo/laudo.</p>
    </div>
  </div>;
}

function Card({icon,title,lines}:{icon:React.ReactNode; title:string; lines:[string,string][]}){return <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-3"><div className="flex items-center gap-2 text-cyan-400 font-bold text-sm">{icon} {title}</div><div className="text-xs text-slate-300 space-y-2">{lines.map(([a,b])=><div key={a} className="p-2.5 bg-slate-950/60 rounded-xl border border-slate-800"><div className="font-bold text-slate-200">{a}</div><div className="text-[10px] text-slate-500">{b}</div></div>)}</div></div>}
