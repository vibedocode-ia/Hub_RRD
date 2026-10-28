'use client';

import React, { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { PhoneCall, Truck, CheckCircle2, ArrowRight } from 'lucide-react';

const PASSOS = [
  {
    numero: '01',
    titulo: 'Você liga ou chama no WhatsApp',
    descricao: 'Atendimento 24 horas por dia. Descreva a situação e nossa equipe já passa a estimativa e desloca o técnico imediatamente.',
    icone: PhoneCall,
  },
  {
    numero: '02',
    titulo: 'Nossa equipe vai até você',
    descricao: 'Chegamos rápido em Niterói e cidades da região metropolitana. Caminhão equipado com hidrojateamento e ferramentas de alta precisão.',
    icone: Truck,
  },
  {
    numero: '03',
    titulo: 'Problema resolvido com garantia',
    descricao: 'Desobstrução concluída no mesmo dia, teste de vazão realizado na sua frente, local limpo e certificado de garantia por escrito.',
    icone: CheckCircle2,
  },
];

export default function SecaoComoFunciona({ waLink, phoneTel }: { waLink: string; phoneTel: string }) {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });

  return (
    <section id="como-funciona" ref={ref} className="relative py-24 bg-[#061022] border-t border-cyan-500/15 overflow-hidden">
      <div className="relative mx-auto max-w-7xl px-5">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center max-w-2xl mx-auto mb-16"
        >
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-cyan-400 mb-3">
            Simples Assim
          </p>
          <h2 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight">
            Do problema <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">à solução</span>
          </h2>
          <p className="mt-4 text-white/65 text-base md:text-lg">
            Três passos práticos. Sem burocracia, sem taxa de visita para orçar e sem espera de dias.
          </p>
        </motion.div>

        <div className="grid gap-6 md:grid-cols-3">
          {PASSOS.map((passo, i) => {
            const Icone = passo.icone;
            return (
              <motion.div
                key={passo.numero}
                initial={{ opacity: 0, y: 26 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.55, delay: i * 0.12 }}
                className="relative rounded-2xl border border-cyan-500/20 bg-gradient-to-b from-[#081730] to-[#040c1a] p-7 backdrop-blur-sm shadow-xl hover:border-cyan-400/40 transition-colors"
              >
                <div className="flex items-center justify-between mb-6">
                  <span className="text-4xl md:text-5xl font-black font-mono text-cyan-400/30">
                    {passo.numero}
                  </span>
                  <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-400/30 flex items-center justify-center text-cyan-300">
                    <Icone className="h-6 w-6" />
                  </div>
                </div>
                <h3 className="text-xl font-bold text-white mb-3 leading-snug">
                  {passo.titulo}
                </h3>
                <p className="text-sm text-white/70 leading-relaxed">
                  {passo.descricao}
                </p>
              </motion.div>
            );
          })}
        </div>

        {/* Bloco de Ação Rápida */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-12 flex flex-col sm:flex-row items-center justify-between gap-6 rounded-2xl border border-cyan-400/30 bg-cyan-500/10 p-6 md:p-8 backdrop-blur-md"
        >
          <div>
            <h4 className="text-xl md:text-2xl font-bold text-white tracking-tight">
              Precisa de socorro imediato?
            </h4>
            <p className="text-sm text-white/70 mt-1">
              Plantão 24 horas ativo com técnicos prontos para sair.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <a
              href={phoneTel}
              className="px-5 py-3 rounded-full border border-cyan-400/40 text-cyan-200 hover:bg-cyan-500/20 text-xs font-bold uppercase tracking-wider transition-colors inline-flex items-center gap-2"
            >
              <PhoneCall className="h-4 w-4" /> (21) 99669-9191
            </a>
            <a
              href={waLink}
              target="_blank"
              rel="noreferrer"
              className="btn-cyan text-white px-6 py-3 rounded-full font-bold text-xs uppercase tracking-wider inline-flex items-center gap-2 shadow-lg shadow-cyan-500/30"
            >
              Chamar no WhatsApp <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
