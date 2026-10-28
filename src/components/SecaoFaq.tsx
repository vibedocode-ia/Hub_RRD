'use client';

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import { HelpCircle, ChevronDown, PhoneCall } from 'lucide-react';

const PERGUNTAS = [
  {
    q: 'Quanto custa o serviço de desentupimento?',
    a: 'O valor exato depende do tipo de tubulação, extensão e complexidade. Nosso orçamento é 100% gratuito e fornecido na hora por telefone ou no local, sem cobrança de taxa de visita.',
  },
  {
    q: 'Vocês cobram taxa para fazer a visita e o orçamento?',
    a: 'Não cobramos absolutamente nada pela visita técnica. O técnico vai até você, avalia a situação, apresenta o orçamento detalhado e o serviço só começa com sua autorização expressa.',
  },
  {
    q: 'Em quanto tempo a equipe chega ao local?',
    a: 'Em Niterói (Icaraí, Santa Rosa, Centro, Região Oceânica e arredores) nosso tempo médio de chegada é de 30 a 40 minutos. Em São Gonçalo e cidades vizinhas, combinamos o horário imediato na ligação.',
  },
  {
    q: 'Vocês atendem de madrugada, fins de semana e feriados?',
    a: 'Sim! Nosso plantão de emergência 24 horas funciona ininterruptamente os 365 dias do ano, garantindo atendimento imediato a qualquer hora do dia ou da noite.',
  },
  {
    q: 'O serviço possui garantia?',
    a: 'Sim. Todos os nossos serviços contam com garantia legal por escrito com laudo. Se o problema persistir ou retornar durante o período de garantia, nossa equipe volta ao local sem qualquer custo adicional.',
  },
  {
    q: 'Vai quebrar meu piso, parede ou azulejo?',
    a: 'Em praticamente 100% dos atendimentos, não é necessário quebrar nada. Utilizamos equipamentos de vídeo-inspeção milimétrica e hidrojateamento com sondas curvas que resolvem o entupimento diretamente pelo interior da tubulação.',
  },
];

export default function SecaoFaq({ phoneTel }: { phoneTel: string }) {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  const [aberto, setAberto] = useState<number | null>(0);

  return (
    <section id="faq" ref={ref} className="relative py-24 bg-[#050d1a] border-t border-cyan-500/15 overflow-hidden">
      <div className="relative mx-auto max-w-7xl px-5 grid gap-12 lg:grid-cols-[1fr_1.4fr] items-start">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-400/30 text-cyan-300 text-xs font-semibold uppercase tracking-wider mb-4">
            <HelpCircle className="h-3.5 w-3.5 text-cyan-400" />
            Dúvidas Frequentes
          </div>
          <h2 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight leading-tight">
            Perguntas <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">frequentes</span>
          </h2>
          <p className="mt-4 text-white/65 text-base leading-relaxed mb-8">
            Transparência total desde o primeiro contato. Se ainda tiver alguma dúvida específica, ligue agora mesmo para nossa central 24h.
          </p>
          
          <a
            href={phoneTel}
            className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-full btn-cyan text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-cyan-500/25"
          >
            <PhoneCall className="h-4 w-4" /> Ligue 24h: (21) 99669-9191
          </a>
        </motion.div>

        {/* Accordion */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="space-y-3"
        >
          {PERGUNTAS.map((p, idx) => {
            const isOpen = aberto === idx;
            return (
              <div
                key={idx}
                className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                  isOpen
                    ? 'border-cyan-400/40 bg-[#081730]/90 shadow-[0_0_20px_rgba(16,172,240,0.1)]'
                    : 'border-white/10 bg-[#061022]/60 hover:border-cyan-500/25'
                }`}
              >
                <button
                  onClick={() => setAberto(isOpen ? null : idx)}
                  className="w-full flex items-center justify-between gap-4 p-5 md:p-6 text-left"
                >
                  <span className="font-bold text-base md:text-lg text-white leading-snug">
                    {p.q}
                  </span>
                  <motion.div
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.25 }}
                    className={`w-8 h-8 rounded-full border flex items-center justify-center shrink-0 ${
                      isOpen
                        ? 'border-cyan-400 bg-cyan-500/20 text-cyan-300'
                        : 'border-white/20 text-white/60'
                    }`}
                  >
                    <ChevronDown className="h-4 w-4" />
                  </motion.div>
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: [0.76, 0, 0.24, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="px-5 pb-6 md:px-6 md:pb-6 text-sm text-white/70 leading-relaxed border-t border-white/5 pt-4">
                        {p.a}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
