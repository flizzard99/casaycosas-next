import type { Metadata } from 'next';
import Link from 'next/link';
import CheckoutClient from '@/components/CheckoutClient';
import Footer from '@/components/Footer';
import { tienda } from '@/lib/config';
import { origenCheckout } from '@/lib/mercadoPago';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Finalizar compra',
  robots: { index: false, follow: false }
};

export default function ComprarPage() {
  return (
    <>
      <main className="store-shell min-h-[70vh] py-8 sm:py-12">
        <Link href="/catalogo" className="text-sm font-semibold underline">Volver al catálogo</Link>
        <h1 className="mb-6 mt-4 font-display text-4xl">Finalizar compra</h1>
        {origenCheckout() ? <CheckoutClient /> : (
          <p>El pago en línea aún no está disponible. Escríbenos por <a href={tienda.whatsappUrl} className="underline">WhatsApp</a> para hacer tu pedido.</p>
        )}
      </main>
      <Footer />
    </>
  );
}
