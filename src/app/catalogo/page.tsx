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
  description: 'Catálogo completo de Casa y Cosas. Hogar, mate, artesanías, perfumes y más.'
};

export default async function CatalogoPage() {
  let productos: Awaited<ReturnType<typeof getProductosPublicos>> = [];
  let categoryOrder: string[] = [];
  const [resultado, config] = await Promise.allSettled([getProductosPublicos(), getConfig()]);
  if (resultado.status === 'fulfilled') productos = resultado.value;
  if (config.status === 'fulfilled') categoryOrder = config.value.categoryOrder;

  const disponibles = new Set(productos.map((producto) => producto.category));
  const categorias = [...new Set(categoryOrder)]
    .filter((categoria) => disponibles.delete(categoria))
    .concat([...disponibles].sort((a, b) => a.localeCompare(b, 'es-CL')));

  return (
    <>
      <Header categorias={categorias} />
      <main id="contenido" tabIndex={-1} className="min-h-[60vh]">
        <div className="border-b border-verde-noche/10 bg-crema/35">
          <div className="store-shell py-8 sm:py-12">
            <Link href="/" className="mb-3 inline-block text-sm font-semibold text-verde-oscuro hover:underline">
              ← Inicio
            </Link>
            <h1 className="font-display text-4xl text-verde-noche sm:text-5xl">Catálogo</h1>
          </div>
        </div>
        {resultado.status === 'fulfilled' ? (
          <CatalogClient productos={productos} categorias={categorias} />
        ) : (
          <p className="store-shell py-6" role="status">El catálogo está temporalmente fuera de servicio. Vuelve a intentarlo en unos minutos.</p>
        )}
      </main>
      <Footer />
      <CartDrawer />
    </>
  );
}