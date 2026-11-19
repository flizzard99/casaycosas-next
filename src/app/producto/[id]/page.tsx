import { LINEAS, lineaProducto } from '@/lib/lineas';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { cache } from 'react';
import ProductDetailClient from '@/components/ProductDetailClient';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import CartDrawer from '@/components/CartDrawer';
import { getProductoById, getProductosPublicos } from '@/lib/db';

const getProducto = cache((id: number) => getProductoById(id));

export const revalidate = 60;
export const dynamicParams = true;

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  try {
    const producto = await getProducto(Number(params.id));
    const linea = producto?.visible && lineaProducto(producto);
    if (!producto || !linea) return { title: 'Producto no encontrado', robots: { index: false, follow: false } };
    return {
      title: producto.name,
      description:
        producto.description || `${producto.name} en Casa y Cosas. ${LINEAS[linea].nombre}.`,
      alternates: { canonical: `/producto/${producto.id}` },
      openGraph: {
        title: producto.name,
        description: producto.description || `${producto.name} — ${LINEAS[linea].nombre}`,
        images: producto.images?.length ? producto.images : producto.image_url ? [producto.image_url] : []
      }
    };
  } catch {
    return { title: 'Casa y Cosas' };
  }
}

export default async function ProductoPage({ params }: { params: { id: string } }) {
  const producto = await getProducto(Number(params.id));
  const linea = producto?.visible && lineaProducto(producto);
  if (!producto || !linea) notFound();

  let relacionados: Awaited<ReturnType<typeof getProductosPublicos>> = [];
  try {
    const todos = await getProductosPublicos();
    relacionados = todos
      .filter((p) => lineaProducto(p) === linea && p.id !== producto.id && p.stock > 0)
      .slice(0, 4);
  } catch {
    relacionados = [];
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://casaycosas-next.vercel.app';
  const productJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: producto.name,
    description: producto.description || `${producto.name} — ${LINEAS[linea].nombre}`,
    category: LINEAS[linea].nombre,
    image: producto.images?.length ? producto.images : producto.image_url ? [producto.image_url] : [],
    offers: {
      '@type': 'Offer',
      price: producto.price,
      priceCurrency: 'CLP',
      availability: producto.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      url: `${siteUrl}/producto/${producto.id}`,
      seller: { '@type': 'Store', name: 'Casa y Cosas' }
    }
  };

  return (
    <div className="shop" data-linea={linea}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd).replace(/</g, '\\u003c') }}
      />
      <Header linea={linea} />
      <main id="contenido" tabIndex={-1} className="min-h-[60vh]">
        <ProductDetailClient linea={linea} producto={producto} relacionados={relacionados} />
      </main>
      <Footer />
      <CartDrawer />
    </div>
  );
}