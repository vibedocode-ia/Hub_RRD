/**
 * Google Ads & Analytics tracking helpers
 * Tag Global: AW-16945572339
 */

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
  }
}

export const GOOGLE_ADS_ID = 'AW-16945572339';
export const CONVERSION_WHATSAPP = 'AW-16945572339/vmhcCL6czc4aEPPTo5A_';
export const CONVERSION_PAGEVIEW = 'AW-16945572339/4ds4CJ-zzc4aEPPTo5A_';

/**
 * Dispara conversão do Google Ads de clique/contato no WhatsApp
 * e opcionalmente dispara evento correspondente no Meta Pixel.
 */
export function trackWhatsAppConversion(url?: string) {
  if (typeof window !== 'undefined') {
    // Meta Pixel Contact
    if (typeof window.fbq === 'function') {
      window.fbq('track', 'Contact');
    }

    // Google Ads Conversion
    if (typeof window.gtag === 'function') {
      window.gtag('event', 'conversion', {
        send_to: CONVERSION_WHATSAPP,
        event_callback: () => {
          if (url) window.location.href = url;
        },
        event_timeout: 2000,
      });
      return;
    }
  }

  if (url && typeof window !== 'undefined') {
    window.location.href = url;
  }
}
