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
  { label: 'Documentos', href: '/portal/documentos', icon: FileText, description: 'Orçamentos, recibos e laudos' },
  { label: 'Rascunhos Sofia', href: '/portal/sofia-drafts', icon: MessageSquareCode, description: 'Pedidos vindos do WhatsApp' },
  { label: 'Configurações', href: '/portal/settings', icon: Settings, description: 'Prompts, serviços e operação' },
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function MobileBottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const moreActive = moreItems.some((item) => isActive(pathname, item.href));

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
          className="fixed inset-0 z-[70] bg-slate-950/55 backdrop-blur-[2px] md:hidden"
        />
      )}

      <div
        className={`fixed inset-x-3 bottom-[88px] z-[80] rounded-3xl border border-cyan-500/20 bg-slate-950/95 p-3 shadow-2xl shadow-cyan-950/40 backdrop-blur-xl transition-all duration-200 md:hidden ${
          open ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-3 opacity-0'
        }`}
      >
        <div className="mb-2 flex items-center justify-between px-1">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.2em] text-cyan-300">Mais opções</div>
            <div className="text-[11px] text-slate-500">Hub RR operacional</div>
          </div>
          <button
            type="button"
            aria-label="Fechar submenu"
            onClick={() => setOpen(false)}
            className="rounded-full border border-slate-700 bg-slate-900 p-2 text-slate-300"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid gap-2">
          {moreItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 rounded-2xl border px-3 py-3 transition ${
                  active
                    ? 'border-cyan-500/50 bg-cyan-950/60 text-cyan-100'
                    : 'border-slate-800 bg-slate-900/70 text-slate-200 hover:border-cyan-700/60'
                }`}
              >
                <span className={`rounded-xl p-2 ${active ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 text-cyan-300'}`}>
                  <Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-bold">{item.label}</span>
                  <span className="block truncate text-[11px] text-slate-500">{item.description}</span>
                </span>
              </Link>
            );
          })}
          <button
            type="button"
            onClick={logout}
            className="flex items-center gap-3 rounded-2xl border border-red-900/60 bg-red-950/30 px-3 py-3 text-left text-red-200"
          >
            <span className="rounded-xl bg-red-950 p-2 text-red-300"><LogOut className="h-4 w-4" /></span>
            <span><span className="block text-sm font-bold">Sair</span><span className="block text-[11px] text-red-300/70">Encerrar sessão no celular</span></span>
          </button>
        </div>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-[75] border-t border-cyan-500/20 bg-slate-950/95 px-2 pb-[calc(env(safe-area-inset-bottom)+8px)] pt-2 shadow-2xl shadow-black/60 backdrop-blur-xl md:hidden">
        <div className="mx-auto grid max-w-md grid-cols-5 gap-1 rounded-3xl border border-slate-800 bg-slate-900/70 p-1.5">
          {mainItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                aria-current={active ? 'page' : undefined}
                className={`group flex min-w-0 flex-col items-center justify-center gap-1 rounded-2xl px-1 py-2 text-[10px] font-bold transition ${
                  active
                    ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/20'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-cyan-300'
                }`}
              >
                <Icon className={`h-5 w-5 transition ${active ? 'scale-110' : 'group-hover:scale-105'}`} />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label="Abrir mais opções"
            className={`group flex min-w-0 flex-col items-center justify-center gap-1 rounded-2xl px-1 py-2 text-[10px] font-bold transition ${
              open || moreActive
                ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/20'
                : 'text-slate-400 hover:bg-slate-800 hover:text-cyan-300'
            }`}
          >
            <MoreHorizontal className={`h-5 w-5 transition ${open || moreActive ? 'scale-110' : 'group-hover:scale-105'}`} />
            <span>Mais</span>
          </button>
        </div>
      </nav>
    </>
  );
}
