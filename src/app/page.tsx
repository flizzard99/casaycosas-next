import Header from '@/components/Header';
import Hero from '@/components/Hero';
import CatalogClient from '@/components/CatalogClient';
import RedesSection from '@/components/RedesSection';
import MapSection from '@/components/MapSection';
import Footer from '@/components/Footer';
import CartDrawer from '@/components/CartDrawer';
import FloatWhatsApp from '@/components/FloatWhatsApp';
import { getProductosPublicos, getConfig } from '@/lib/db';

// Revalida cada 60 segundos (ISR): productos frescos sin sacrificar SSR/SEO
export const revalidate = 60;

export default async function HomePage() {
  let productos: Awaited<ReturnType<typeof getProductosPublicos>> = [];
  let categoryOrder: string[] = [];
  try {
    const [p, config] = await Promise.all([getProductosPublicos(), getConfig()]);
    productos = p;
    categoryOrder = config.categoryOrder;
  } catch {
    // Sin DB disponible (ej. build local sin DATABASE_URL): renderiza vacío.
    // En producción con DB configurada se pobla en build time (SSR + ISR).
  }

  return (
    <>
      <Header categorias={Array.from(new Set(productos.map((p) => p.category)))} />
      <Hero />
      <CatalogClient productosIniciales={productos} categoryOrder={categoryOrder} />
      <RedesSection />
      <MapSection />
      <Footer />
      <CartDrawer />
      <FloatWhatsApp />
    </>
  );
}