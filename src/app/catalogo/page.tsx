import type { Metadata } from 'next';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import CartDrawer from '@/components/CartDrawer';
import FloatWhatsApp from '@/components/FloatWhatsApp';
import CatalogClient from '@/components/CatalogClient';
import { getProductosPublicos, getConfig } from '@/lib/db';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Catálogo',
  description: 'Catálogo completo de Casa y Cosas. Hogar, mate, artesanías, perfumes y más en Panguipulli.'
};

export default async function CatalogoPage() {
  let productos: Awaited<ReturnType<typeof getProductosPublicos>> = [];
  let categoryOrder: string[] = [];
  try {
    const [p, config] = await Promise.all([getProductosPublicos(), getConfig()]);
    productos = p;
    categoryOrder = config.categoryOrder;
  } catch {
    // Sin DB disponible
  }

  const categorias = Array.from(new Set(productos.map((p) => p.category)));

  return (
    <>
      <Header categorias={categorias} />
      <main className="min-h-[60vh] bg-crema/30">
        <div className="px-6 md:px-14 pt-14 md:pt-20 pb-0">
          <Link href="/" className="text-sm text-verde hover:text-verde-oscuro mb-4 inline-block">
            ← Volver al inicio
          </Link>
          <h1 className="font-display text-3xl md:text-4xl text-verde-oscuro mb-2">Todos los productos</h1>
          <p className="text-sm text-verde-noche/70 mb-2">
            Explora nuestro catálogo completo, filtrado por categoría.
          </p>
        </div>
        <CatalogClient productosIniciales={productos} categoryOrder={categoryOrder} />
      </main>
      <Footer />
      <CartDrawer />
      <FloatWhatsApp />
    </>
  );
}