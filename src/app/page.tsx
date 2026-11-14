import Header from '@/components/Header';
import CatalogUnavailable from '@/components/CatalogUnavailable';
import Hero from '@/components/Hero';
import FeaturedGrid from '@/components/FeaturedGrid';
import InfoLocalSection from '@/components/InfoLocalSection';
import Footer from '@/components/Footer';
import CartDrawer from '@/components/CartDrawer';
import FloatWhatsApp from '@/components/FloatWhatsApp';
import { getFeaturedProducts, getConfig, getProductosPublicos } from '@/lib/db';

export const revalidate = 60;

export default async function HomePage() {
  let disponible = true;
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
  } catch (error) {
    disponible = false;
    console.error('Error al cargar datos del home:', error);
  }

  return (
    <>
      <Header categorias={categorias} />
      <main id="contenido">
      <Hero />
      {!disponible && <CatalogUnavailable />}
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
      </main>
      <Footer />
      <CartDrawer />
      <FloatWhatsApp />
    </>
  );
}