'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, Loader2 } from 'lucide-react';

export default function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/portal/login');
      router.refresh();
    } catch (error) {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-zinc-900/80 hover:bg-rose-950/40 hover:text-rose-300 text-zinc-400 text-xs font-medium border border-white/[0.08] hover:border-rose-500/30 transition-colors disabled:opacity-50"
      title="Sair do Hub RR"
    >
      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LogOut className="w-3.5 h-3.5" />}
      Sair
    </button>
  );
}
