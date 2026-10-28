'use client';

import React, { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Clock, Award, Users, CreditCard, ShieldCheck, Check, Sparkles, HelpCircle } from 'lucide-react';

const DIFERENCIAIS = [
  {
    titulo: 'Pronto Atendimento 24h',
    desc: 'Atendimento contínuo todos os dias, incluindo finais de semana e feriados. Sem cobrança de taxa de visita.',
    icone: Clock,
  },
  {
    titulo: '+7 Anos de Tradição',
    desc: 'Histórico sólido e comprovado em Niterói, São Gonçalo e toda a região metropolitana do Rio de Janeiro.',
    icone: Award,
  },
  {
    titulo: 'Equipe Própria Especializada',
    desc: 'Profissionais uniformizados, com NR-33 e NR-35, e caminhões equipados de última geração.',
    icone: Users,
  },
  {
    titulo: 'Pagamento Facilitado',
    desc: 'Parcelamento em cartões de crédito, Pix na hora, boleto e condições especiais para condomínios.',
    icone: CreditCard,
  },
];

export default function SecaoDiferenciaisQuebraPiso() {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });

  return (
    <section id="diferenciais" ref={ref} className="relative py-24 bg-[#060f20] border-t border-cyan-500/15 overflow-hidden">
      <div className="relative mx-auto max-w-7xl px-5">
        {/* Header Por que a RR */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center max-w-2xl mx-auto mb-16"
        >
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-400/30 text-cyan-300 text-xs font-semibold uppercase tracking-wider mb-4">
            <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
            Por que a RR
          </div>
          <h2 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight">
            O que muda quando <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">a gente chega</span>
          </h2>
          <p className="mt-4 text-white/65 text-base md:text-lg">
            Compromisso ético, precisão técnica e garantia contratual em cada serviço executado.
          </p>
        </motion.div>

        {/* Cards Diferenciais */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-16">
          {DIFERENCIAIS.map((d, i) => {
            const Icone = d.icone;
            return (
              <motion.div
                key={d.titulo}
                initial={{ opacity: 0, y: 22 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                className="rounded-2xl border border-cyan-500/20 bg-gradient-to-b from-[#081835] to-[#040c1c] p-6 backdrop-blur-sm shadow-xl hover:border-cyan-400/40 transition-colors"
              >
                <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-400/30 flex items-center justify-center text-cyan-300 mb-5">
                  <Icone className="h-6 w-6" />
                </div>
                <h3 className="font-bold text-lg text-white mb-2 leading-snug">
                  {d.titulo}
                </h3>
                <p className="text-sm text-white/65 leading-relaxed">
                  {d.desc}
                </p>
              </motion.div>
            );
          })}
        </div>

        {/* QUEBRA DE OBJEÇÃO: VAI QUEBRAR MEU PISO? */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="relative rounded-3xl border border-cyan-400/30 bg-gradient-to-r from-[#071938] via-[#09224c] to-[#051329] p-8 md:p-12 shadow-[0_0_40px_rgba(16,172,240,0.15)] overflow-hidden"
        >
          <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-1/3 bg-cyan-500/5 blur-3xl" />
          
          <div className="relative grid gap-8 lg:grid-cols-2 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 text-xs font-mono uppercase tracking-widest mb-4">
                <HelpCircle className="h-3.5 w-3.5 text-cyan-400" />
                Dúvida Mais Comum
              </div>
              <h3 className="text-2xl md:text-4xl font-extrabold text-white leading-tight mb-4">
                &ldquo;Vai quebrar <span className="text-cyan-400">meu piso?&rdquo;</span>
              </h3>
              <p className="text-white/80 text-base md:text-lg leading-relaxed mb-4">
                Na esmagadora maioria dos casos, <strong className="text-cyan-300 underline underline-offset-4 font-bold">NÃO</strong>. Nós investimos em tecnologia de ponta para que você não precise passar por reformas indesejadas.
              </p>
              <p className="text-white/60 text-sm leading-relaxed">
                Com o auxílio de câmeras de vídeo-inspeção milimétricas e sondas de hidrojato de alta pressão, desobstruímos o encanamento por dentro, preservando integralmente seu porcelanato, azulejo ou piso de madeira.
              </p>
            </div>

            <div className="space-y-4 rounded-2xl bg-black/30 border border-white/10 p-6 backdrop-blur-sm">
              {[
                { titulo: 'Vídeo-inspeção precisa', desc: 'Identificamos o ponto exato da obstrução sem quebrar nada.' },
                { titulo: 'Hidrojateamento rotativo', desc: 'Lava e desincrusta as paredes internas do cano sem impacto estrutural.' },
                { titulo: 'Transparência total', desc: 'Se em algum caso extremo for necessário abrir, você é consultado antes.' },
                { titulo: 'Ambiente entregue limpo', desc: 'Sem sujeira, sem odor e com higienização completa após o serviço.' },
              ].map((item, idx) => (
                <div key={idx} className="flex items-start gap-3.5">
                  <div className="w-6 h-6 rounded-full bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center shrink-0 mt-0.5 text-cyan-300">
                    <Check className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-white">{item.titulo}</h4>
                    <p className="text-xs text-white/60 mt-0.5">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
