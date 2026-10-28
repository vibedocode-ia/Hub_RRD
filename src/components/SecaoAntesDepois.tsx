'use client';

import React, { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Camera, MapPin, Sparkles, CheckCircle2 } from 'lucide-react';

const CASOS = [
  {
    id: 1,
    servico: 'Desentupimento de Rede de Esgoto',
    bairro: 'Icaraí · Niterói',
    descricao: 'Rede com refluxo crônico desobstruída totalmente por hidrojato de alta pressão.',
    antesImg: '/frames/hero/0001.webp',
    depoisImg: '/frames/hero/0240.webp',
  },
  {
    id: 2,
    servico: 'Limpeza e Desobstrução de Caixa de Gordura',
    bairro: 'Santa Rosa · Niterói',
    descricao: 'Remoção mecânica e aspiração a vácuo, higienizando as paredes da tubulação.',
    antesImg: '/frames/hero/0001.webp',
    depoisImg: '/frames/hero/0240.webp',
  },
  {
    id: 3,
    servico: 'Desobstrução de Ralo e Coluna Predial',
    bairro: 'Centro · Niterói',
    descricao: 'Inspeção por câmera e remoção de incrustações antigas sem necessidade de obras.',
    antesImg: '/frames/hero/0001.webp',
    depoisImg: '/frames/hero/0240.webp',
  },
  {
    id: 4,
    servico: 'Hidrojateamento em Tubulação Coletora',
    bairro: 'São Francisco · Niterói',
    descricao: 'Fluxo 100% restabelecido e encanamento inspecionado com laudo de vazão.',
    antesImg: '/frames/hero/0001.webp',
    depoisImg: '/frames/hero/0240.webp',
  },
];

export default function SecaoAntesDepois() {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });

  return (
    <section id="antes-depois" ref={ref} className="relative py-24 bg-[#050d1a] border-t border-cyan-500/15 overflow-hidden">
      <div className="relative mx-auto max-w-7xl px-5">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center max-w-2xl mx-auto mb-16"
        >
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-400/30 text-cyan-300 text-xs font-semibold uppercase tracking-wider mb-4">
            <Camera className="h-3.5 w-3.5 text-cyan-400" />
            Trabalho Real
          </div>
          <h2 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight">
            O antes <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">e o depois</span>
          </h2>
          <p className="mt-4 text-white/65 text-base md:text-lg">
            Resultados comprovados na prática em residências, condomínios e comércios da nossa região.
          </p>
        </motion.div>

        <div className="grid gap-8 md:grid-cols-2">
          {CASOS.map((caso, i) => (
            <motion.div
              key={caso.id}
              initial={{ opacity: 0, y: 24 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.55, delay: i * 0.1 }}
              className="rounded-3xl border border-cyan-500/20 bg-[#08152c]/90 overflow-hidden shadow-2xl backdrop-blur-sm"
            >
              <div className="grid grid-cols-2 relative aspect-[16/10] bg-black/40 border-b border-cyan-500/20 overflow-hidden">
                {/* Antes */}
                <div className="relative h-full overflow-hidden border-r border-white/10 group">
                  <img
                    src={caso.antesImg}
                    alt={`Antes - ${caso.servico}`}
                    className="w-full h-full object-cover filter contrast-125 brightness-75"
                  />
                  <div className="absolute inset-0 bg-red-950/20" />
                  <span className="absolute top-3 left-3 px-2.5 py-1 rounded bg-red-900/80 backdrop-blur-md border border-red-500/30 text-[10px] font-mono uppercase tracking-wider text-red-200 font-bold">
                    Antes · Obstruído
                  </span>
                </div>

                {/* Depois */}
                <div className="relative h-full overflow-hidden group">
                  <img
                    src={caso.depoisImg}
                    alt={`Depois - ${caso.servico}`}
                    className="w-full h-full object-cover filter contrast-110"
                  />
                  <div className="absolute inset-0 bg-cyan-950/20" />
                  <span className="absolute top-3 right-3 px-2.5 py-1 rounded bg-cyan-900/80 backdrop-blur-md border border-cyan-400/40 text-[10px] font-mono uppercase tracking-wider text-cyan-200 font-bold shadow-[0_0_10px_rgba(16,172,240,0.3)]">
                    Depois · 100% Desobstruído
                  </span>
                </div>
              </div>

              <div className="p-6">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <h3 className="font-bold text-lg text-white">
                    {caso.servico}
                  </h3>
                  <span className="inline-flex items-center gap-1 text-xs text-cyan-400 font-mono">
                    <MapPin className="h-3 w-3" /> {caso.bairro}
                  </span>
                </div>
                <p className="text-sm text-white/65 leading-relaxed">
                  {caso.descricao}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
