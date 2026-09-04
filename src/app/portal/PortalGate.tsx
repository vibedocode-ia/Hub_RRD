'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Unlock, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { VERSION } from '@/lib/version';

const DEMO_PASS = process.env.NEXT_PUBLIC_DEMO_HUB_PASS || 'rrd2026';
const MAX_ATTEMPTS = 3;
const LOCKOUT_SECONDS = 30;

export default function PortalGate() {
  const [pass, setPass]         = useState('');
  const [showPass, setShowPass] = useState(false);
  const [status, setStatus]     = useState<'idle' | 'success' | 'error'>('idle');
  const [attempts, setAttempts] = useState(0);
  const [lockout, setLockout]   = useState(0);
  const [shaking, setShaking]   = useState(false);
  const inputRef                = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (lockout <= 0) return;
    const t = setTimeout(() => setLockout(l => l - 1), 1000);
    return () => clearTimeout(t);
  }, [lockout]);

  useEffect(() => { inputRef.current?.focus(); }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (lockout > 0) return;

    if (pass === DEMO_PASS) {
      setStatus('success');
    } else {
      const next = attempts + 1;
      setAttempts(next);
      setStatus('error');
      setPass('');
      setShaking(true);
      setTimeout(() => setShaking(false), 550);
      if (next >= MAX_ATTEMPTS) setLockout(LOCKOUT_SECONDS);
    }
  }

  const isLocked  = lockout > 0;
  const isSuccess = status === 'success';

  if (isSuccess) {
    return (
      <main className="min-h-screen bg-[#050d1a] flex items-center justify-center p-6 grid-bg relative overflow-hidden"
        style={{ fontFamily: 'var(--font-jakarta), sans-serif' }}>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-15 blur-[120px] pointer-events-none"
          style={{ background: 'radial-gradient(circle, #16a36a 0%, transparent 70%)' }} />
        <motion.div initial={{ opacity: 0, scale: .9 }} animate={{ opacity: 1, scale: 1 }}
          className="glass-strong relative rounded-3xl p-10 w-full max-w-md text-center border border-emerald-400/20">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: .15, type: 'spring', stiffness: 220 }}>
            <Unlock className="mx-auto h-16 w-16 text-emerald-400 mb-6" />
          </motion.div>
          <h1 className="text-2xl font-bold text-[#f1f5fb]" style={{ fontFamily: 'var(--font-outfit)' }}>Acesso autorizado</h1>
          <p className="mt-3 text-white/60 text-sm leading-relaxed">
            Bem-vindo ao <strong className="text-white/85">Hub RRD</strong>.<br />
            Os módulos operacionais estão sendo construídos — CRM, secretária de documentos e gestão de equipes chegam nas próximas fases.
          </p>
          <p className="mt-4 text-xs text-white/35 font-mono">{VERSION}</p>
          <Link href="/" className="mt-6 inline-flex items-center gap-2 text-sm text-[#10acf0] hover:text-cyan-300 transition-colors">
            <ArrowLeft className="h-4 w-4" /> Voltar ao site
          </Link>
        </motion.div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#050d1a] flex items-center justify-center p-6 grid-bg relative overflow-hidden"
      style={{ fontFamily: 'var(--font-jakarta), sans-serif' }}>

      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full opacity-10 blur-[140px] pointer-events-none"
        style={{ background: 'radial-gradient(circle, #10acf0 0%, transparent 70%)' }} />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full opacity-8 blur-[100px] pointer-events-none"
        style={{ background: 'radial-gradient(circle, #1918eb 0%, transparent 70%)' }} />

      <div className="w-full max-w-md">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8">
          <Image src="/assets/rr-logo.webp" alt="RR" width={64} height={64} className="h-16 w-auto mx-auto mb-4" unoptimized />
          <h1 className="text-xl font-bold text-[#f1f5fb]" style={{ fontFamily: 'var(--font-outfit)' }}>RR Desentupidora</h1>
          <p className="text-xs text-white/40 mt-1 uppercase tracking-widest">Hub RRD · Acesso Restrito</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .1 }}
          className="glass-strong rounded-3xl p-8 border border-white/8">

          <div className="flex justify-center mb-7">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-400/20 to-indigo-500/20 border border-cyan-300/25 flex items-center justify-center">
              <Lock className="h-7 w-7 text-[#10acf0]" />
            </div>
          </div>

          <h2 className="text-center text-lg font-semibold text-[#f1f5fb] mb-1" style={{ fontFamily: 'var(--font-outfit)' }}>
            Acesso ao Hub RRD
          </h2>
          <p className="text-center text-sm text-white/45 mb-7">Entre com a senha para acessar o sistema.</p>

          <form onSubmit={handleSubmit}>
            <div className={`relative mb-4 ${shaking ? 'shake' : ''}`}>
              <input
                ref={inputRef}
                type={showPass ? 'text' : 'password'}
                value={pass}
                onChange={e => { setPass(e.target.value); if (status === 'error') setStatus('idle'); }}
                placeholder="••••••••"
                disabled={isLocked}
                autoComplete="current-password"
                className="w-full bg-white/5 border rounded-2xl px-5 py-3.5 text-[#f1f5fb] placeholder-white/25 pr-12 text-sm outline-none transition-all"
                style={{
                  borderColor: status === 'error' && !shaking ? 'rgba(229,57,53,.5)' : 'rgba(120,160,210,.2)',
                  boxShadow: status === 'error' ? '0 0 0 3px rgba(229,57,53,.15)' : 'none',
                }}
              />
              <button type="button" onClick={() => setShowPass(!showPass)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/35 hover:text-white/65 transition-colors"
                aria-label={showPass ? 'Ocultar senha' : 'Mostrar senha'}>
                {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            <AnimatePresence>
              {status === 'error' && !isLocked && (
                <motion.p initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="text-sm mb-4 text-red-400 text-center">
                  Senha incorreta. Tente novamente.
                </motion.p>
              )}
              {isLocked && (
                <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
                  className="text-sm mb-4 text-amber-400 text-center border border-amber-400/25 rounded-xl px-4 py-2.5">
                  Muitas tentativas. Aguarde <strong className="text-amber-300">{lockout}s</strong> para tentar novamente.
                </motion.div>
              )}
            </AnimatePresence>

            <button type="submit" disabled={isLocked || pass.length === 0}
              className="btn-cyan w-full py-3.5 rounded-2xl font-semibold text-white text-sm disabled:opacity-40 disabled:cursor-not-allowed">
              {isLocked ? `Aguarde ${lockout}s...` : 'Entrar'}
            </button>
          </form>

          <p className="text-center text-xs text-white/28 mt-6">Acesso exclusivo RR Desentupidora</p>
        </motion.div>

        <div className="text-center mt-6">
          <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-white/35 hover:text-[#10acf0] transition-colors">
            <ArrowLeft className="h-3 w-3" /> Voltar ao site
          </Link>
          <p className="text-xs text-white/20 font-mono mt-2">{VERSION}</p>
        </div>
      </div>
    </main>
  );
}
