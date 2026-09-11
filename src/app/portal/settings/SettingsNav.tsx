'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Bot, UsersRound, Users, Truck, Wrench, Settings } from 'lucide-react'

const items = [
  { label: 'Visão geral', href: '/portal/settings', icon: Settings },
  { label: 'Sofia', href: '/portal/settings/sofia', icon: Bot },
  { label: 'Acessos', href: '/portal/settings/pessoas', icon: UsersRound },
  { label: 'Equipes', href: '/portal/operacional#equipes', icon: Users },
  { label: 'Frotas', href: '/portal/operacional#frotas', icon: Truck },
  { label: 'Equipamentos', href: '/portal/operacional#equipamentos', icon: Wrench },
]

export default function SettingsNav() {
  const pathname = usePathname()
  return (
    <nav aria-label="Seções de configurações" className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/70 p-1.5 shadow-lg shadow-black/10">
      <div className="flex min-w-max gap-1">
        {items.map(({ label, href, icon: Icon }) => {
          const active = pathname === href || (label === 'Visão geral' && pathname === '/portal/settings') || (label === 'Sofia' && pathname.startsWith('/portal/settings/sofia')) || (label === 'Acessos' && pathname.startsWith('/portal/settings/pessoas'))
          return <Link key={label} href={href} aria-current={active ? 'page' : undefined} className={`inline-flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-bold transition ${active ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20' : 'text-slate-400 hover:bg-slate-800 hover:text-cyan-300'}`}><Icon className="h-4 w-4" />{label}</Link>
        })}
      </div>
    </nav>
  )
}
