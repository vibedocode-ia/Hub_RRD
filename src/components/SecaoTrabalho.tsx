'use client';

import React, { useRef, useEffect } from 'react';
import { motion, useInView } from 'framer-motion';
import { ShieldCheck, Sparkles, CheckCircle2 } from 'lucide-react';

const CLIPES = [
  {
    id: 'equipe',
    arquivo: '/videos/equipe-loop.mp4',
    titulo: 'Equipe Uniformizada e Frota Própria',
    sub: 'Sem improviso · Caminhões combinados e técnicos certificados',
    descricao: 'Nossa equipe chega devidamente paramentada e com os veículos equipados para solucionar qualquer tipo de entupimento no primeiro atendimento.',
    tags: ['Técnicos Certificados', 'Caminhão Vácuo e Hidro', 'Pontualidade'],
  },
  {
    id: 'drain',
    arquivo: '/videos/drain-loop.mp4',
    titulo: 'Desobstrução Total e Imediata',
    sub: 'Vazão restaurada · Prova em vídeo do resultado perfeito',
    descricao: 'Remoção completa de gordura mineral, raízes, resíduos sólidos e incrustações. A água volta a descer com fluxo total sem quebrar o encanamento.',
    tags: ['100% de Vazão', 'Sem Quebra-Quebra', 'Garantia por Escrito'],
  },
];

export default function SecaoTrabalho() {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });

  return (
    <section id="trabalho" ref={ref} className="relative py-24 bg-[#050d1a] border-t border-cyan-500/15 overflow-hidden">
      {/* Glow de fundo */}
      <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-cyan-500/10 rounded-full blur-[120px]" />

      <div className="relative mx-auto max-w-7xl px-5">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-400/30 text-cyan-300 text-xs font-semibold uppercase tracking-wider mb-4">
            <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
            Nosso Trabalho
          </div>
          <h2 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight leading-tight">
            Como a gente <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-300 to-blue-500">resolve</span>
          </h2>
          <p className="mt-4 text-white/65 text-base md:text-lg leading-relaxed">
            Veja a qualidade da nossa operação em campo. Sem imagens de catálogo — aqui você vê a equipe real e o padrão rigoroso de entrega da RR Desentupidora.
          </p>
        </motion.div>

        <div className="grid gap-8 lg:grid-cols-2">
          {CLIPES.map((clip, idx) => (
            <motion.div
              key={clip.id}
              initial={{ opacity: 0, y: 28 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.65, delay: idx * 0.15 }}
              className="group relative rounded-3xl overflow-hidden border border-cyan-500/20 bg-gradient-to-b from-[#08152c] to-[#040914] p-2 md:p-3 shadow-2xl transition-all duration-300 hover:border-cyan-400/40 hover:shadow-[0_0_30px_rgba(16,172,240,0.2)]"
            >
              {/* Vídeo Container */}
              <div className="relative aspect-video rounded-2xl overflow-hidden bg-black/60 shadow-inner">
                <video
                  src={clip.arquivo}
                  autoPlay
                  loop
                  muted
                  playsInline
                  preload="auto"
                  className="h-full w-full object-cover transform transition-transform duration-700 group-hover:scale-105"
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#040914] via-transparent to-black/30" />
                
                {/* Badge no vídeo */}
                <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-[11px] font-mono tracking-wider text-cyan-300 uppercase">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                  Registro em Campo
                </div>
              </div>

              {/* Detalhes */}
              <div className="p-5 md:p-6">
                <div className="text-xs font-mono text-cyan-400 uppercase tracking-widest mb-1.5">
                  {clip.sub}
                </div>
                <h3 className="text-xl md:text-2xl font-bold text-white mb-3 group-hover:text-cyan-300 transition-colors">
                  {clip.titulo}
                </h3>
                <p className="text-white/70 text-sm leading-relaxed mb-5">
                  {clip.descricao}
                </p>

                <div className="flex flex-wrap gap-2 pt-4 border-t border-white/5">
                  {clip.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-cyan-950/40 border border-cyan-500/20 text-xs font-medium text-cyan-200"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
