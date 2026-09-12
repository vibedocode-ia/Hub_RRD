import Link from 'next/link';
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
  LogOut, 
  ShieldCheck,
  Package,
  CircleDollarSign,
  Briefcase
} from 'lucide-react';
import LogoutButton from './components/LogoutButton';
import MobileBottomNav from './components/MobileBottomNav';

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

  // Se não houver sessão ativa (ex: no login), renderiza apenas os filhos
  if (!user) {
    return <>{children}</>;
  }

  const navItems = [
    { section: 'Visão geral', label: 'Dashboard', href: '/portal/dashboard', icon: LayoutDashboard },
    { section: 'Operação', label: 'CRM', href: '/portal/crm', icon: Users },
    { section: 'Operação', label: 'Chamados', href: '/portal/chamados', icon: ClipboardList },
    { section: 'Operação', label: 'Equipes e Frotas', href: '/portal/operacional', icon: Briefcase },
    { section: 'Operação', label: 'Estoque', href: '/portal/estoque', icon: Package },
    { section: 'Gestão', label: 'Financeiro', href: '/portal/financeiro', icon: CircleDollarSign },
    { section: 'Gestão', label: 'Documentos', href: '/portal/documentos', icon: FileText },
    { section: 'Sofia', label: 'Rascunhos Sofia', href: '/portal/sofia-drafts', icon: MessageSquareCode },
    { section: 'Sistema', label: 'Configurações', href: '/portal/settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-[#050d1a] text-slate-100 flex flex-col font-sans">
      {/* Top Bar */}
      <header className="bg-slate-900/90 border-b border-slate-800 backdrop-blur-md sticky top-0 z-50 px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/portal/dashboard" className="relative w-36 h-9">
            <Image
              src="/assets/logo-horizontal.png"
              alt="RR Desentupidora"
              fill
              className="object-contain"
            />
          </Link>
          <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-500/40 text-cyan-400 text-xs font-semibold">
            <ShieldCheck className="w-3.5 h-3.5" /> Hub RR Operacional
          </span>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <div className="text-xs font-bold text-slate-200">{user.name}</div>
            <div className="text-[10px] text-cyan-400 font-mono">({user.role}) {user.phone}</div>
          </div>
          <LogoutButton />
        </div>
      </header>

      <div className="flex flex-1">
        {/* Sidebar */}
        <aside className="w-64 bg-slate-900/50 border-r border-slate-800/80 p-4 hidden md:flex flex-col justify-between shrink-0">
          <nav className="space-y-1">
            {navItems.map((item, index) => {
              const Icon = item.icon;
              return (
                <div key={item.href}>
                  {(index === 0 || navItems[index - 1].section !== item.section) && <div className="px-3 pb-1 pt-4 text-[10px] font-bold uppercase tracking-wider text-slate-500">{item.section}</div>}
                  <Link
                    href={item.href}
                    className="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-slate-800/60 hover:text-cyan-400"
                  >
                    <Icon className="h-4 w-4 text-slate-400 transition group-hover:text-cyan-400" />
                    {item.label}
                  </Link>
                </div>
              );
            })}
          </nav>

          <div className="p-3 bg-slate-950/60 border border-slate-800/60 rounded-xl text-xs text-slate-400">
            <div className="font-semibold text-slate-200 mb-1">Operação RR 24h</div>
            <div className="text-[11px] text-slate-400">Niterói e Região Metropolitana</div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 p-4 pb-28 sm:p-6 sm:pb-6 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
      <MobileBottomNav />
    </div>
  );
}
