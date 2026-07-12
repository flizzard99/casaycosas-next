import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import dynamic from 'next/dynamic';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import CartDrawer from '@/components/CartDrawer';
import FloatWhatsApp from '@/components/FloatWhatsApp';
import { getProductoById, getProductosPublicos } from '@/lib/db';

const ProductDetailClient = dynamic(() => import('@/components/ProductDetailClient'), { ssr: false });

export const revalidate = 60;
export const dynamicParams = true;

export async function generateStaticParams() {
  try {
    const productos = await getProductosPublicos();
    return productos.map((p) => ({ id: String(p.id) }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  try {
    const producto = await getProductoById(Number(params.id));
    if (!producto) return { title: 'Producto no encontrado' };
    return {
      title: `${producto.name} — Casa y Cosas`,
      description:
        producto.description || `${producto.name} en Casa y Cosas, Panguipulli. ${producto.category}.`,
      alternates: { canonical: `/producto/${producto.id}` },
      openGraph: {
        title: producto.name,
        description: producto.description || `${producto.name} — ${producto.category}`,
        images: producto.images?.length ? producto.images : producto.image_url ? [producto.image_url] : []
      }
    };
  } catch {
    return { title: 'Casa y Cosas' };
  }
}

export default async function ProductoPage({ params }: { params: { id: string } }) {
  const producto = await getProductoById(Number(params.id));
  if (!producto || !producto.visible) notFound();

  let categorias: string[] = [];
  let relacionados: Awaited<ReturnType<typeof getProductosPublicos>> = [];
  try {
    const todos = await getProductosPublicos();
    categorias = Array.from(new Set(todos.map((p) => p.category)));
    relacionados = todos
      .filter((p) => p.category === producto.category && p.id !== producto.id && p.stock > 0)
      .slice(0, 4);
  } catch {
    categorias = [];
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://casaycosas-next.vercel.app';
  const productJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: producto.name,
    description: producto.description || `${producto.name} — ${producto.category}`,
    category: producto.category,
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
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />
      <Header categorias={categorias} />
      <main className="min-h-[60vh] bg-crema/40">
        <ProductDetailClient producto={producto} relacionados={relacionados} />
      </main>
      <Footer />
      <CartDrawer />
      <FloatWhatsApp />
    </>
  );
}