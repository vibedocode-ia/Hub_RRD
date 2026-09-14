import Link from 'next/link'
import { Settings, Bot, UserRoundCog, Users, Truck, Wrench, ShieldCheck } from 'lucide-react'
import SettingsNav from './SettingsNav'

export const metadata = { title: 'Configurações · Hub RR' }
export const dynamic = 'force-dynamic'

const cards = [
  { href: '/portal/settings/sofia', title: 'Sofia', description: 'Perfis de atendimento, contexto, dados permitidos e respostas.', icon: Bot, tone: 'border-cyan-800/70 bg-cyan-950/20' },
  { href: '/portal/settings/pessoas', title: 'Acessos', description: 'Pessoas locais, papéis, permissões e sessões do Hub RRD.', icon: UserRoundCog, tone: 'border-violet-800/70 bg-violet-950/20' },
  { href: '/portal/settings/google', title: 'Google do Hub', description: 'Gmail operacional, Calendar e futuras integrações com Drive e Contacts.', icon: Settings, tone: 'border-sky-800/70 bg-sky-950/20' },
  { href: '/portal/operacional#equipes', title: 'Equipes', description: 'Equipes de campo, líderes, contatos e disponibilidade.', icon: Users, tone: 'border-emerald-800/70 bg-emerald-950/20' },
  { href: '/portal/operacional#frotas', title: 'Frotas', description: 'Veículos, placas, checklists e disponibilidade operacional.', icon: Truck, tone: 'border-amber-800/70 bg-amber-950/20' },
  { href: '/portal/operacional#equipamentos', title: 'Equipamentos', description: 'Recursos técnicos e status de uso na operação.', icon: Wrench, tone: 'border-blue-800/70 bg-blue-950/20' },
]

export default function SettingsPage() {
  return <div className="mx-auto max-w-6xl space-y-6">
    <header>
      <div className="flex items-center gap-2"><h1 className="text-2xl font-black tracking-tight text-slate-100">Configurações</h1><Settings className="h-5 w-5 text-cyan-400" /></div>
      <p className="mt-1 text-sm text-slate-400">Organize as regras do sistema e os recursos da operação RR por área.</p>
    </header>
    <SettingsNav />
    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map(({ href, title, description, icon: Icon, tone }) => <Link key={title} href={href} className={`group rounded-2xl border p-5 transition hover:-translate-y-0.5 hover:border-cyan-500/70 hover:bg-slate-800/70 ${tone}`}><div className="flex items-start justify-between"><span className="rounded-xl bg-slate-950/60 p-2.5 text-cyan-300"><Icon className="h-5 w-5" /></span><span className="text-xs font-bold text-slate-500 transition group-hover:text-cyan-300">ABRIR →</span></div><h2 className="mt-5 text-base font-black text-slate-100">{title}</h2><p className="mt-1 text-xs leading-relaxed text-slate-400">{description}</p></Link>)}
    </section>
    <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5"><div className="flex items-center gap-2 text-sm font-bold text-cyan-300"><ShieldCheck className="h-4 w-4" /> Princípios de configuração</div><div className="mt-3 grid gap-2 text-xs text-slate-400 sm:grid-cols-3"><p>Identidade e acessos locais ficam no Hub RRD.</p><p>A Central Sofia continua autoridade de números e grants.</p><p>Alterações sensíveis exigem permissão server-side.</p></div></section>
  </div>
}
