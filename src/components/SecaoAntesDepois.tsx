'use client';

import React, { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Camera } from 'lucide-react';
import Image from 'next/image';

const CASOS = [
  {
    id: 1,
    servico: 'Rede de esgoto e poço de visita',
    antesLegenda: 'Condição com resíduos',
    depoisLegenda: 'Após limpeza',
    antesImg: '/assets/rr-novosite/07_comparativo_01_esgoto_antes.webp',
    depoisImg: '/assets/rr-novosite/08_comparativo_01_esgoto_depois.webp',
  },
  {
    id: 2,
    servico: 'Caixa de gordura',
    antesLegenda: 'Condição com resíduos',
    depoisLegenda: 'Após limpeza',
    antesImg: '/assets/rr-novosite/09_comparativo_02_gordura_antes.webp',
    depoisImg: '/assets/rr-novosite/10_comparativo_02_gordura_depois.webp',
  },
  {
    id: 3,
    servico: 'Ralo e caixa de inspeção',
    antesLegenda: 'Condição com resíduos',
    depoisLegenda: 'Após limpeza',
    antesImg: '/assets/rr-novosite/11_comparativo_03_inspecao_antes.webp',
    depoisImg: '/assets/rr-novosite/12_comparativo_03_inspecao_depois.webp',
  },
  {
    id: 4,
    servico: 'Acesso à coletora condominial',
    antesLegenda: 'Condição com resíduos',
    depoisLegenda: 'Após limpeza',
    antesImg: '/assets/rr-novosite/13_comparativo_04_coletora_antes.webp',
    depoisImg: '/assets/rr-novosite/14_comparativo_04_coletora_depois.webp',
  },
];

export default function SecaoAntesDepois({ waLink, phoneTel }: { waLink?: string; phoneTel?: string } = {}) {
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
            Comparações de limpeza
          </div>
          <h2 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight">
            O antes <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">e o depois</span>
          </h2>
          <p className="mt-4 text-white/65 text-base md:text-lg">
            Comparações visuais de condições de limpeza em diferentes estruturas.
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
                  <Image
                    src={caso.antesImg}
                    alt={`${caso.antesLegenda} — ${caso.servico}`}
                    fill
                    sizes="(max-width: 768px) 100vw, 50vw"
                    className="object-cover filter contrast-125 brightness-75"
                  />
                  <div className="absolute inset-0 bg-red-950/20" />
                  <span className="absolute top-3 left-3 px-2.5 py-1 rounded bg-red-900/80 backdrop-blur-md border border-red-500/30 text-[10px] font-mono uppercase tracking-wider text-red-200 font-bold">
                    {caso.antesLegenda}
                  </span>
                </div>

                {/* Depois */}
                <div className="relative h-full overflow-hidden group">
                  <Image
                    src={caso.depoisImg}
                    alt={`${caso.depoisLegenda} — ${caso.servico}`}
                    fill
                    sizes="(max-width: 768px) 100vw, 50vw"
                    className="object-cover contrast-125"
                  />
                  <div className="absolute inset-0 bg-cyan-950/20" />
                  <span className="absolute top-3 right-3 px-2.5 py-1 rounded bg-cyan-900/80 backdrop-blur-md border border-cyan-400/40 text-[10px] font-mono uppercase tracking-wider text-cyan-200 font-bold shadow-[0_0_10px_rgba(16,172,240,0.3)]">
                    {caso.depoisLegenda}
                  </span>
                </div>
              </div>

              <div className="p-6">
                <h3 className="text-sm font-semibold text-white/80">{caso.servico}</h3>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
