import type { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import CartDrawer from '@/components/CartDrawer';
import SeguimientoForm from '@/components/SeguimientoForm';

export const metadata: Metadata = {
  title: 'Seguir mi pedido',
  description: 'Consulta el estado de tu pedido de Casa y Cosas.',
  robots: { index: false, follow: false }
};

export default function SeguimientoPage() {
  return (
    <div className="shop flex min-h-screen flex-col">
      <Header />
      <main id="contenido" tabIndex={-1} className="store-shell flex-1 py-10 sm:py-16">
        <div className="mx-auto mb-7 max-w-lg text-center">
          <p className="shop-accent text-sm font-semibold uppercase tracking-[0.16em]">Estado de compra</p>
          <h1 className="shop-display mt-2 text-4xl sm:text-5xl">Seguir mi pedido</h1>
          <p className="shop-muted mt-3">Ingresa el código recibido al finalizar la compra y tu correo.</p>
        </div>
        <SeguimientoForm />
      </main>
      <Footer />
      <CartDrawer />
    </div>
  );
}
