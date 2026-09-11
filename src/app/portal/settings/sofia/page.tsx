import { asc } from 'drizzle-orm'
import { Bot, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { db, sofiaResponseProfiles } from '@/db'
import { DEFAULT_SOFIA_PROFILES } from '@/lib/rr-defaults'
import SofiaProfileEditor from '../SofiaProfileEditor'
import SettingsNav from '../SettingsNav'

export const metadata = { title: 'Configuração da Sofia · Hub RR' }
export const dynamic = 'force-dynamic'

async function loadProfiles() {
  if (!db) return []
  for (const profile of DEFAULT_SOFIA_PROFILES) await db.insert(sofiaResponseProfiles).values(profile).onConflictDoNothing()
  return db.select().from(sofiaResponseProfiles).orderBy(asc(sofiaResponseProfiles.audience))
}

export default async function SofiaSettingsPage() {
  const profiles = await loadProfiles()
  return <div className="mx-auto max-w-6xl space-y-6">
    <div><Link href="/portal/settings" className="inline-flex items-center gap-2 text-xs font-bold text-cyan-400 hover:text-cyan-300"><ArrowLeft className="h-4 w-4" /> Voltar para configurações</Link><div className="mt-4 flex items-center gap-2"><h1 className="text-2xl font-black tracking-tight text-slate-100">Configuração da Sofia</h1><Bot className="h-5 w-5 text-cyan-400" /></div><p className="mt-1 text-sm text-slate-400">Defina como a Sofia atende cada público e quais dados pode consultar ou responder.</p></div>
    <SettingsNav />
    <section className="rounded-2xl border border-cyan-900/70 bg-cyan-950/20 p-5"><div className="mb-2 text-sm font-bold text-cyan-300">Perfis de atendimento</div><p className="mb-5 text-xs leading-relaxed text-slate-300">Cada perfil possui contexto, campos de identificação, instruções de resposta e limites de dados. A Central Sofia continua responsável pela identidade global, números e grants.</p><SofiaProfileEditor profiles={profiles as any} /></section>
  </div>
}
