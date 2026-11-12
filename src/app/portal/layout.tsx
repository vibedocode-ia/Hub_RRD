import Link from 'next/link';
import { redirect } from 'next/navigation';
import Image from 'next/image';
import { getSessionUser } from '@/lib/auth';
import { 
  LayoutDashboard, 
  Users, 
  ClipboardList, 
  FileText, 
  MessageSquareCode, 
  Settings, 
  Wrench,
  ShieldCheck,
  Package,
  CircleDollarSign,
  Briefcase,
  Pencil
} from 'lucide-react';
import LogoutButton from './components/LogoutButton';
import MobileBottomNav from './components/MobileBottomNav';
import { VERSION } from '@/lib/version';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Hub RR — Gestão Operacional 24h',
};

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();

  if (!user) redirect('/portal/login');

  const navItems = [
    { section: 'Visão geral', label: 'Dashboard', href: '/portal/dashboard', icon: LayoutDashboard },
    { section: 'Operação', label: 'CRM Clientes', href: '/portal/crm', icon: Users },
    { section: 'Operação', label: 'Leads', href: '/portal/leads', icon: Users },
    { section: 'Operação', label: 'Contatos', href: '/portal/contatos', icon: Users },
    { section: 'Operação', label: 'Agenda', href: '/portal/agenda', icon: ClipboardList },
    { section: 'Operação', label: 'Chamados', href: '/portal/chamados', icon: ClipboardList },
    { section: 'Operação', label: 'Serviços', href: '/portal/servicos', icon: Wrench },
    { section: 'Operação', label: 'Equipes e Frotas', href: '/portal/operacional', icon: Briefcase },
    { section: 'Operação', label: 'Estoque', href: '/portal/estoque', icon: Package },
    { section: 'Gestão', label: 'Propostas', href: '/portal/propostas', icon: FileText },
    { section: 'Gestão', label: 'Financeiro', href: '/portal/financeiro', icon: CircleDollarSign },
    { section: 'Gestão', label: 'Documentos', href: '/portal/documentos', icon: FileText },
    { section: 'Sofia', label: 'Rascunhos Sofia', href: '/portal/sofia-drafts', icon: MessageSquareCode },
    ...(process.env.ACCESS_V1_ENABLED === 'true' ? [{ section: 'Sistema', label: 'Pessoas e acessos', href: '/acessos', icon: ShieldCheck }] : []),
    { section: 'Sistema', label: 'Meu perfil', href: '/portal/perfil', icon: Users },
    { section: 'Sistema', label: 'Configurações', href: '/portal/settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col font-sans selection:bg-cyan-500/20 selection:text-cyan-200">
      {/* Top Bar Corporativa */}
      <header className="sticky top-0 z-50 flex items-center justify-between border-b border-white/[0.08] bg-zinc-950/80 px-4 sm:px-6 py-2.5 backdrop-blur-md shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]">
        <div className="flex items-center gap-4">
          <Link href="/portal/dashboard" className="relative flex items-center gap-2 group">
            <div className="relative w-32 h-8">
              <Image
                src="/assets/logo-horizontal.png"
                alt="RR Desentupidora"
                fill
                className="object-contain"
                priority
              />
            </div>
          </Link>
          <div className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-zinc-900/80 px-2.5 py-0.5 text-[11px] font-mono text-zinc-400">
            <span className="size-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
            <span>Hub Operacional</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/portal/perfil"
            aria-label="Abrir meu perfil para editar"
            title="Editar meu perfil"
            className="group flex items-center gap-2.5 rounded-md border border-white/[0.06] bg-zinc-900/50 px-2.5 py-1.5 transition-all hover:border-white/[0.15] hover:bg-zinc-900"
          >
            {user.photoUrl ? (
              <img
                src={user.photoUrl}
                alt="Foto de perfil"
                className="size-7 rounded-full object-cover ring-1 ring-white/20"
              />
            ) : (
              <div className="flex size-7 items-center justify-center rounded-full bg-zinc-800 text-xs font-semibold text-zinc-200 border border-white/[0.08]">
                {user.name.slice(0, 1).toUpperCase()}
              </div>
            )}
            <div className="text-right hidden sm:block">
              <div className="flex items-center justify-end gap-1 text-xs font-medium text-zinc-200 group-hover:text-white">
                {user.name}
                <Pencil className="size-2.5 text-zinc-500 opacity-0 transition group-hover:opacity-100" />
              </div>
              <div className="text-[10px] font-mono text-zinc-500">
                {user.jobTitle || user.role}
              </div>
            </div>
          </Link>
          <div className="h-4 w-px bg-white/[0.08] hidden sm:block" />
          <LogoutButton />
        </div>
      </header>

      <div className="flex flex-1">
        {/* Sidebar Compacta Titanium */}
        <aside className="w-56 bg-zinc-950/60 border-r border-white/[0.08] p-3 hidden md:flex flex-col justify-between shrink-0">
          <nav className="space-y-0.5">
            {navItems.map((item, index) => {
              const Icon = item.icon;
              const isFirstInSection = index === 0 || navItems[index - 1].section !== item.section;

              return (
                <div key={item.href}>
                  {isFirstInSection && (
                    <div className="px-2.5 pb-1 pt-3 text-[10px] font-mono font-medium uppercase tracking-wider text-zinc-500">
                      {item.section}
                    </div>
                  )}
                  <Link
                    href={item.href}
                    className="group flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-zinc-400 transition-colors hover:bg-white/[0.04] hover:text-zinc-100"
                  >
                    <Icon className="size-3.5 text-zinc-500 transition-colors group-hover:text-zinc-300" />
                    <span>{item.label}</span>
                  </Link>
                </div>
              );
            })}
          </nav>

          <div className="rounded-lg border border-white/[0.06] bg-zinc-900/40 p-2.5 text-xs text-zinc-400 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03)]">
            <div className="font-medium text-zinc-300 text-[11px] flex items-center justify-between">
              <span>Operação RR 24h</span>
              <span className="size-1.5 rounded-full bg-emerald-400" />
            </div>
            <div className="text-[10px] text-zinc-500 mt-0.5">Niterói e Região</div>
            <div className="mt-1.5 font-mono text-[9px] text-zinc-600 border-t border-white/[0.04] pt-1">
              Versão {VERSION}
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 p-4 pb-28 sm:p-6 sm:pb-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>

      <MobileBottomNav accessEnabled={process.env.ACCESS_V1_ENABLED === 'true'} />
    </div>
  );
}
