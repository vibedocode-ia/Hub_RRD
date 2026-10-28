'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Phone, MessageCircle } from 'lucide-react';

const TOTAL_FRAMES = 240;
const FASES = [
  { from: 0, ate: 0.3, linha1: 'Seu encanamento entupiu?', linha2: 'A gente resolve sem transtorno.' },
  { from: 0.3, ate: 0.65, linha1: 'Chegamos em até 40 min', linha2: 'em Niterói, São Gonçalo e Região.' },
  { from: 0.65, ate: 1.001, linha1: '+15 anos de excelência', linha2: '380+ avaliações 5 estrelas.' },
];

interface HeroInterativoProps {
  waLink: string;
  phoneTel: string;
}

export default function HeroInterativo({ waLink, phoneTel }: HeroInterativoProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pctRef = useRef<HTMLSpanElement>(null);
  const barraRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const [faseIdx, setFaseIdx] = useState(0);
  const [scrubAtivo, setScrubAtivo] = useState(true);
  const [assets, setAssets] = useState<'frames' | 'video' | 'poster' | 'nenhum'>('nenhum');

  const scrubAtivoRef = useRef(true);
  const targetRef = useRef(0);
  const currentRef = useRef(0);
  const ultimaFase = useRef(-1);
  const acumulo = useRef(0);
  const touchY = useRef<number | null>(null);
  const frames = useRef<HTMLImageElement[]>([]);
  const carregados = useRef(0);

  useEffect(() => { scrubAtivoRef.current = scrubAtivo; }, [scrubAtivo]);

  // ---- detectar assets ----
  useEffect(() => {
    let vivo = true;
    const testar = async () => {
      const img = new Image();
      const okFrames = await new Promise<boolean>((res) => {
        img.onload = () => res(true);
        img.onerror = () => res(false);
        img.src = '/frames/hero/0001.webp';
      });
      if (!vivo) return;
      if (okFrames) {
        setAssets('frames');
        const arr: HTMLImageElement[] = [];
        for (let i = 1; i <= TOTAL_FRAMES; i++) {
          const im = new Image();
          im.src = `/frames/hero/${String(i).padStart(4, '0')}.webp`;
          if (i <= 48) im.onload = () => { carregados.current++; };
          arr.push(im);
        }
        frames.current = arr;
        return;
      }
      const okVideo = await fetch('/videos/hero.mp4', { method: 'HEAD' })
        .then((r) => r.ok).catch(() => false);
      if (!vivo) return;
      if (okVideo) { setAssets('video'); return; }
      setAssets('nenhum');
    };
    testar();
    return () => { vivo = false; };
  }, []);

  // ---- loop de render do canvas ----
  useEffect(() => {
    let raf = 0;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const desenhar = (p: number) => {
      const f = frames.current;
      if (!f.length) return;
      const idx = Math.min(f.length - 1, Math.max(0, Math.floor(p * (f.length - 1))));
      const img = f[idx];
      if (!img?.complete || !img.naturalWidth) return;
      const escala = Math.max(canvas.width / img.naturalWidth, canvas.height / img.naturalHeight);
      const w = img.naturalWidth * escala;
      const h = img.naturalHeight * escala;
      ctx.drawImage(img, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);
    };

    const primeiro = frames.current[0];
    if (primeiro?.complete && primeiro.naturalWidth) desenhar(0);
    else if (primeiro) primeiro.onload = () => desenhar(0);

    const tick = () => {
      currentRef.current += (targetRef.current - currentRef.current) * 0.08;
      const p = currentRef.current;
      desenhar(p);
      if (pctRef.current) pctRef.current.textContent = `${Math.round(p * 100)}%`;
      if (barraRef.current) barraRef.current.style.height = `${p * 100}%`;
      const i = FASES.findIndex((fa) => p >= fa.from && p < fa.ate);
      if (i !== -1 && i !== ultimaFase.current) { ultimaFase.current = i; setFaseIdx(i); }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [assets]);

  // ---- entrada wheel & touch ----
  useEffect(() => {
    const FIM = 0.995;
    const DISTANCIA_ALVO = 2500;

    const aplicarDelta = (delta: number) => {
      const p = Math.max(currentRef.current, targetRef.current);
      const descendo = delta > 0;
      const passo = delta / DISTANCIA_ALVO;
      if (p < FIM) {
        targetRef.current = Math.max(0, Math.min(1, targetRef.current + passo));
        return;
      }
      if (descendo) {
        acumulo.current += delta;
        if (acumulo.current > 160) { acumulo.current = 0; setScrubAtivo(false); }
      } else {
        acumulo.current = 0;
        targetRef.current = Math.max(0, targetRef.current + passo);
      }
    };

    const onWheel = (e: WheelEvent) => {
      if (!scrubAtivoRef.current) return;
      e.preventDefault();
      aplicarDelta(e.deltaY);
    };
    const onTouchStart = (e: TouchEvent) => {
      if (!scrubAtivoRef.current) { touchY.current = null; return; }
      touchY.current = e.touches[0]?.clientY ?? null;
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!scrubAtivoRef.current) return;
      const y = e.touches[0]?.clientY;
      if (y == null || touchY.current == null) return;
      const delta = touchY.current - y;
      touchY.current = y;
      if (delta === 0) return;
      e.preventDefault();
      aplicarDelta(delta);
    };
    const onTouchEnd = () => { touchY.current = null; };

    window.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, []);

  // ---- resize canvas ----
  useEffect(() => {
    if (assets !== 'frames') return;
    const c = canvasRef.current;
    if (!c) return;
    const resize = () => {
      c.width = window.innerWidth;
      c.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [assets]);

  const fase = FASES[faseIdx];

  const avancarScrubOuRolar = () => {
    if (currentRef.current < 0.95) {
      targetRef.current = Math.min(1, targetRef.current + 0.35);
    } else {
      setScrubAtivo(false);
      const el = document.getElementById('servicos') || document.getElementById('diferenciais');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
      else window.scrollBy({ top: window.innerHeight * 0.8, behavior: 'smooth' });
    }
  };

  return (
    <section id="topo" className="relative h-[100dvh] w-full overflow-hidden bg-[#050d1a]">
      {/* Fundo Interativo: Frames ou Vídeo */}
      {assets === 'frames' && <canvas ref={canvasRef} className="absolute inset-0 h-full w-full object-cover" />}
      {assets === 'video' && (
        <video
          ref={videoRef}
          className="absolute inset-0 h-full w-full object-cover"
          src="/videos/hero.mp4"
          autoPlay muted loop playsInline preload="auto"
        />
      )}
      {assets === 'nenhum' && <div className="absolute inset-0 bg-gradient-to-br from-[#050d1a] via-[#092244] to-[#01142a]" />}

      {/* Overlays em tons azulados */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#050d1a] via-[#050d1a]/50 to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 left-0 w-full bg-gradient-to-r from-[#050d1a]/95 via-[#050d1a]/60 to-transparent md:w-[65%]" />

      {/* Barra de progresso lateral em Ciano Neon */}
      <div className="absolute right-3 top-1/2 flex h-1/2 -translate-y-1/2 flex-col items-center gap-3 md:right-8 z-20">
        <span ref={pctRef} className="font-mono text-[0.72rem] tabular-nums font-bold text-cyan-300 drop-shadow-[0_0_8px_rgba(16,172,240,0.6)]">0%</span>
        <div className="relative h-full w-[2px] bg-white/20 rounded-full overflow-hidden">
          <div ref={barraRef} className="absolute top-0 w-full bg-gradient-to-b from-cyan-400 to-blue-500 shadow-[0_0_14px_rgba(16,172,240,0.95)]" style={{ height: '0%' }} />
        </div>
      </div>

      {/* Conteúdo Principal do Hero */}
      <div className="relative z-10 flex h-full flex-col justify-center px-5 pt-20 md:px-16 lg:px-24">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="mb-4 inline-flex items-center gap-2 self-start rounded-full border border-cyan-400/30 bg-cyan-950/40 px-3.5 py-1.5 backdrop-blur-md"
        >
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#10acf0]" />
          </span>
          <span className="font-mono text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-cyan-300 sm:text-xs">
            Desentupidora 24h · Niterói, SG e Região
          </span>
        </motion.div>

        <motion.h1
          key={faseIdx}
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.76, 0, 0.24, 1] }}
          className="max-w-4xl text-[2.2rem] font-black uppercase leading-[0.98] tracking-[-0.03em] text-white sm:text-5xl md:text-6xl lg:text-7xl"
        >
          {fase.linha1}
          <br />
          <span className="bg-gradient-to-r from-cyan-300 via-cyan-400 to-blue-400 bg-clip-text text-transparent drop-shadow-[0_0_24px_rgba(16,172,240,0.4)]">
            {fase.linha2}
          </span>
        </motion.h1>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.35 }}
          className="mt-8 flex w-full flex-col gap-3 sm:flex-row sm:items-center"
        >
          <a
            href={phoneTel}
            className="flex items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-[#10acf0] to-[#0A4A8F] px-7 py-4 text-base font-bold text-white shadow-[0_0_24px_rgba(16,172,240,0.45)] transition-all hover:scale-105 hover:shadow-[0_0_35px_rgba(16,172,240,0.7)] active:scale-95"
          >
            <Phone className="h-5 w-5 fill-white text-white" />
            Ligar Agora (24h)
          </a>

          <a
            href={waLink}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-2.5 rounded-xl bg-[#25D366] px-7 py-4 text-base font-bold text-white shadow-[0_0_20px_rgba(37,211,102,0.35)] transition-all hover:scale-105 hover:shadow-[0_0_30px_rgba(37,211,102,0.6)] active:scale-95"
          >
            <MessageCircle className="h-5 w-5 fill-white text-white" />
            Chamar no WhatsApp
          </a>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mt-5 flex flex-wrap items-center gap-3 text-xs md:text-sm font-medium text-white/70"
        >
          <span className="text-cyan-400 font-bold">✓</span> Sem taxa de visita
          <span className="text-white/20">•</span>
          <span className="text-cyan-400 font-bold">✓</span> Orçamento na hora
          <span className="text-white/20">•</span>
          <span className="text-cyan-400 font-bold">✓</span> Garantia por escrito de 30 dias
        </motion.p>
      </div>

      {/* Botão Interativo de Rolagem estilo Roller / Mouse Pill */}
      <div className="absolute inset-x-0 bottom-8 z-20 flex flex-col items-center justify-center gap-2">
        <button
          onClick={avancarScrubOuRolar}
          className="group flex flex-col items-center gap-2 focus:outline-none cursor-pointer"
          aria-label="Rolar para ver mais"
        >
          <div className="relative flex h-11 w-6 items-start justify-center rounded-full border-2 border-cyan-400/50 bg-[#050d1a]/80 p-1 shadow-[0_0_16px_rgba(16,172,240,0.4)] backdrop-blur-md transition-all group-hover:border-cyan-300 group-hover:scale-105 group-hover:shadow-[0_0_22px_rgba(16,172,240,0.7)]">
            <motion.div
              animate={{ y: [0, 14, 0] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
              className="h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_8px_#10acf0]"
            />
          </div>
          <span className="font-mono text-[0.68rem] font-bold uppercase tracking-[0.2em] text-cyan-300/80 transition-colors group-hover:text-cyan-200 drop-shadow-[0_0_6px_rgba(16,172,240,0.4)]">
            {scrubAtivo ? 'Role ou clique' : 'Ver mais'}
          </span>
        </button>
      </div>
    </section>
  );
}
