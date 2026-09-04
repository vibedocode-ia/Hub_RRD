'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, useInView, useScroll, useSpring, AnimatePresence } from 'framer-motion';
import {
  Droplets, Clock, ShieldCheck, Truck, Wrench, PhoneCall, MapPin,
  CheckCircle2, Sparkles, ArrowRight, Star, Menu, X, Zap, Building2,
  Home as HomeIcon, Factory,
} from 'lucide-react';
import { VERSION } from '@/lib/version';

/* ─── Constants ─────────────────────────────────────────────────────── */
const WHATSAPP_BASE = 'https://api.whatsapp.com/send?phone=5521996699191';
const WA_DEFAULT    = `${WHATSAPP_BASE}&text=${encodeURIComponent('Olá! Vi o site da RR Desentupidora e gostaria de solicitar um orçamento.')}`;
const PHONE_TEL     = 'tel:5521996699191';
const INSTAGRAM     = 'https://www.instagram.com/rr.desentupidora';

/* ─── Framer variants ────────────────────────────────────────────────── */
const fade = {
  hidden: { opacity: 0, y: 28 },
  show: (i = 0) => ({
    opacity: 1, y: 0,
    transition: { duration: .75, delay: i * .1, ease: [0.22, 1, 0.36, 1] as const },
  }),
};
const stagger = { hidden: {}, show: { transition: { staggerChildren: .12 } } };

/* ─── Reusable Section wrapper ───────────────────────────────────────── */
function Section({ id, children, className = '' }: { id?: string; children: React.ReactNode; className?: string }) {
  const ref   = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  return (
    <section id={id} ref={ref} className={`relative ${className}`}>
      <motion.div initial="hidden" animate={inView ? 'show' : 'hidden'} variants={stagger}>
        {children}
      </motion.div>
    </section>
  );
}

/* ─── Animated Counter ───────────────────────────────────────────────── */
function Counter({ to, suffix = '' }: { to: number; suffix?: string }) {
  const ref   = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const [val, setVal] = useState(0);

  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const step = to / 40;
    const timer = setInterval(() => {
      start += step;
      if (start >= to) { setVal(to); clearInterval(timer); }
      else setVal(Math.floor(start));
    }, 35);
    return () => clearInterval(timer);
  }, [inView, to]);

  return <span ref={ref}>{val}{suffix}</span>;
}

/* ─── Data ───────────────────────────────────────────────────────────── */
const SERVICES = [
  { icon: Droplets,    t: 'Desentupimento',       d: 'Pias, ralos, vasos e caixas de gordura — residencial e predial.' },
  { icon: Truck,       t: 'Limpa Fossa & Sucção', d: 'Sucção e limpeza de fossas, caixas de esgoto e resíduos (VACOL).' },
  { icon: Wrench,      t: 'Hidrojateamento',       d: 'Jatos de alta pressão para desobstrução e limpeza industrial.' },
  { icon: Clock,       t: 'Caixa D\'água e Gordura', d: 'Limpeza e manutenção preventiva com segurança e qualidade.' },
  { icon: Sparkles,    t: 'Rede de Esgoto',        d: 'Desobstrução de colunas, redes e tubulações prediais e pluviais.' },
  { icon: ShieldCheck, t: 'Dedetização',           d: 'Controle de pragas com segurança e responsabilidade ambiental.' },
];

const DIFFS = [
  { icon: Clock,       t: 'Atendimento 24h',        d: 'Emergências de dia, de noite, fins de semana e feriados.' },
  { icon: Star,        t: '5,0 no Google',           d: 'Excelente — com base em 55 avaliações reais de clientes.' },
  { icon: ShieldCheck, t: '+7 anos',                 d: 'Experiência, equipe especializada e atendimento pontual.' },
  { icon: Truck,       t: 'Equipamentos modernos',   d: 'Maquinário compacto que resolve com menos transtorno e sujeira.' },
];

const REVIEWS = [
  { n: 'Raquel C.',           t: 'Atendimento maravilhoso! Super atenciosos e competentes, resolveram meu problema rápido. Super indico!' },
  { n: 'Fernando e Rafael',   t: 'Profissionais de primeira linha. Resolveram um problemão e ainda foram além, cuidando de detalhes que não eram com eles.' },
  { n: 'Alex A.',             t: 'Respondem rápido no WhatsApp e a equipe é muito bem preparada e pontual. Recomendo sem hesitação!' },
];

const AREAS = [
  'Santa Rosa', 'Icaraí', 'Fonseca', 'Ingá', 'Pendotiba', 'Engenhoca', 'Charitas',
  'São Gonçalo', 'Maricá', 'Itaboraí', 'Rio de Janeiro', 'Região Metropolitana',
];

const WA_SERVICES = [
  { id: 'pia',      icon: Droplets,  label: 'Pia / Ralo' },
  { id: 'vaso',     icon: Sparkles,  label: 'Vaso Sanitário' },
  { id: 'fossa',    icon: Truck,     label: 'Limpa Fossa' },
  { id: 'hidro',    icon: Wrench,    label: 'Hidrojato' },
  { id: 'caixa',    icon: Clock,     label: 'Caixa D\'água' },
  { id: 'dedet',    icon: ShieldCheck,label: 'Dedetização' },
];

/* ═══════════════════════════════════════════════════════════════════════
   PAGE COMPONENT
══════════════════════════════════════════════════════════════════════ */
export default function LandingPage() {
  /* ── scroll progress bar ── */
  const { scrollY, scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 26 });

  /* ── header opacity on scroll ── */
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const unsub = scrollY.on('change', (v) => setScrolled(v > 80));
    return unsub;
  }, [scrollY]);

  /* ── floating WA visibility ── */
  const [showFloat, setShowFloat] = useState(false);
  useEffect(() => {
    const unsub = scrollY.on('change', (v) => setShowFloat(v > 200));
    return unsub;
  }, [scrollY]);

  /* ── mobile menu ── */
  const [menuOpen, setMenuOpen] = useState(false);

  /* ── widget state ── */
  const [selService, setSelService] = useState<string | null>(null);
  const [selLocation, setSelLocation] = useState('Residencial');
  const [isUrgent, setIsUrgent] = useState(false);

  function buildWaLink() {
    const svc  = WA_SERVICES.find(s => s.id === selService)?.label ?? null;
    const txt  = svc
      ? `Olá! Preciso de ${svc} (${selLocation})${isUrgent ? ' — URGENTE 24h' : ''}. Podem me atender?`
      : 'Olá! Vi o site da RR Desentupidora e gostaria de solicitar um orçamento.';
    return `${WHATSAPP_BASE}&text=${encodeURIComponent(txt)}`;
  }

  const navLinks = [
    { href: '#servicos',    label: 'Serviços' },
    { href: '#porque',      label: 'Diferenciais' },
    { href: '#avaliacoes',  label: 'Avaliações' },
    { href: '#areas',       label: 'Áreas' },
    { href: '#contato',     label: 'Contato' },
  ];

  return (
    <main className="relative min-h-screen bg-[#050d1a] text-[#f1f5fb]" style={{ fontFamily: 'var(--font-jakarta), sans-serif' }}>

      {/* ── Progress Bar ── */}
      <motion.div
        style={{ scaleX }}
        className="fixed top-0 left-0 right-0 h-[3px] z-[70] origin-left bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-600"
      />

      {/* ═══════════════════════════════ HEADER ═════════════════════════ */}
      <header
        className="fixed top-0 w-full z-50 transition-all duration-300"
        style={{
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          background: scrolled ? 'rgba(5,13,26,.95)' : 'rgba(5,13,26,.72)',
          borderBottom: '1px solid rgba(120,160,210,.13)',
        }}
      >
        <div className="mx-auto max-w-7xl px-5 py-3 flex items-center justify-between gap-4">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <Image src="/assets/rr-logo.webp" alt="RR Desentupidora" width={44} height={44} className="h-10 w-auto" unoptimized priority />
            <span className="font-semibold tracking-tight text-[#f1f5fb]" style={{ fontFamily: 'var(--font-outfit), sans-serif' }}>
              RR Desentupidora
            </span>
          </div>

          {/* Nav desktop */}
          <nav className="hidden md:flex items-center gap-6 text-sm text-white/70">
            {navLinks.map(l => (
              <a key={l.href} href={l.href} className="hover:text-[#10acf0] transition-colors">{l.label}</a>
            ))}
            <a href={WA_DEFAULT} target="_blank" rel="noreferrer"
              className="btn-cyan text-white px-4 py-2 rounded-full text-sm font-semibold inline-flex items-center gap-1.5"
              aria-label="Chamar RR Desentupidora 24h no WhatsApp">
              <PhoneCall className="h-4 w-4" /> Chamar 24h
            </a>
            <Link href="/portal"
              className="btn-ghost px-4 py-2 rounded-full text-sm text-white/70 inline-flex items-center gap-1"
              aria-label="Acesso ao Hub RRD">
              Hub <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </nav>

          {/* Hamburger mobile */}
          <button
            className="md:hidden p-2 rounded-lg text-white/80 hover:text-[#10acf0] transition-colors"
            onClick={() => setMenuOpen(true)}
            aria-label="Abrir menu"
          >
            <Menu className="h-6 w-6" />
          </button>
        </div>
      </header>

      {/* ── Mobile Drawer ── */}
      <AnimatePresence>
        {menuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
              onClick={() => setMenuOpen(false)}
            />
            <motion.div
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed top-0 right-0 bottom-0 z-[61] w-72 glass-strong flex flex-col p-6"
            >
              <div className="flex justify-between items-center mb-8">
                <span className="font-semibold text-[#f1f5fb]" style={{ fontFamily: 'var(--font-outfit)' }}>Menu</span>
                <button onClick={() => setMenuOpen(false)} aria-label="Fechar menu" className="text-white/70 hover:text-[#10acf0] transition-colors">
                  <X className="h-6 w-6" />
                </button>
              </div>
              <nav className="flex flex-col gap-4 text-white/80">
                {navLinks.map(l => (
                  <a key={l.href} href={l.href}
                    onClick={() => setMenuOpen(false)}
                    className="text-lg hover:text-[#10acf0] transition-colors py-1 border-b border-white/5">
                    {l.label}
                  </a>
                ))}
              </nav>
              <div className="mt-auto flex flex-col gap-3">
                <a href={WA_DEFAULT} target="_blank" rel="noreferrer"
                  className="btn-cyan text-white px-5 py-3 rounded-full font-semibold inline-flex items-center justify-center gap-2">
                  <PhoneCall className="h-5 w-5" /> Chamar 24h
                </a>
                <Link href="/portal" onClick={() => setMenuOpen(false)}
                  className="btn-ghost px-5 py-3 rounded-full text-center text-white/70 text-sm">
                  Acesso ao Hub RRD
                </Link>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ═══════════════════════════════ HERO ═══════════════════════════ */}
      <section className="relative grid-bg overflow-hidden">
        {/* Glows */}
        <div className="absolute -top-40 -left-40 w-[700px] h-[700px] rounded-full opacity-20 blur-[120px] pointer-events-none"
          style={{ background: 'radial-gradient(circle, #10acf0 0%, transparent 70%)' }} />
        <div className="absolute -bottom-40 -right-20 w-[600px] h-[600px] rounded-full opacity-15 blur-[100px] pointer-events-none"
          style={{ background: 'radial-gradient(circle, #1918eb 0%, transparent 70%)' }} />
        <div className="hero-overlay absolute inset-0" />

        <div className="relative mx-auto max-w-7xl px-5 pt-36 pb-24 grid lg:grid-cols-2 gap-12 items-center">
          {/* Left */}
          <div>
            {/* Badge */}
            <motion.div variants={fade} initial="hidden" animate="show"
              className="inline-flex items-center gap-2.5 rounded-full border border-cyan-300/25 bg-cyan-300/8 px-4 py-1.5 text-sm text-cyan-200 mb-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="pulse-ring absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 pulse-dot" />
              </span>
              Atendimento 24h · Niterói e Região
            </motion.div>

            {/* H1 */}
            <motion.h1 variants={fade} initial="hidden" animate="show" custom={1}
              className="mt-4 text-4xl md:text-6xl font-extrabold leading-[1.04] tracking-tight"
              style={{ fontFamily: 'var(--font-outfit), sans-serif' }}>
              Entupiu?<br />A gente resolve{' '}
              <span className="grad-text">sem transtorno</span>.
            </motion.h1>

            {/* Subline */}
            <motion.p variants={fade} initial="hidden" animate="show" custom={2}
              className="mt-6 max-w-xl text-lg text-white/70 leading-relaxed">
              Desentupimento, limpeza de fossa e hidrojateamento com tecnologia, agilidade e o cuidado de quem trata sua casa como a própria.
              Atendemos residências, condomínios e empresas em <strong className="text-white/90">Niterói e região</strong>.
            </motion.p>

            {/* Stars */}
            <motion.div variants={fade} initial="hidden" animate="show" custom={3}
              className="mt-5 flex items-center gap-2.5 text-sm text-white/65">
              <span className="flex text-amber-400 text-base">★★★★★</span>
              <span>Excelente · <strong className="text-white/85">5,0</strong> com base em 55 avaliações no Google</span>
            </motion.div>

            {/* CTAs */}
            <motion.div variants={fade} initial="hidden" animate="show" custom={4}
              className="mt-8 flex flex-wrap gap-4">
              <a href={WA_DEFAULT} target="_blank" rel="noreferrer"
                className="btn-cyan text-white px-7 py-4 rounded-full font-semibold inline-flex items-center gap-2.5 text-base"
                aria-label="Chamar RR Desentupidora no WhatsApp">
                <PhoneCall className="h-5 w-5" /> Chamar no WhatsApp
              </a>
              <a href="#servicos"
                className="btn-ghost px-7 py-4 rounded-full font-semibold text-white/80 inline-flex items-center gap-2">
                Ver serviços <ArrowRight className="h-4 w-4" />
              </a>
            </motion.div>

            {/* Counters */}
            <motion.div variants={fade} initial="hidden" animate="show" custom={5}
              className="mt-10 flex items-center gap-8">
              {[
                { label: '+7', suffix: ' Anos',   sub: 'de experiência' },
                { label: '5,0', suffix: ' ★',     sub: 'no Google' },
                { label: '24',  suffix: '/7',      sub: 'atendimento' },
              ].map(c => (
                <div key={c.label} className="text-center">
                  <div className="text-2xl font-extrabold text-[#10acf0]" style={{ fontFamily: 'var(--font-outfit)' }}>
                    {c.label}<span className="text-white/70 text-base">{c.suffix}</span>
                  </div>
                  <div className="text-xs text-white/50 mt-0.5">{c.sub}</div>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Right — Hero Visual */}
          <motion.div
            initial={{ opacity: 0, scale: .94, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
            className="relative hidden lg:block"
          >
            {/* Glow behind card */}
            <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/25 to-indigo-600/25 blur-3xl" />
            <div className="glass-strong relative rounded-[2rem] overflow-hidden border border-cyan-300/20">
              <Image
                src="/assets/hero.png" alt="RR Desentupidora em operação"
                width={1000} height={800} className="w-full h-[400px] object-cover opacity-90" unoptimized priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#050d1a] via-transparent to-transparent" />
              {/* Badge over image */}
              <div className="absolute bottom-5 left-5 right-5">
                <div className="glass rounded-2xl px-5 py-3 flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
                  <div>
                    <div className="text-sm font-semibold">Garantia de 30 dias</div>
                    <div className="text-xs text-white/60">em todos os serviços</div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════════════ SERVIÇOS ═══════════════════════ */}
      <Section id="servicos" className="py-24">
        <div className="mx-auto max-w-7xl px-5">
          <motion.div variants={fade} className="text-center max-w-2xl mx-auto">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#10acf0]">O que fazemos</p>
            <h2 className="mt-3 text-3xl md:text-5xl font-bold" style={{ fontFamily: 'var(--font-outfit)' }}>
              Especialistas em <span className="grad-text">desentupimento</span><br className="hidden md:block" /> e manutenção
            </h2>
          </motion.div>
          <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {SERVICES.map((s, i) => (
              <motion.div key={s.t} variants={fade} custom={i}
                className="glass glass-hover rounded-3xl p-7 cursor-default">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-400/20 to-indigo-500/20 border border-cyan-300/20 flex items-center justify-center mb-5">
                  <s.icon className="h-6 w-6 text-[#10acf0]" />
                </div>
                <h3 className="text-lg font-semibold" style={{ fontFamily: 'var(--font-outfit)' }}>{s.t}</h3>
                <p className="mt-2 text-white/58 text-sm leading-relaxed">{s.d}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* ═══════════════════════════════ POR QUÊ ════════════════════════ */}
      <Section id="porque" className="py-24 bg-[#060f20] border-y border-white/5">
        <div className="mx-auto max-w-7xl px-5 grid lg:grid-cols-2 gap-14 items-start">
          {/* Left */}
          <div>
            <motion.div variants={fade}>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#10acf0]">Por que a RR</p>
              <h2 className="mt-3 text-3xl md:text-5xl font-bold leading-tight" style={{ fontFamily: 'var(--font-outfit)' }}>
                Uma empresa que vai{' '}
                <span className="grad-text">pra resolver o seu problema</span>
              </h2>
              <p className="mt-5 text-white/68 leading-relaxed max-w-md">
                Chegamos com urgência, estrutura técnica e cuidado. Executamos como se fosse na nossa própria casa — e você nunca fica sozinho durante o serviço.
              </p>
              <a href={WA_DEFAULT} target="_blank" rel="noreferrer"
                className="mt-8 inline-flex items-center gap-2 text-[#10acf0] font-semibold border-b border-[#10acf0]/30 pb-1 hover:border-[#10acf0]/70 transition-colors">
                Solicitar orçamento <ArrowRight className="h-4 w-4" />
              </a>
            </motion.div>

            {/* Cert Badges */}
            <motion.div variants={fade} custom={2} className="mt-10 flex flex-wrap gap-3">
              {[
                { src: '/images/inea.png',  label: 'INEA',  sub: 'Licença Ambiental' },
                { src: '/images/nr33.png',  label: 'NR-33', sub: 'Espaço Confinado' },
                { src: '/images/nr35.jpeg', label: 'NR-35', sub: 'Trabalho em Altura' },
              ].map(b => (
                <div key={b.label} className="cert-badge glass rounded-2xl p-4 flex items-center gap-3 border border-cyan-300/15 cursor-default">
                  <Image src={b.src} alt={b.label} width={36} height={36} className="w-9 h-9 object-contain" unoptimized />
                  <div>
                    <div className="text-sm font-bold text-[#10acf0]" style={{ fontFamily: 'var(--font-outfit)' }}>{b.label}</div>
                    <div className="text-xs text-white/50">{b.sub}</div>
                  </div>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Right — Diff cards */}
          <div className="grid gap-4">
            {DIFFS.map((d, i) => (
              <motion.div key={d.t} variants={fade} custom={i}
                className="glass glass-hover rounded-2xl p-5 flex items-start gap-4">
                <div className="w-11 h-11 shrink-0 rounded-xl bg-gradient-to-br from-cyan-400/20 to-indigo-500/20 border border-cyan-300/20 flex items-center justify-center">
                  <d.icon className="h-5 w-5 text-[#10acf0]" />
                </div>
                <div>
                  <h3 className="font-semibold" style={{ fontFamily: 'var(--font-outfit)' }}>{d.t}</h3>
                  <p className="text-sm text-white/58 mt-1">{d.d}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* ═══════════════════════════════ AVALIAÇÕES ═════════════════════ */}
      <Section id="avaliacoes" className="py-24 grid-bg">
        <div className="mx-auto max-w-7xl px-5">
          <motion.div variants={fade} className="text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#10acf0]">Reputação</p>
            <h2 className="mt-3 text-3xl md:text-5xl font-bold" style={{ fontFamily: 'var(--font-outfit)' }}>
              Quem contratou, <span className="grad-text">recomenda</span>
            </h2>
            {/* Google badge */}
            <div className="mt-5 inline-flex items-center gap-3 glass rounded-full px-5 py-2.5">
              <span className="text-amber-400 text-lg">★★★★★</span>
              <span className="text-white/80 font-semibold">5,0</span>
              <span className="text-white/50 text-sm">· 55 avaliações</span>
              <span className="flex items-center gap-1 text-emerald-400 text-xs border border-emerald-400/30 rounded-full px-2 py-0.5">
                <CheckCircle2 className="h-3 w-3" /> Verificado Google
              </span>
            </div>
          </motion.div>

          {/* Stars bar */}
          <motion.div variants={fade} custom={1} className="mt-6 flex justify-center">
            <div className="flex items-center gap-3 text-sm text-white/50">
              <span>5 ★</span>
              <div className="w-40 h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div className="h-full bg-[#10acf0] rounded-full" style={{ width: '100%' }} />
              </div>
              <span>100%</span>
            </div>
          </motion.div>

          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {REVIEWS.map((r, i) => (
              <motion.div key={i} variants={fade} custom={i}
                className="glass glass-hover rounded-3xl p-7">
                <div className="text-amber-400 mb-3">★★★★★</div>
                <p className="text-white/78 text-sm leading-relaxed">&ldquo;{r.t}&rdquo;</p>
                <p className="mt-5 text-sm font-semibold text-[#10acf0]">{r.n}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* ═══════════════════════════════ ÁREAS ══════════════════════════ */}
      <Section id="areas" className="py-20 bg-[#060f20] border-y border-white/5">
        <div className="mx-auto max-w-7xl px-5">
          <motion.div variants={fade} className="text-center mb-10">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#10acf0]">Cobertura</p>
            <h2 className="mt-3 text-3xl md:text-4xl font-bold" style={{ fontFamily: 'var(--font-outfit)' }}>
              Atendemos onde <span className="grad-text">você precisa</span>
            </h2>
            <p className="mt-3 text-white/55 text-sm">Niterói · São Gonçalo · Maricá · Itaboraí · Grande Rio</p>
          </motion.div>
          <motion.div variants={stagger} className="flex flex-wrap justify-center gap-2.5">
            {AREAS.map((a, i) => (
              <motion.span key={a} variants={fade} custom={i}
                className="area-pill border border-white/15 bg-white/5 text-white/70 rounded-full px-4 py-1.5 text-sm font-medium cursor-default">
                {a}
              </motion.span>
            ))}
          </motion.div>
        </div>
      </Section>

      {/* ═══════════════════════════════ WIDGET ORÇAMENTO ═══════════════ */}
      <Section id="simulador" className="py-24">
        <div className="mx-auto max-w-3xl px-5">
          <motion.div variants={fade} className="text-center mb-10">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#10acf0]">Atendimento rápido</p>
            <h2 className="mt-3 text-3xl md:text-4xl font-bold" style={{ fontFamily: 'var(--font-outfit)' }}>
              Qual é o seu problema?
            </h2>
            <p className="mt-2 text-white/55 text-sm">Selecione e receba um orçamento direto no WhatsApp</p>
          </motion.div>

          <motion.div variants={fade} custom={1} className="glass-strong rounded-3xl p-8">
            {/* Service picker */}
            <div className="mb-6">
              <p className="text-xs text-white/50 uppercase tracking-widest mb-3">Tipo de serviço</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {WA_SERVICES.map(s => (
                  <button
                    key={s.id}
                    onClick={() => setSelService(selService === s.id ? null : s.id)}
                    aria-pressed={selService === s.id}
                    className={`flex items-center gap-2.5 rounded-2xl px-4 py-3 text-sm font-medium border transition-all ${
                      selService === s.id
                        ? 'bg-[#10acf0] border-[#10acf0] text-[#050d1a]'
                        : 'border-white/12 bg-white/4 text-white/70 hover:border-cyan-300/35 hover:bg-white/8'
                    }`}
                  >
                    <s.icon className="h-4 w-4 shrink-0" />
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Location picker */}
            <div className="mb-6">
              <p className="text-xs text-white/50 uppercase tracking-widest mb-3">Tipo de local</p>
              <div className="flex flex-wrap gap-2">
                {[
                  { val: 'Residencial', icon: HomeIcon },
                  { val: 'Condomínio',  icon: Building2 },
                  { val: 'Empresa/Indústria', icon: Factory },
                ].map(l => (
                  <button key={l.val}
                    onClick={() => setSelLocation(l.val)}
                    aria-pressed={selLocation === l.val}
                    className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm border transition-all ${
                      selLocation === l.val
                        ? 'bg-[#10acf0]/20 border-[#10acf0]/60 text-[#10acf0]'
                        : 'border-white/12 bg-white/4 text-white/60 hover:border-white/25'
                    }`}>
                    <l.icon className="h-4 w-4" />
                    {l.val}
                  </button>
                ))}
              </div>
            </div>

            {/* Urgency toggle */}
            <div className="mb-8 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Urgência 24h?</p>
                <p className="text-xs text-white/45 mt-0.5">Atendimento imediato · adicional noturno/feriado pode ser aplicado</p>
              </div>
              <button
                onClick={() => setIsUrgent(!isUrgent)}
                aria-pressed={isUrgent}
                className={`relative inline-flex h-7 w-12 rounded-full border transition-all ${
                  isUrgent ? 'bg-[#e53935] border-[#e53935]' : 'bg-white/10 border-white/20'
                }`}
              >
                <span className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${isUrgent ? 'translate-x-5' : ''}`} />
              </button>
            </div>

            {isUrgent && (
              <div className="mb-5 flex items-center gap-2 text-sm text-red-400 border border-red-400/25 rounded-xl px-4 py-2.5 bg-red-400/8">
                <Zap className="h-4 w-4 shrink-0" />
                <span>⚡ Solicitação de atendimento <strong>URGENTE</strong> ativada</span>
              </div>
            )}

            <a href={buildWaLink()} target="_blank" rel="noreferrer"
              className="btn-cyan text-white w-full py-4 rounded-2xl font-semibold inline-flex items-center justify-center gap-3 text-base"
              aria-label="Solicitar orçamento grátis no WhatsApp">
              <PhoneCall className="h-5 w-5" /> Solicitar Orçamento Grátis
            </a>
            <p className="text-center text-xs text-white/35 mt-3">Resposta rápida via WhatsApp · sem compromisso</p>
          </motion.div>
        </div>
      </Section>

      {/* ═══════════════════════════════ CTA FINAL ══════════════════════ */}
      <Section id="contato" className="py-24 grid-bg">
        <div className="mx-auto max-w-4xl px-5 text-center">
          <motion.div variants={fade} className="glass-strong rounded-[2.5rem] p-10 md:p-16 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/12 to-indigo-600/12" />
            <div className="relative">
              <CheckCircle2 className="mx-auto h-14 w-14 text-[#10acf0] float-up" />
              <h2 className="mt-6 text-3xl md:text-5xl font-bold" style={{ fontFamily: 'var(--font-outfit)' }}>
                Entupiu aí?<br />A gente resolve <span className="grad-text">hoje</span>.
              </h2>
              <p className="mt-4 text-white/65">Atendimento 24h por WhatsApp. Solicite seu orçamento agora.</p>
              <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
                <a href={WA_DEFAULT} target="_blank" rel="noreferrer"
                  className="btn-cyan inline-flex items-center gap-3 text-white px-9 py-4 rounded-full font-semibold text-lg"
                  aria-label="Chamar RR Desentupidora 24h">
                  <PhoneCall className="h-6 w-6" /> (21) 99669-9191
                </a>
                <a href={PHONE_TEL}
                  className="btn-ghost px-9 py-4 rounded-full font-semibold text-white/75 inline-flex items-center gap-2"
                  aria-label="Ligar agora para RR Desentupidora">
                  Ligar agora
                </a>
              </div>
              {/* Guarantee badge */}
              <div className="mt-6 inline-flex items-center gap-2 text-emerald-400 text-sm border border-emerald-400/25 rounded-full px-4 py-1.5">
                <CheckCircle2 className="h-4 w-4" />
                <span>Garantia de 30 dias incluída em todos os serviços</span>
              </div>
            </div>
          </motion.div>
        </div>
      </Section>

      {/* ═══════════════════════════════ FOOTER ═════════════════════════ */}
      <footer className="border-t border-white/5 py-14">
        <div className="mx-auto max-w-7xl px-5 grid gap-8 md:grid-cols-3 text-sm">
          <div>
            <div className="flex items-center gap-2.5 mb-3">
              <Image src="/assets/rr-logo.webp" width={28} height={28} className="h-7 w-auto" alt="RR" unoptimized />
              <span className="font-semibold text-white" style={{ fontFamily: 'var(--font-outfit)' }}>RR Desentupidora</span>
            </div>
            <p className="text-white/45 leading-relaxed">Desentupimento com tecnologia, agilidade e cuidado.</p>
          </div>
          <div className="text-white/55 space-y-2">
            <p className="flex items-center gap-2"><MapPin className="h-4 w-4 text-[#10acf0] shrink-0" /> Rua Santos Moreira, 40 · Santa Rosa, Niterói/RJ</p>
            <p className="flex items-center gap-2"><PhoneCall className="h-4 w-4 text-[#10acf0] shrink-0" /> (21) 99669-9191 · 24h</p>
          </div>
          <div className="flex md:justify-end items-start gap-5 text-white/45 text-xs uppercase tracking-wide">
            <a href={INSTAGRAM} target="_blank" rel="noreferrer" className="hover:text-[#10acf0] transition-colors" aria-label="Instagram RR Desentupidora">Instagram</a>
            <span className="text-white/15">|</span>
            <a href={WA_DEFAULT} target="_blank" rel="noreferrer" className="hover:text-[#10acf0] transition-colors" aria-label="WhatsApp RR Desentupidora">WhatsApp</a>
          </div>
        </div>
        <p className="mt-10 text-center text-xs text-white/28">
          © RR Desentupidora · VibeDoCode · {new Date().getFullYear()} ·{' '}
          <span className="font-mono opacity-70">{VERSION}</span>
        </p>
      </footer>

      {/* ═══════════════════════════════ FLOATING WA ════════════════════ */}
      <AnimatePresence>
        {showFloat && (
          <motion.a
            href={WA_DEFAULT} target="_blank" rel="noreferrer"
            initial={{ opacity: 0, scale: .8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: .8 }}
            transition={{ type: 'spring', stiffness: 300, damping: 22 }}
            className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 btn-cyan text-white rounded-full shadow-xl"
            style={{ padding: '12px 20px' }}
            aria-label="Chamar RR Desentupidora no WhatsApp"
          >
            {/* Pulse ring */}
            <span className="absolute inset-0 rounded-full pulse-ring" style={{ background: 'rgba(16,172,240,.4)' }} />
            <PhoneCall className="h-5 w-5 shrink-0" />
            <span className="hidden sm:inline font-semibold text-sm">Chamar 24h</span>
          </motion.a>
        )}
      </AnimatePresence>
    </main>
  );
}
