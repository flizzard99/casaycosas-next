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
          <section className="max-w-lg rounded-xl border border-verde-noche/15 bg-white p-5" aria-labelledby="pago-no-disponible">
            <h2 id="pago-no-disponible" className="font-semibold">El pago en línea aún no está disponible</h2>
            <p className="mt-2 text-sm">Tus productos siguen en el carrito. Puedes volver a intentar más tarde.</p>
            <a href={tienda.whatsappUrl} target="_blank" rel="noopener noreferrer"
              className="mt-2 inline-flex min-h-11 items-center text-sm font-semibold underline">
              Consultar por WhatsApp
            </a>
          </section>
        )}
      </main>
      <Footer />
    </>
  );
}
