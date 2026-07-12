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
    const set = new Set(productos.map((p) => p.category));
    const enOrden = config.categoryOrder.filter((c) => set.has(c));
    const resto = [...set].filter((c) => !config.categoryOrder.includes(c)).sort();
    categorias = [...enOrden, ...resto];
  } catch {
    // Sin DB disponible
  }

  return (
    <>
      <Header categorias={categorias} />
      <Hero />
      <div
        style={{
          backgroundImage: 'url(/patron-seamless.png)',
          backgroundSize: 'cover',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center'
        }}
      >
        <FeaturedGrid productos={featured} titulo={featuredTitle} />
        <InfoLocalSection />
      </div>
      <Footer />
      <CartDrawer />
      <FloatWhatsApp />
    </>
  );
}