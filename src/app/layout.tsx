import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import { CartProvider } from '@/context/CartContext';
import { Analytics } from '@vercel/analytics/react';
import { tienda } from '@/lib/config';
import './globals.css';

const anton = localFont({
  src: './fonts/anton-latin-400-normal.woff2',
  weight: '400',
  variable: '--font-anton'
});
const workSans = localFont({
  src: './fonts/work-sans-latin-wght-normal.woff2',
  weight: '100 900',
  variable: '--font-worksans'
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://casaycosas-next.vercel.app';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Casa y Cosas',
    template: '%s — Casa y Cosas'
  },
  description:
    'Tienda de hogar, mate, artesanías, perfumes y más. Catálogo online y atención por redes sociales.',
  keywords: ['tienda', 'hogar', 'artesanías', 'mate', 'perfumes', 'catálogo'],
  authors: [{ name: 'Jerson Hernández' }],
  openGraph: {
    type: 'website',
    locale: 'es_CL',
    url: siteUrl,
    siteName: 'Casa y Cosas',
    title: 'Casa y Cosas',
    description:
      'Detalles especiales para Ti y para tu Hogar. Catálogo online y atención por redes sociales.',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Casa y Cosas' }]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Casa y Cosas',
    description: 'Tienda de hogar, mate, artesanías y más.',
    images: ['/og-image.png']
  },
  icons: {
    icon: '/oveja-logo.png',
    apple: '/oveja-logo.png'
  },
  manifest: '/manifest.json',
  robots: { index: true, follow: true }
};

export const viewport: Viewport = {
  themeColor: '#344E41'
};

const localBusinessJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'OnlineStore',
  name: 'Casa y Cosas',
  description: 'Tienda de hogar, mate, artesanías, perfumes y más.',
  image: [`${siteUrl}/og-image.png`],
  url: siteUrl,
  telephone: `+${tienda.whatsappNumber}`,
  priceRange: '$$',
  sameAs: [
    tienda.instagramUrl,
    tienda.facebookUrl,
    tienda.tiktokUrl
  ]
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${anton.variable} ${workSans.variable}`}>
      <body className="font-body text-verde-noche">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessJsonLd).replace(/</g, '\\u003c') }}
        />
        <CartProvider>{children}</CartProvider>
        <Analytics />
      </body>
    </html>
  );
}