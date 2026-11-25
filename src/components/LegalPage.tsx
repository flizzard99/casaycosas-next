import type { ReactNode } from 'react';
import Link from 'next/link';
import Header from './Header';
import Footer from './Footer';
import CartDrawer from './CartDrawer';
import { tienda } from '@/lib/config';
import { DATOS_VENDEDOR, ENLACES_LEGALES, FECHA_LEGAL } from '@/lib/legal';

export default function LegalPage({ titulo, introduccion, fecha = FECHA_LEGAL, children }: { titulo: string; introduccion: string; fecha?: string; children: ReactNode }) {
  return (
    <div className="shop flex min-h-screen flex-col">
      <Header />
      <main id="contenido" tabIndex={-1} className="store-shell flex-1 py-10 sm:py-16">
        <header className="mx-auto max-w-3xl">
          <p className="shop-accent text-sm font-semibold uppercase tracking-[0.15em]">Información legal</p>
          <h1 className="shop-display mt-2 text-4xl leading-tight sm:text-5xl">{titulo}</h1>
          <p className="shop-muted mt-4 max-w-2xl text-base leading-7">{introduccion}</p>
          <p className="shop-muted mt-3 text-sm">Última actualización: {fecha}</p>
        </header>

        <nav aria-label="Políticas de la tienda" className="mx-auto my-8 flex max-w-3xl flex-wrap gap-2">
          {ENLACES_LEGALES.map(({ href, label }) => (
            <Link key={href} href={href} className="shop-chip">{label}</Link>
          ))}
        </nav>

        <article className="legal-content shop-panel mx-auto max-w-3xl rounded-2xl border p-5 sm:p-8">
          {children}
          <section>
            <h2>Contacto del vendedor</h2>
            <p><strong>{DATOS_VENDEDOR.razonSocial}</strong>, RUT {DATOS_VENDEDOR.rut}, nombre de fantasía {DATOS_VENDEDOR.nombreFantasia}, con domicilio en {DATOS_VENDEDOR.domicilio}.</p>
            <p>Ayuda con pedidos, facturas y solicitudes de privacidad por <a href={tienda.whatsappUrl} target="_blank" rel="noopener noreferrer">WhatsApp</a>.</p>
            <p>Correo del vendedor: <a href={`mailto:${DATOS_VENDEDOR.email}`}>{DATOS_VENDEDOR.email}</a>.</p>
          </section>
        </article>
      </main>
      <Footer />
      <CartDrawer />
    </div>
  );
}
