import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import CartDrawer from '@/components/CartDrawer';
import FloatWhatsApp from '@/components/FloatWhatsApp';
import CategoriaClient from '@/components/CategoriaClient';
import { getProductosPublicos, getConfig } from '@/lib/db';

export const revalidate = 60;
export const dynamicParams = true;

export async function generateStaticParams() {
  try {
    const productos = await getProductosPublicos();
    const categorias = Array.from(new Set(productos.map((p) => p.category)));
    return categorias.map((cat) => ({ categoria: encodeURIComponent(cat) }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: { params: { categoria: string } }): Promise<Metadata> {
  const categoria = decodeURIComponent(params.categoria);
  return {
    title: `${categoria} — Catálogo`,
    description: `Productos de la categoría "${categoria}" en Casa y Cosas, Panguipulli.`,
    alternates: { canonical: `/catalogo/${encodeURIComponent(categoria)}` }
  };
}

export default async function CategoriaPage({ params }: { params: { categoria: string } }) {
  const categoria = decodeURIComponent(params.categoria);

  let productos: Awaited<ReturnType<typeof getProductosPublicos>> = [];
  try {
    productos = await getProductosPublicos();
  } catch {
    // Sin DB
  }

  const todos = Array.from(new Set(productos.map((p) => p.category)));
  if (!todos.includes(categoria)) notFound();

  let categoryOrder: string[] = [];
  try {
    const config = await getConfig();
    categoryOrder = config.categoryOrder;
  } catch {
    // ignore
  }

  const productosCategoria = productos.filter((p) => p.category === categoria);

  return (
    <>
      <Header categorias={todos} />
      <main className="min-h-[60vh] bg-crema/30">
        <div className="px-6 md:px-14 pt-14 md:pt-20 pb-0">
          <a href="/catalogo" className="text-sm text-verde hover:text-verde-oscuro mb-4 inline-block">
            ← Volver al catálogo
          </a>
          <h1 className="font-display text-3xl md:text-4xl text-verde-oscuro mb-2 capitalize">{categoria}</h1>
          <p className="text-sm text-verde-noche/70 mb-2">
            {productosCategoria.length} producto{productosCategoria.length !== 1 ? 's' : ''} en esta categoría.
          </p>
        </div>

        <CategoriaClient key={categoria} productos={productosCategoria} />
      </main>
      <Footer />
      <CartDrawer />
      <FloatWhatsApp />
    </>
  );
}