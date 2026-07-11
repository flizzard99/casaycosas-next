import type { Metadata, Viewport } from 'next';
import { Anton, Work_Sans } from 'next/font/google';
import { CartProvider } from '@/context/CartContext';
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
    images: [{ url: '/logo.png', width: 400, height: 400, alt: 'Casa y Cosas' }]
  },
  twitter: {
    card: 'summary',
    title: 'Casa y Cosas — Panguipulli',
    description: 'Tienda de hogar, mate, artesanías y más en Panguipulli.',
    images: ['/logo.png']
  },
  icons: {
    icon: '/logo.png',
    apple: '/logo.png'
  },
  robots: { index: true, follow: true }
};

export const viewport: Viewport = {
  themeColor: '#344E41'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${anton.variable} ${workSans.variable}`}>
      <body className="font-body text-verde-noche">
        <CartProvider>{children}</CartProvider>
      </body>
    </html>
  );
}