import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import ProductDetailClient from '@/components/ProductDetailClient';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import CartDrawer from '@/components/CartDrawer';
import FloatWhatsApp from '@/components/FloatWhatsApp';
import { getProductoById, getProductosPublicos } from '@/lib/db';

export const revalidate = 60;

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
  try {
    const todos = await getProductosPublicos();
    categorias = Array.from(new Set(todos.map((p) => p.category)));
  } catch {
    categorias = [];
  }

  return (
    <>
      <Header categorias={categorias} />
      <main className="min-h-[60vh] bg-crema/40">
        <ProductDetailClient producto={producto} />
      </main>
      <Footer />
      <CartDrawer />
      <FloatWhatsApp />
    </>
  );
}