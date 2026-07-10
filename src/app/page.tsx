import Header from '@/components/Header';
import Hero from '@/components/Hero';
import CatalogClient from '@/components/CatalogClient';
import RedesSection from '@/components/RedesSection';
import MapSection from '@/components/MapSection';
import Footer from '@/components/Footer';
import CartDrawer from '@/components/CartDrawer';

export default function HomePage() {
  return (
    <>
      <Header />
      <Hero />
      <CatalogClient />
      <RedesSection />
      <MapSection />
      <Footer />
      <CartDrawer />
    </>
  );
}
