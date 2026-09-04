'use client';

import { useState } from 'react';
import Link from 'next/link';
import { VERSION } from '@/lib/version';

// ⚠️ EXEMPLO TEMPORÁRIO: senha em memória apenas para o placeholder do MVP visual.
// A autenticação real do Hub virá com backend/banco (Next + Drizzle) na Fase de Hub.
const DEMO_OK = process.env.NEXT_PUBLIC_DEMO_HUB_PASS || 'rrd2026';

export default function PortalGate() {
  const [pass, setPass] = useState('');
  const [ok, setOk] = useState(false);
  const [err, setErr] = useState(false);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pass === DEMO_OK) {
      setOk(true);
      setErr(false);
    } else {
      setErr(true);
      setOk(false);
    }
  }

  if (ok) {
    return (
      <main className="bg-rr-gradient" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', padding: '2rem' }}>
        <div style={{ textAlign: 'center', maxWidth: 460 }}>
          <h1>Acesso autorizado ✅</h1>
          <p>Você entrou no <strong>Hub RRD (RR Gestão Inteligente)</strong>.</p>
          <p style={{ opacity: .85 }}>Esta área está em construção nesta versão {VERSION} — os primeiros módulos (CRM de clientes/leads e a secretária que gera orçamentos, recibos e laudos via WhatsApp) entram nas próximas fases.</p>
          <Link href="/" style={{ color: '#fff', textDecoration: 'underline' }}>← Voltar ao site</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="bg-rr-gradient" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
      <form onSubmit={submit} style={{ background: '#fff', borderRadius: 16, padding: '2.4rem', width: '100%', maxWidth: 400, boxShadow: '0 20px 60px rgba(0,0,0,.25)' }}>
        <h1 style={{ color: 'var(--rr-navy)', marginTop: 0 }}>Acesso ao Hub RRD</h1>
        <p style={{ color: '#5a6270', fontSize: '.95rem', marginTop: -8 }}>
          Entre com a senha para acessar o sistema da RR.
        </p>
        <input
          type="password"
          value={pass}
          autoFocus
          onChange={(e) => setPass(e.target.value)}
          placeholder="Senha de acesso"
          style={{ width: '100%', padding: '.8rem', borderRadius: 8, border: '1px solid #ccd4e0', margin: '1rem 0 .6rem', fontSize: '1rem' }}
        />
        {err && <p style={{ color: '#c0392b', fontSize: '.85rem', marginBottom: '.6rem' }}>Senha incorreta. Tente novamente.</p>}
        <button type="submit" className="bg-rr-navy" style={{ color: '#fff', width: '100%', padding: '.85rem', borderRadius: 8, fontWeight: 700, border: 'none', cursor: 'pointer' }}>
          Entrar
        </button>
        <p style={{ textAlign: 'center', fontSize: '.78rem', color: '#9aa1ad', marginTop: '1.2rem' }}>
          VibeDoCode · RR Desentupidora <span style={{ fontFamily: 'monospace' }}>{VERSION}</span>
        </p>
      </form>
    </main>
  );
}
