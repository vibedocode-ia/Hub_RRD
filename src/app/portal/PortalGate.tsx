'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * PortalGate — Componente legado.
 * Redireciona para /portal/login que usa autenticação server-side segura.
 * Mantido apenas para compatibilidade de rota.
 */
export default function PortalGate() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/portal/login');
  }, [router]);

  return (
    <main
      className="min-h-screen bg-[#050d1a] flex items-center justify-center p-6"
      style={{ fontFamily: 'var(--font-jakarta), sans-serif' }}
    >
      <p className="text-white/40 text-sm">Redirecionando para login seguro...</p>
    </main>
  );
}
