import type { Metadata } from 'next';
import './globals.css';
import { APP_NAME, APP_DESCRIPTION } from '@/lib/version';

export const metadata: Metadata = {
  title: `${APP_NAME} — Desentupidora 24h em Niterói/RJ`,
  description: APP_DESCRIPTION,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body style={{ backgroundColor: '#050d1a' }}>{children}</body>
    </html>
  );
}
