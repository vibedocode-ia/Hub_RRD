import type { Metadata } from 'next';
import { Outfit, Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';

const outfit = Outfit({
  subsets: ['latin'],
  weight: ['400', '600', '700', '800'],
  variable: '--font-outfit',
  display: 'swap',
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-jakarta',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'RR Desentupidora Niterói | Desentupimento 24h · (21) 99669-9191',
  description:
    'Desentupimento, limpa fossa e hidrojateamento em Niterói 24h. 5,0 ⭐ no Google com 55 avaliações. Atendemos residências, condomínios e empresas. Ligue agora!',
  keywords: [
    'desentupidora niterói', 'desentupimento niterói', 'limpa fossa niterói',
    'hidrojateamento niterói', 'desentupidora 24h', 'desentupidora são gonçalo',
  ],
  openGraph: {
    title: 'RR Desentupidora | Desentupimento 24h em Niterói',
    description: 'Desentupimento, limpa fossa e hidrojateamento. Atendimento 24h. 5,0 ⭐ no Google.',
    url: 'https://rrd.vibedocode.pro',
    siteName: 'RR Desentupidora',
    locale: 'pt_BR',
    type: 'website',
  },
  robots: { index: true, follow: true },
  alternates: { canonical: 'https://rrd.vibedocode.pro' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="pt-BR"
      className={`${outfit.variable} ${jakarta.variable}`}
      style={{ fontFamily: 'var(--font-jakarta), system-ui, sans-serif' }}
    >
      <body style={{ backgroundColor: '#050d1a' }}>{children}</body>
    </html>
  );
}
