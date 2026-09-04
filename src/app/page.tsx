'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, useInView, useScroll, useSpring } from 'framer-motion';
import {
  Droplets, Clock, ShieldCheck, Truck, Wrench, PhoneCall, MapPin,
  CheckCircle2, Sparkles, ArrowRight, Star,
} from 'lucide-react';
import { APP_NAME } from '@/lib/version';

const WHATSAPP = 'https://api.whatsapp.com/send?phone=5521996699191&text=Estava%20no%20seu%20site.%20Quero%20mais%20informa%C3%A7%C3%B5es.';

const fade = {
  hidden: { opacity: 0, y: 26 },
  show: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: .7, delay: i * .1, ease: [0.22, 1, 0.36, 1] as any } }),
};

function Section({ id, children, className = '' }: { id?: string; children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  return (
    <section id={id} ref={ref} className={`relative ${className}`}>
      <motion.div initial="hidden" animate={inView ? 'show' : 'hidden'} variants={{ hidden: {}, show: { transition: { staggerChildren: .12 } } }}>
        {children}
      </motion.div>
    </section>
  );
}

export default function Home() {
  // barra de progresso de leitura
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 26 });

  useEffect(() => {
    const io = new IntersectionObserver((es) => es.forEach((e) => e.target.classList.toggle('in', e.isIntersecting)), { threshold: 0.12 });
    document.querySelectorAll('.animate').forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  const servicos = [
    { icon: Droplets, t: 'Desentupimento', d: 'Pias, ralos, vasos e caixas de gordura — residencial e predial.' },
    { icon: Truck, t: 'Limpa Fossa & Sucção', d: 'Sucção e limpeza de fossas, caixas de esgoto e resíduos.' },
    { icon: Wrench, t: 'Hidrojateamento', d: 'Jatos de alta pressão para desobstrução e limpeza industrial.' },
    { icon: Clock, t: 'Caixa D’água e Gordura', d: 'Limpeza e manutenção preventiva de caixas d’água e de gordura.' },
    { icon: Sparkles, t: 'Rede de Esgoto', d: 'Desobstrução de colunas, redes e tubulações prediais e pluviais.' },
    { icon: ShieldCheck, t: 'Dedetização', d: 'Controle de pragas com segurança e responsabilidade ambiental.' },
  ];

  const diferenciais = [
    { icon: Clock, t: 'Atendimento 24h', d: 'Emergências de dia, de noite, fins de semana e feriados.' },
    { icon: Star, t: '5,0 no Google', d: 'Excelente, com base em 55 avaliações reais de clientes.' },
    { icon: ShieldCheck, t: '+7 anos', d: 'Experiência e equipe especializada e pontual.' },
    { icon: Truck, t: 'Equipamentos modernos', d: 'Maquinário compacto que resolve com menos transtorno e sujeira.' },
  ];

  return (
    <main className="relative min-h-screen bg-[#050d1a] text-[#f1f5fb]">
      {/* barra de progresso */}
      <motion.div style={{ scaleX }} className="fixed top-0 left-0 right-0 h-[3px] z-[60] origin-left bg-gradient-to-r from-cyan-400 to-indigo-500" />

      {/* ===== NAV ===== */}
      <header className="fixed top-0 w-full z-50 backdrop-blur-xl bg-[#050d1a]/70 border-b border-white/5">
        <div className="mx-auto max-w-7xl px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/assets/rr-logo.webp" alt="RR Desentupidora" width={44} height={44} className="h-10 w-auto" unoptimized />
            <span className="font-semibold tracking-tight">{APP_NAME.replace('RR Desentupidora', 'RR')} Desentupidora</span>
          </div>
          <nav className="hidden md:flex items-center gap-7 text-sm text-white/75">
            <a href="#servicos">Serviços</a>
            <a href="#porque">Por que a RR</a>
            <a href="#avaliacoes">Avaliações</a>
            <a href="#contato">Contato</a>
            <Link href="/portal" className="btn-cyan text-white px-4 py-2 rounded-full text-sm font-semibold inline-flex items-center gap-1">Acesso ao Hub <ArrowRight className="h-4 w-4" /></Link>
          </nav>
        </div>
      </header>

      {/* ===== HERO ===== */}
      <section className="relative grid-bg">
        <div className="hero-overlay absolute inset-0" />
        <div className="relative mx-auto max-w-7xl px-5 pt-32 pb-20 grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <motion.div variants={fade} initial="hidden" animate="show" className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/5 px-4 py-1.5 text-sm text-cyan-200">
              <Clock className="h-4 w-4" /> Atendimento 24 horas
            </motion.div>
            <motion.h1 variants={fade} initial="hidden" animate="show" custom={1} className="mt-6 text-4xl md:text-6xl font-bold leading-[1.05] tracking-tight">
              Entupiu? A gente <span className="grad-text">resolve sem transtorno</span>.
            </motion.h1>
            <motion.p variants={fade} initial="hidden" animate="show" custom={2} className="mt-6 max-w-xl text-lg text-white/70">
              Desentupimento, limpeza de fossa e hidrojateamento com tecnologia, agilidade e o cuidado de quem trata sua casa como a própria. Atendemos residências, condomínios e empresas em Niterói e região.
            </motion.p>
            <motion.div variants={fade} initial="hidden" animate="show" custom={3} className="mt-8 flex flex-wrap gap-4">
              <a href={WHATSAPP} target="_blank" rel="noreferrer" className="btn-cyan text-white px-6 py-3.5 rounded-full font-semibold inline-flex items-center gap-2">
                <PhoneCall className="h-5 w-5" /> Chamar no WhatsApp
              </a>
              <a href="#servicos" className="btn-ghost px-6 py-3.5 rounded-full font-semibold text-white/85 inline-flex items-center gap-2">Ver serviços</a>
            </motion.div>
            <motion.div variants={fade} initial="hidden" animate="show" custom={4} className="mt-8 flex items-center gap-3 text-sm text-white/70">
              <span className="flex text-amber-400">★★★★★</span> Excelente · 5,0 com base em 55 avaliações no Google
            </motion.div>
          </div>
          <motion.div initial={{ opacity: 0, scale: .96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1 }} className="relative hidden lg:block">
            <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/20 to-indigo-600/20 blur-3xl" />
            <div className="glass-strong relative rounded-[2rem] overflow-hidden">
              <Image src="/assets/hero.png" alt="RR em operação" width={1000} height={1000} className="w-full h-80 object-cover opacity-90" unoptimized />
              <div className="absolute inset-0 bg-gradient-to-t from-[#050d1a] via-transparent" />
            </div>
          </motion.div>
        </div>
      </section>

      {/* ===== SERVIÇOS ===== */}
      <Section id="servicos" className="py-20">
        <div className="mx-auto max-w-7xl px-5">
          <motion.div variants={fade} initial="hidden" whileInView="show" viewport={{ once: true }} className="text-center max-w-2xl mx-auto">
            <p className="text-sm uppercase tracking-[0.2em] text-cyan-300">O que fazemos</p>
            <h2 className="mt-3 text-3xl md:text-5xl font-bold">Especialistas em <span className="grad-text">desentupimento</span> e manutenção</h2>
          </motion.div>
          <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {servicos.map((s, i) => (
              <motion.div key={s.t} variants={fade} initial="hidden" whileInView="show" viewport={{ once: true }} custom={i} className="glass rounded-3xl p-7 group hover:-translate-y-1 transition-transform">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-400/20 to-indigo-500/20 border border-cyan-300/20 flex items-center justify-center mb-5">
                  <s.icon className="h-6 w-6 text-cyan-300" />
                </div>
                <h3 className="text-xl font-semibold">{s.t}</h3>
                <p className="mt-2 text-white/60 text-sm leading-relaxed">{s.d}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* ===== POR QUE ===== */}
      <Section id="porque" className="py-20 bg-[#060f20] border-y border-white/5">
        <div className="mx-auto max-w-7xl px-5 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <motion.div variants={fade} initial="hidden" whileInView="show" viewport={{ once: true }}>
              <p className="text-sm uppercase tracking-[0.2em] text-cyan-300">Por que a RR</p>
              <h2 className="mt-3 text-3xl md:text-5xl font-bold leading-tight">Uma empresa que vai <span className="grad-text">pra resolver o seu problema</span></h2>
              <p className="mt-5 text-white/70">Chegamos com urgência, estrutura técnica e cuidado. Executamos como se fosse na nossa própria casa — e você nunca fica sozinho durante o serviço.</p>
              <a href={WHATSAPP} target="_blank" rel="noreferrer" className="mt-7 inline-block text-cyan-300 font-semibold border-b border-cyan-300/30 pb-1">Solicitar orçamento <ArrowRight className="inline h-4 w-4" /></a>
            </motion.div>
          </div>
          <div className="grid gap-4">
            {diferenciais.map((d, i) => (
              <motion.div key={d.t} variants={fade} initial="hidden" whileInView="show" viewport={{ once: true }} custom={i} className="glass rounded-2xl p-5 flex items-start gap-4">
                <div className="w-11 h-11 shrink-0 rounded-xl bg-gradient-to-br from-cyan-400/20 to-indigo-500/20 border border-cyan-300/20 flex items-center justify-center">
                  <d.icon className="h-5 w-5 text-cyan-300" />
                </div>
                <div>
                  <h3 className="font-semibold">{d.t}</h3>
                  <p className="text-sm text-white/60 mt-1">{d.d}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* ===== AVALIAÇÕES ===== */}
      <Section id="avaliacoes" className="py-20 grid-bg">
        <div className="mx-auto max-w-7xl px-5">
          <motion.div variants={fade} initial="hidden" whileInView="show" viewport={{ once: true }} className="text-center">
            <p className="text-sm uppercase tracking-[0.2em] text-cyan-300">Reputação</p>
            <h2 className="mt-3 text-3xl md:text-5xl font-bold">Quem contratou, <span className="grad-text">recomenda</span></h2>
            <div className="mt-4 inline-flex items-center gap-2 text-amber-400 text-xl">★★★★★ <span className="text-white/60 text-base font-normal">5,0 · 55 avaliações</span></div>
          </motion.div>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {[
              { n: 'Raquel C.', t: 'Atendimento maravilhoso! Super atenciosos e competentes, resolveram meu problema rápido. Super indico!' },
              { n: 'Fernando e Rafael', t: 'Profissionais de primeira linha. Resolveram um problemão e ainda foram além, cuidando de detalhes que não eram com eles.' },
              { n: 'Alex A.', t: 'Respondem rápido no WhatsApp e a equipe é muito bem preparada e pontual. Recomendo!' },
            ].map((a, i) => (
              <motion.div key={i} variants={fade} initial="hidden" whileInView="show" viewport={{ once: true }} custom={i} className="glass rounded-3xl p-7">
                <div className="text-amber-400 mb-3">★★★★★</div>
                <p className="text-white/80 text-sm leading-relaxed">&ldquo;{a.t}&rdquo;</p>
                <p className="mt-4 text-sm font-semibold text-cyan-300">{a.n}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* ===== CTA / CONTATO ===== */}
      <Section id="contato" className="py-24">
        <div className="mx-auto max-w-4xl px-5 text-center">
          <motion.div variants={fade} initial="hidden" whileInView="show" viewport={{ once: true }} className="glass-strong rounded-[2.5rem] p-10 md:p-16 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/15 to-indigo-600/15" />
            <div className="relative">
              <CheckCircle2 className="mx-auto h-12 w-12 text-cyan-300" />
              <h2 className="mt-5 text-3xl md:text-5xl font-bold">Entupiu aí? A gente resolve hoje.</h2>
              <p className="mt-4 text-white/70">Atendimento 24h por WhatsApp. Solicite seu orçamento agora.</p>
              <a href={WHATSAPP} target="_blank" rel="noreferrer" className="btn-cyan mt-8 inline-flex items-center gap-2 text-white px-8 py-4 rounded-full font-semibold text-lg">
                <PhoneCall className="h-6 w-6" /> (21) 99669-9191
              </a>
            </div>
          </motion.div>
        </div>
      </Section>

      {/* ===== FOOTER ===== */}
      <footer className="border-t border-white/5 py-12">
        <div className="mx-auto max-w-7xl px-5 grid gap-8 md:grid-cols-3 text-sm">
          <div>
            <div className="flex items-center gap-2"><Image src="/assets/rr-logo.webp" width={28} height={28} className="h-6 w-auto" alt="" unoptimized /><span className="font-semibold text-white">RR Desentupidora</span></div>
            <p className="mt-2 text-white/50">Desentupimento e todos com tecnologia, agilidade e cuidado.</p>
          </div>
          <div className="text-white/60 space-y-1">
            <p className="flex items-center gap-2"><MapPin className="h-4 w-4 text-cyan-300" /> Rua Santos Moreira, 40 · Santa Rosa, Niterói/RJ</p>
            <p className="flex items-center gap-2"><PhoneCall className="h-4 w-4 text-cyan-300" /> (21) 99669-9191 · 24h</p>
          </div>
          <div className="flex md:justify-end items-start gap-4 text-white/50 text-xs uppercase tracking-wide">
            <a href="https://www.instagram.com/rr.desentupidora" className="hover:text-cyan-300">Instagram</a>
            <span className="text-white/20">|</span>
            <a href={WHATSAPP} target="_blank" rel="noreferrer" className="hover:text-cyan-300">WhatsApp</a>
          </div>
        </div>
        <p className="mt-8 text-center text-xs text-white/35">© RR Desentupidora · VibeDoCode · <span className="font-mono opacity-70">v0.1.01</span></p>
      </footer>
    </main>
  );
}
