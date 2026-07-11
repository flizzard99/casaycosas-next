import Header from '@/components/Header';
import Hero from '@/components/Hero';
import FeaturedGrid from '@/components/FeaturedGrid';
import InfoLocalSection from '@/components/InfoLocalSection';
import Footer from '@/components/Footer';
import CartDrawer from '@/components/CartDrawer';
import FloatWhatsApp from '@/components/FloatWhatsApp';
import { getFeaturedProducts, getConfig, getProductosPublicos } from '@/lib/db';

export const revalidate = 60;

export default async function HomePage() {
  let featured: Awaited<ReturnType<typeof getFeaturedProducts>> = [];
  let featuredTitle = 'Productos más vendidos';
  let categorias: string[] = [];
  try {
    const [feat, config, productos] = await Promise.all([
      getFeaturedProducts(),
      getConfig(),
      getProductosPublicos()
    ]);
    featured = feat;
    featuredTitle = config.featured.title || 'Productos más vendidos';
    categorias = Array.from(new Set(productos.map((p) => p.category)));
  } catch {
    // Sin DB disponible
  }

  return (
    <>
      <Header categorias={categorias} />
      <Hero />
      <FeaturedGrid productos={featured} titulo={featuredTitle} />
      <InfoLocalSection />
      <Footer />
      <CartDrawer />
      <FloatWhatsApp />
    </>
  );
}