import type { Metadata } from 'next';
import { Anton, Work_Sans } from 'next/font/google';
import { CartProvider } from '@/context/CartContext';
import './globals.css';

const anton = Anton({ subsets: ['latin'], weight: '400', variable: '--font-anton' });
const workSans = Work_Sans({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-worksans' });

export const metadata: Metadata = {
  title: 'Casa y Cosas — Panguipulli',
  description:
    'Tienda de hogar, mate, artesanías, perfumes y más en Panguipulli, Región de Los Ríos. Catálogo online, retiro en tienda y pedidos por WhatsApp.'
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
