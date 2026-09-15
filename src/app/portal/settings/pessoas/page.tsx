import { redirect } from 'next/navigation'
import { ArrowLeft, UserRoundCog } from 'lucide-react'
import Link from 'next/link'
import { getCurrentLocalAccess } from '@/lib/local-access'
import PeopleAccessClient from './PeopleAccessClient'
import SettingsNav from '../SettingsNav'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Pessoas e Acessos · Hub RR' }

export default async function PeopleAccessPage() {
  const access = await getCurrentLocalAccess()
  if (!access) redirect('/portal/login?from=/portal/settings/pessoas')
  if (!access.permissions.includes('people.manage')) redirect('/portal/settings')
  return <div className="mx-auto max-w-6xl space-y-6"><div><Link href="/portal/settings" className="inline-flex items-center gap-2 text-xs font-bold text-cyan-400 hover:text-cyan-300"><ArrowLeft className="h-4 w-4" /> Voltar para configurações</Link><div className="mt-4 flex items-center gap-2"><h1 className="text-2xl font-black tracking-tight text-slate-100">Pessoas e Acessos</h1><UserRoundCog className="h-5 w-5 text-violet-400" /></div><p className="mt-1 text-sm text-slate-400">Administre somente os usuários locais e permissões deste Hub RRD.</p></div><SettingsNav /><PeopleAccessClient currentUserId={access.id} currentUserRole={access.role} /></div>
}
