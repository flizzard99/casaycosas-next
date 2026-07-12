import type { Metadata, Viewport } from 'next';
import { Anton, Work_Sans } from 'next/font/google';
import { CartProvider } from '@/context/CartContext';
import { Analytics } from '@vercel/analytics/react';
import { tienda } from '@/lib/config';
import './globals.css';

const anton = Anton({ subsets: ['latin'], weight: '400', variable: '--font-anton' });
const workSans = Work_Sans({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-worksans' });

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://casaycosas-next.vercel.app';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Casa y Cosas — Panguipulli',
    template: '%s — Casa y Cosas'
  },
  description:
    'Tienda de hogar, mate, artesanías, perfumes y más en Panguipulli, Región de Los Ríos. Catálogo online, retiro en tienda y pedidos por WhatsApp.',
  keywords: ['Panguipulli', 'tienda', 'hogar', 'artesanías', 'mate', 'perfumes', 'Los Ríos', 'catálogo'],
  authors: [{ name: 'Jerson Hernández' }],
  openGraph: {
    type: 'website',
    locale: 'es_CL',
    url: siteUrl,
    siteName: 'Casa y Cosas — Panguipulli',
    title: 'Casa y Cosas — Panguipulli',
    description:
      'Detalles especiales para Ti y para tu Hogar. Catálogo online, retiro en tienda y pedidos por WhatsApp.',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Casa y Cosas — Panguipulli' }]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Casa y Cosas — Panguipulli',
    description: 'Tienda de hogar, mate, artesanías y más en Panguipulli.',
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
  '@type': 'Store',
  name: 'Casa y Cosas',
  description: 'Tienda de hogar, mate, artesanías, perfumes y más en Panguipulli, Región de Los Ríos.',
  image: [`${siteUrl}/og-image.png`],
  url: siteUrl,
  telephone: `+56${tienda.whatsappNumber}`,
  priceRange: '$$',
  address: {
    '@type': 'PostalAddress',
    streetAddress: tienda.storeAddress,
    addressLocality: 'Panguipulli',
    addressRegion: 'Los Ríos',
    addressCountry: 'CL'
  },
  geo: {
    '@type': 'GeoCoordinates',
    latitude: -39.6476,
    longitude: -72.4717
  },
  openingHoursSpecification: [
    {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
      opens: '10:00',
      closes: '20:00'
    }
  ],
  hasMap: tienda.mapsUrl,
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
          dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessJsonLd) }}
        />
        <CartProvider>{children}</CartProvider>
        <Analytics />
      </body>
    </html>
  );
}