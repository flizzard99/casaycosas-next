import type { Metadata } from 'next';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import CartDrawer from '@/components/CartDrawer';
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
  const [resultado, config] = await Promise.allSettled([getProductosPublicos(), getConfig()]);
  if (resultado.status === 'fulfilled') productos = resultado.value;
  if (config.status === 'fulfilled') categoryOrder = config.value.categoryOrder;

  const categorias = Array.from(new Set(productos.map((p) => p.category)));

  return (
    <>
      <Header categorias={categorias} />
      <main id="contenido" tabIndex={-1} className="min-h-[60vh] bg-crema/30">
        <div className="store-shell pt-10 md:pt-14">
          <Link href="/" className="text-sm text-verde hover:text-verde-oscuro mb-4 inline-block">
            ← Volver al inicio
          </Link>
          <h1 className="font-display text-3xl md:text-4xl text-verde-oscuro mb-2">Todos los productos</h1>
        </div>
        {resultado.status === 'fulfilled' ? (
          <CatalogClient productosIniciales={productos} categoryOrder={categoryOrder} />
        ) : (
          <p className="store-shell py-6" role="status">El catálogo está temporalmente fuera de servicio. Vuelve a intentarlo en unos minutos.</p>
        )}
      </main>
      <Footer />
      <CartDrawer />
    </>
  );
}