'use client';

import React from 'react';
import { MapPin, ShieldCheck, Clock, Zap } from 'lucide-react';

const ITENS = [
  { texto: 'Atendimento 24 Horas', destaque: true, icone: Clock },
  { texto: 'Sem Taxa de Visita', destaque: true, icone: Zap },
  { texto: 'Orçamento na Hora', destaque: false, icone: ShieldCheck },
  { texto: 'Garantia por Escrito', destaque: false, icone: ShieldCheck },
  { texto: 'Icaraí', destaque: false, icone: MapPin },
  { texto: 'Santa Rosa', destaque: false, icone: MapPin },
  { texto: 'Centro de Niterói', destaque: false, icone: MapPin },
  { texto: 'São Francisco', destaque: false, icone: MapPin },
  { texto: 'Charitas', destaque: false, icone: MapPin },
  { texto: 'Itaipu', destaque: false, icone: MapPin },
  { texto: 'Piratininga', destaque: false, icone: MapPin },
  { texto: 'Pendotiba', destaque: false, icone: MapPin },
  { texto: 'Fonseca', destaque: false, icone: MapPin },
  { texto: 'Barreto', destaque: false, icone: MapPin },
  { texto: 'São Gonçalo', destaque: false, icone: MapPin },
  { texto: 'Maricá', destaque: false, icone: MapPin },
  { texto: 'Itaboraí', destaque: false, icone: MapPin },
];

export default function MarqueeLocais() {
  return (
    <section className="relative overflow-hidden bg-[#040914] border-y border-cyan-500/20 py-3.5 z-20 shadow-[0_0_20px_rgba(16,172,240,0.15)]">
      <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-[#040914] to-transparent z-10" />
      <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-[#040914] to-transparent z-10" />
      
      <div className="flex w-max animate-marquee whitespace-nowrap">
        {[0, 1].map((copy) => (
          <div key={copy} className="flex items-center gap-6 shrink-0 pr-6">
            {ITENS.map((item, idx) => {
              const Icone = item.icone;
              return (
                <div
                  key={`${copy}-${idx}`}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium tracking-wide uppercase ${
                    item.destaque
                      ? 'bg-cyan-500/15 border border-cyan-400/40 text-cyan-300 font-bold shadow-[0_0_10px_rgba(16,172,240,0.25)]'
                      : 'bg-white/[0.03] border border-white/5 text-white/70'
                  }`}
                >
                  <Icone className={`h-3.5 w-3.5 ${item.destaque ? 'text-cyan-400' : 'text-cyan-400/60'}`} />
                  <span>{item.texto}</span>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </section>
  );
}
