import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import CartDrawer from '@/components/CartDrawer';
import { origenCheckout } from '@/lib/mercadoPago';
import CategoriaClient from '@/components/CategoriaClient';
import { getProductosPublicos } from '@/lib/db';

export const revalidate = 60;
export const dynamicParams = true;

export async function generateMetadata({ params }: { params: { categoria: string } }): Promise<Metadata> {
  const categoria = decodeURIComponent(params.categoria);
  const capitalizada = categoria.charAt(0).toUpperCase() + categoria.slice(1);
  return {
    title: `${capitalizada} — Catálogo`,
    description: `Productos de la categoría "${capitalizada}" en Casa y Cosas.`,
    alternates: { canonical: `/catalogo/${encodeURIComponent(categoria)}` }
  };
}

export default async function CategoriaPage({ params }: { params: { categoria: string } }) {
  const categoria = decodeURIComponent(params.categoria);

  let productos: Awaited<ReturnType<typeof getProductosPublicos>> = [];
  try {
    productos = await getProductosPublicos();
  } catch (error) {
    console.error('Error al cargar productos:', error);
  }

  const todos = Array.from(new Set(productos.map((p) => p.category)));
  if (!todos.includes(categoria)) notFound();

  const productosCategoria = productos.filter((p) => p.category === categoria);

  return (
    <>
      <Header categorias={todos} />
      <main id="contenido" tabIndex={-1} className="min-h-[60vh] bg-crema/30">
        <div className="store-shell pt-10 md:pt-14">
          <Link href="/catalogo" className="text-sm text-verde hover:text-verde-oscuro mb-4 inline-block">
            ← Volver al catálogo
          </Link>
          <h1 className="font-display text-3xl md:text-4xl text-verde-oscuro mb-2 capitalize">{categoria}</h1>
          <p className="text-sm text-verde-noche/70 mb-2">
            {productosCategoria.length} producto{productosCategoria.length !== 1 ? 's' : ''} en esta categoría.
          </p>
        </div>

        <CategoriaClient key={categoria} productos={productosCategoria} />
      </main>
      <Footer />
      <CartDrawer pagoEnLinea={!!origenCheckout()} />
    </>
  );
}