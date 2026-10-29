'use client';

import React, { useState, useEffect } from 'react';
import { Phone, MessageCircle } from 'lucide-react';
import { trackWhatsAppConversion } from '@/lib/tracking';

interface StickyMobileCtaProps {
  waLink?: string;
  phoneTel?: string;
}

export default function StickyMobileCta({
  waLink = 'https://api.whatsapp.com/send?phone=5521996699191&text=Ol%C3%A1!%20Vi%20o%20site%20da%20RR%20Desentupidora%20e%20gostaria%20de%20solicitar%20um%20or%C3%A7amento.',
  phoneTel = 'tel:5521996699191',
}: StickyMobileCtaProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Exibir após o visitante rolar 350px (passando da primeira dobra)
      setVisible(window.scrollY > 350);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (!visible) return null;

  return (
    <aside
      aria-label="Ações rápidas de contato emergencial"
      className="md:hidden fixed bottom-0 inset-x-0 z-50 p-3 bg-[#050d1a]/95 backdrop-blur-lg border-t border-cyan-500/30 shadow-[0_-8px_25px_rgba(0,0,0,0.6)] animate-in fade-in slide-in-from-bottom-4 duration-300"
    >
      <div className="grid grid-cols-2 gap-2.5 max-w-md mx-auto">
        <a
          href={phoneTel}
          className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-[#10acf0] to-[#0A4A8F] text-white font-bold text-sm shadow-[0_0_15px_rgba(16,172,240,0.4)] active:scale-95 transition-transform"
          aria-label="Ligar Agora para plantão 24h"
        >
          <Phone className="h-4 w-4 fill-white text-white" />
          <span>Ligar 24h</span>
        </a>

        <a
          href={waLink}
          target="_blank"
          rel="noreferrer"
          onClick={() => trackWhatsAppConversion()}
          className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#25D366] text-white font-bold text-sm shadow-[0_0_15px_rgba(37,211,102,0.35)] active:scale-95 transition-transform"
          aria-label="Chamar no WhatsApp"
        >
          <MessageCircle className="h-4 w-4 fill-white text-white" />
          <span>WhatsApp</span>
        </a>
      </div>
    </aside>
  );
}
