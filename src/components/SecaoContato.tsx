'use client';

import React, { useState, useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { PhoneCall, MapPin, Clock, Send, MessageSquare } from 'lucide-react';
import { trackWhatsAppConversion } from '@/lib/tracking';

export default function SecaoContato({
  waLink,
  phoneTel,
}: {
  waLink: string;
  phoneTel: string;
}) {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  
  const [nome, setNome] = useState('');
  const [tel, setTel] = useState('');
  const [problema, setProblema] = useState('');
  const [erro, setErro] = useState('');

  const handleEnviar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || !tel.trim() || !problema.trim()) {
      setErro('Por favor, preencha todos os campos para agilizar seu atendimento.');
      return;
    }
    setErro('');
    const msg = `Olá! Meu nome é ${nome.trim()}. Meu telefone é ${tel.trim()}. Gostaria de um orçamento para: ${problema.trim()}`;
    trackWhatsAppConversion();
    window.open(`https://api.whatsapp.com/send?phone=5521996699191&text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <section id="contato" ref={ref} className="relative py-24 bg-[#061022] border-t border-cyan-500/15 overflow-hidden">
      <div className="relative mx-auto max-w-7xl px-5">
        <div className="grid gap-12 lg:grid-cols-2 items-start">
          {/* Coluna da Esquerda: Informações */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-400/30 text-cyan-300 text-xs font-semibold uppercase tracking-wider mb-4">
              <MessageSquare className="h-3.5 w-3.5 text-cyan-400" />
              Fale com a Gente
            </div>
            <h2 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight leading-tight">
              Tem alguma <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">dúvida?</span>
            </h2>
            <p className="mt-4 text-white/65 text-base md:text-lg leading-relaxed mb-8">
              Fale diretamente com os nossos técnicos especializados para resolver o seu problema com rapidez, segurança e o melhor custo-benefício da região.
            </p>

            <div className="space-y-4 mb-8">
              <a
                href={phoneTel}
                className="flex items-center gap-4 p-4 rounded-2xl bg-[#081835]/80 border border-cyan-500/20 hover:border-cyan-400/50 transition-colors group"
              >
                <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-400/30 flex items-center justify-center text-cyan-300 group-hover:scale-105 transition-transform">
                  <PhoneCall className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xs text-white/50 uppercase tracking-widest font-mono">Plantão Telefônico 24h</div>
                  <div className="text-lg md:text-xl font-bold text-white group-hover:text-cyan-300 transition-colors">
                    (21) 99669-9191
                  </div>
                </div>
              </a>

              <div className="flex items-center gap-4 p-4 rounded-2xl bg-[#081835]/80 border border-white/10">
                <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-400/30 flex items-center justify-center text-cyan-300">
                  <MapPin className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xs text-white/50 uppercase tracking-widest font-mono">Base Operacional</div>
                  <div className="text-sm md:text-base font-semibold text-white">
                    Rua Santos Moreira, 40 · Santa Rosa, Niterói - RJ
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 p-4 rounded-2xl bg-[#081835]/80 border border-white/10">
                <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-400/30 flex items-center justify-center text-cyan-300">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xs text-white/50 uppercase tracking-widest font-mono">Disponibilidade</div>
                  <div className="text-sm md:text-base font-semibold text-cyan-300">
                    24 Horas · 7 dias por semana · Sem taxa de visita
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Coluna da Direita: Formulário */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="rounded-3xl border border-cyan-500/30 bg-gradient-to-b from-[#081b3d] to-[#040e21] p-7 md:p-10 shadow-2xl"
          >
            <h3 className="text-2xl font-bold text-white mb-2">
              Peça seu Orçamento na Hora
            </h3>
            <p className="text-sm text-white/60 mb-6">
              Preencha os dados abaixo para abrir o chamado diretamente no WhatsApp do nosso plantão técnico.
            </p>

            <form onSubmit={handleEnviar} className="space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-white/60 mb-2">
                  Seu Nome ou Condomínio
                </label>
                <input
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex.: Carlos Oliveira / Condomínio Solar"
                  className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3.5 text-white placeholder-white/30 text-sm focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-white/60 mb-2">
                  WhatsApp para Contato
                </label>
                <input
                  type="tel"
                  value={tel}
                  onChange={(e) => setTel(e.target.value)}
                  placeholder="(21) 90000-0000"
                  className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3.5 text-white placeholder-white/30 text-sm focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-white/60 mb-2">
                  O que está acontecendo?
                </label>
                <textarea
                  rows={3}
                  value={problema}
                  onChange={(e) => setProblema(e.target.value)}
                  placeholder="Ex.: O ralo da cozinha está transbordando água e preciso de atendimento urgente."
                  className="w-full resize-none rounded-xl border border-white/10 bg-black/30 px-4 py-3.5 text-white placeholder-white/30 text-sm focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400 transition-all"
                />
              </div>

              {erro && (
                <p className="text-xs text-red-400 font-semibold bg-red-950/40 border border-red-500/30 rounded-lg p-3">
                  {erro}
                </p>
              )}

              <button
                type="submit"
                className="w-full py-4 rounded-xl btn-cyan text-white font-extrabold text-sm uppercase tracking-wider shadow-lg shadow-cyan-500/30 flex items-center justify-center gap-2 hover:brightness-110 active:scale-[0.99] transition-all"
              >
                <Send className="h-4 w-4" /> Continuar no WhatsApp com Dados Preenchidos
              </button>
              
              <p className="text-center text-[11px] text-white/40 mt-3">
                Sem taxa de visita. Pagamento somente se aprovar o orçamento.
              </p>
            </form>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
