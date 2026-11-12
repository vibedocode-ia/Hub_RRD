'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  Wrench,
  MoreHorizontal,
  FileText,
  MessageSquareCode,
  Settings,
  Package,
  CircleDollarSign,
  Briefcase,
  LogOut,
  X,
} from 'lucide-react';

const mainItems = [
  { label: 'Início', href: '/portal/dashboard', icon: LayoutDashboard },
  { label: 'CRM', href: '/portal/crm', icon: Users },
  { label: 'Chamados', href: '/portal/chamados', icon: ClipboardList },
  { label: 'Serviços', href: '/portal/servicos', icon: Wrench },
];

const moreItems = [
  { label: 'Operação', href: '/portal/operacional', icon: Briefcase, description: 'Equipes, frotas e equipamentos' },
  { label: 'Estoque', href: '/portal/estoque', icon: Package, description: 'Insumos e movimentações' },
  { label: 'Propostas', href: '/portal/propostas', icon: FileText, description: 'Orçamentos e conversão' },
  { label: 'Leads', href: '/portal/leads', icon: Users, description: 'Pré-atendimento comercial' },
  { label: 'Financeiro', href: '/portal/financeiro', icon: CircleDollarSign, description: 'Lançamentos e documentos' },
  { label: 'Documentos', href: '/portal/documentos', icon: FileText, description: 'Recibos, OS e laudos' },
  { label: 'Rascunhos Sofia', href: '/portal/sofia-drafts', icon: MessageSquareCode, description: 'Pedidos vindos do WhatsApp' },
  { label: 'Configurações', href: '/portal/settings', icon: Settings, description: 'Sofia, acessos e operação' },
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function MobileBottomNav({ accessEnabled = false }: { accessEnabled?: boolean }) {
  const navigationMoreItems = accessEnabled
    ? [...moreItems, { label: 'Pessoas e acessos', href: '/acessos', icon: Users, description: 'Vínculos e funções deste Hub' }]
    : moreItems;
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const moreActive = navigationMoreItems.some((item) => isActive(pathname, item.href));

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => null);
    router.push('/portal/login');
    router.refresh();
  };

  return (
    <>
      {open && (
        <button
          type="button"
          aria-label="Fechar submenu"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm md:hidden"
        />
      )}

      <div
        className={`fixed inset-x-3 bottom-[80px] z-[80] rounded-2xl border border-white/[0.08] bg-zinc-950/95 p-3 shadow-2xl backdrop-blur-xl transition-all duration-200 md:hidden ${
          open ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-3 opacity-0'
        }`}
      >
        <div className="mb-2.5 flex items-center justify-between px-1">
          <div>
            <div className="text-xs font-mono font-medium uppercase tracking-wider text-zinc-300">Mais opções</div>
            <div className="text-[10px] text-zinc-500 font-mono">Hub RR Operacional</div>
          </div>
          <button
            type="button"
            aria-label="Fechar submenu"
            onClick={() => setOpen(false)}
            className="rounded-md border border-white/[0.08] bg-zinc-900 p-1.5 text-zinc-400 hover:text-white"
          >
            <X className="size-3.5" />
          </button>
        </div>

        <div className="grid gap-1.5 max-h-[60vh] overflow-y-auto">
          {navigationMoreItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors ${
                  active
                    ? 'border-cyan-500/40 bg-zinc-900 text-zinc-100 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]'
                    : 'border-white/[0.04] bg-zinc-900/50 text-zinc-300 hover:border-white/[0.1] hover:bg-zinc-900'
                }`}
              >
                <span className={`rounded-md p-1.5 ${active ? 'bg-cyan-500 text-zinc-950' : 'bg-zinc-800 text-zinc-400'}`}>
                  <Icon className="size-3.5" />
                </span>
                <span className="min-w-0">
                  <span className="block text-xs font-medium text-zinc-200">{item.label}</span>
                  <span className="block truncate text-[10px] text-zinc-500">{item.description}</span>
                </span>
              </Link>
            );
          })}
          <button
            type="button"
            onClick={logout}
            className="flex items-center gap-3 rounded-lg border border-rose-500/20 bg-rose-950/20 px-3 py-2 text-left text-rose-300 hover:bg-rose-950/30 transition-colors"
          >
            <span className="rounded-md bg-rose-950/60 p-1.5 text-rose-400"><LogOut className="size-3.5" /></span>
            <span>
              <span className="block text-xs font-medium">Sair</span>
              <span className="block text-[10px] text-rose-400/70">Encerrar sessão no celular</span>
            </span>
          </button>
        </div>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-[75] border-t border-white/[0.08] bg-zinc-950/90 px-3 pb-[calc(env(safe-area-inset-bottom)+6px)] pt-2 backdrop-blur-xl md:hidden">
        <div className="mx-auto grid max-w-md grid-cols-5 gap-1 rounded-xl border border-white/[0.08] bg-zinc-900/80 p-1 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]">
          {mainItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                aria-current={active ? 'page' : undefined}
                className={`group flex min-w-0 flex-col items-center justify-center gap-1 rounded-lg px-1 py-1.5 text-[10px] font-medium transition-all ${
                  active
                    ? 'bg-zinc-800 text-cyan-400 shadow-sm border border-white/[0.08]'
                    : 'text-zinc-400 hover:bg-white/[0.03] hover:text-zinc-200'
                }`}
              >
                <Icon className="size-4" />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label="Abrir mais opções"
            className={`group flex min-w-0 flex-col items-center justify-center gap-1 rounded-lg px-1 py-1.5 text-[10px] font-medium transition-all ${
              open || moreActive
                ? 'bg-zinc-800 text-cyan-400 shadow-sm border border-white/[0.08]'
                : 'text-zinc-400 hover:bg-white/[0.03] hover:text-zinc-200'
            }`}
          >
            <MoreHorizontal className="size-4" />
            <span>Mais</span>
          </button>
        </div>
      </nav>
    </>
  );
}
