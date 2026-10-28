import type { Metadata } from 'next';
import { Outfit, Plus_Jakarta_Sans } from 'next/font/google';
import Script from 'next/script';
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
    url: 'https://www.rrdesentupidora.com.br',
    siteName: 'RR Desentupidora',
    locale: 'pt_BR',
    type: 'website',
  },
  robots: { index: true, follow: true },
  alternates: { canonical: 'https://www.rrdesentupidora.com.br' },
  icons: { icon: '/favicon.jpg', apple: '/favicon.jpg' },
};

const schemaOrgData = {
  '@context': 'https://schema.org',
  '@type': 'PlumbingService',
  name: 'RR Desentupidora e Dedetizadora LTDA',
  alternateName: 'RR Desentupidora Niterói',
  image: 'https://www.rrdesentupidora.com.br/assets/logo-horizontal.png',
  url: 'https://www.rrdesentupidora.com.br',
  telephone: '+5521996699191',
  priceRange: '$$',
  address: {
    '@type': 'PostalAddress',
    streetAddress: 'Rua Santos Moreira, 40',
    addressLocality: 'Santa Rosa, Niterói',
    addressRegion: 'RJ',
    postalCode: '24240-000',
    addressCountry: 'BR',
  },
  geo: {
    '@type': 'GeoCoordinates',
    latitude: -22.9056,
    longitude: -43.1028,
  },
  openingHoursSpecification: [
    {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: [
        'Monday',
        'Tuesday',
        'Wednesday',
        'Thursday',
        'Friday',
        'Saturday',
        'Sunday',
      ],
      opens: '00:00',
      closes: '23:59',
    },
  ],
  aggregateRating: {
    '@type': 'AggregateRating',
    ratingValue: '5.0',
    reviewCount: '55',
  },
  areaServed: [
    'Niterói',
    'São Gonçalo',
    'Maricá',
    'Itaboraí',
    'Icaraí',
    'Santa Rosa',
    'Centro',
    'São Francisco',
    'Região Oceânica',
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="pt-BR"
      className={`${outfit.variable} ${jakarta.variable}`}
      style={{ fontFamily: 'var(--font-jakarta), system-ui, sans-serif' }}
    >
      <head>
        {/* Google Tag Manager */}
        <Script
          id="gtm-base"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-K79FGSPK');`,
          }}
        />
        {/* Meta Pixel */}
        <Script
          id="meta-pixel"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '1549206810258910');
fbq('track', 'PageView');`,
          }}
        />
        <noscript>
          <img
            height="1"
            width="1"
            style={{ display: 'none' }}
            src="https://www.facebook.com/tr?id=1549206810258910&ev=PageView&noscript=1"
            alt=""
          />
        </noscript>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaOrgData) }}
        />
      </head>
      <body style={{ backgroundColor: '#050d1a' }}>
        {/* Google Tag Manager (noscript) */}
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-K79FGSPK"
            height="0"
            width="0"
            style={{ display: 'none', visibility: 'hidden' }}
          />
        </noscript>
        {children}
      </body>
    </html>
  );
}
