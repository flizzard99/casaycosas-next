import type { Metadata } from 'next';
import Link from 'next/link';
import CheckoutClient from '@/components/CheckoutClient';
import Header from '@/components/Header';
import CartDrawer from '@/components/CartDrawer';
import Footer from '@/components/Footer';
import { tienda } from '@/lib/config';
import { origenCheckout } from '@/lib/mercadoPago';
import { getDatosTransferencia } from '@/lib/db';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Finalizar compra',
  robots: { index: false, follow: false }
};

export default async function ComprarPage() {
  const tarjeta = !!origenCheckout();
  const transferencia = !!await getDatosTransferencia().catch(() => null);
  return (
    <div className="shop">
      <Header />
      <main id="contenido" tabIndex={-1} className="store-shell min-h-[70vh] py-8 sm:py-12">
        <Link href="/" className="text-sm font-semibold underline">Volver a las colecciones</Link>
        <h1 className="mb-6 mt-4 font-display text-4xl">Finalizar compra</h1>
        {tarjeta || transferencia ? <CheckoutClient tarjeta={tarjeta} transferencia={transferencia} /> : (
          <section className="max-w-lg shop-panel rounded-xl border p-5" aria-labelledby="pago-no-disponible">
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
      <CartDrawer />
    </div>
  );
}
