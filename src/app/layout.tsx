import type { Metadata } from 'next';
import './globals.css';
import { APP_NAME, APP_DESCRIPTION, VERSION } from '@/lib/version';

export const metadata: Metadata = {
  title: `${APP_NAME} — Desentupidora 24h em Niterói/RJ`,
  description: APP_DESCRIPTION,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>
        {children}
        <footer
          style={{
            padding: '1rem',
            textAlign: 'center',
            fontSize: '.75rem',
            color: '#8890a0',
            borderTop: '1px solid #eef0f4',
          }}
        >
          {APP_NAME} · VibeDoCode{' '}
          <span style={{ fontFamily: 'monospace', opacity: .6 }}>{VERSION}</span>
        </footer>
      </body>
    </html>
  );
}
