import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import CartDrawer from '@/components/CartDrawer';
import { origenCheckout } from '@/lib/mercadoPago';
import CatalogClient from '@/components/CatalogClient';
import { getProductosPublicos } from '@/lib/db';

export const revalidate = 60;
export const dynamicParams = true;

function decodificarCategoria(categoria: string) {
  try {
    return decodeURIComponent(categoria);
  } catch {
    return categoria;
  }
}

export async function generateMetadata({ params }: { params: { categoria: string } }): Promise<Metadata> {
  const categoria = decodificarCategoria(params.categoria);
  const capitalizada = categoria.charAt(0).toUpperCase() + categoria.slice(1);
  return {
    title: `${capitalizada} — Catálogo`,
    description: `Productos de la categoría "${capitalizada}" en Casa y Cosas.`,
    alternates: { canonical: `/catalogo/${encodeURIComponent(categoria)}` }
  };
}

export default async function CategoriaPage({ params }: { params: { categoria: string } }) {
  const categoria = decodificarCategoria(params.categoria);

  const productos = await getProductosPublicos();

  const todos = Array.from(new Set(productos.map((p) => p.category)));
  if (!todos.includes(categoria)) notFound();

  const productosCategoria = productos.filter((p) => p.category === categoria);

  return (
    <>
      <Header categorias={todos} />
      <main id="contenido" tabIndex={-1} className="min-h-[60vh]">
        <div className="border-b border-verde-noche/10 bg-crema/35">
          <div className="store-shell py-8 sm:py-12">
            <Link href="/catalogo" className="mb-3 inline-block text-sm font-semibold text-verde-oscuro hover:underline">
              ← Todo el catálogo
            </Link>
            <h1 className="balance-text font-display text-4xl capitalize text-verde-noche sm:text-5xl">{categoria}</h1>
          </div>
        </div>

        <CatalogClient key={categoria} productos={productosCategoria} categorias={todos} categoriaActual={categoria} />
      </main>
      <Footer />
      <CartDrawer pagoEnLinea={!!origenCheckout()} />
    </>
  );
}