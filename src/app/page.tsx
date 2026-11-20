import Image from 'next/image';
import Link from 'next/link';
import Header from '@/components/Header';
import SocialSection from '@/components/SocialSection';
import Footer from '@/components/Footer';
import CartDrawer from '@/components/CartDrawer';
import { getConfig } from '@/lib/db';
import { LINEAS } from '@/lib/lineas';

export const revalidate = 60;

export default async function HomePage() {
  const config = await getConfig().catch(() => null);
  return (
    <div className="shop">
      <Header />
      <main id="contenido" tabIndex={-1}>
        <div className="store-shell shop-home">
          <div className="shop-home-heading">
            <Image src="/oveja-logo.png" alt="" width={58} height={61} unoptimized />
            <h1>Casa y Cosas</h1>
            <p>Elige tu sección</p>
          </div>
          <div className="shop-collections">
            {(['matera', 'cristiana'] as const).map((linea) => {
              const coleccion = LINEAS[linea];
              return (
                <Link key={linea} href={coleccion.href} prefetch={false} data-linea={linea} className="shop-collection">
                  <div className="shop-collection-photo">
                    <Image src={config?.diseno[linea]?.imagen || coleccion.imagen} alt="" fill sizes="(min-width: 1280px) 580px, (min-width: 640px) 47vw, 92vw"
                      priority />
                  </div>
                  <div className="shop-collection-content">
                    <h2>Sección {coleccion.nombre}</h2>
                    <p>{coleccion.descripcion}</p>
                    <span className="shop-collection-link">Explorar {coleccion.nombre} <span aria-hidden="true">→</span></span>
                  </div>
                </Link>
              );
            })}
          </div>
          <Link href={LINEAS.remate.href} prefetch={false} className="shop-clearance-entry">
            {config?.diseno.remate?.imagen && (
              <Image src={config.diseno.remate.imagen} alt="" width={90} height={64} className="h-16 w-24 rounded object-cover" />
            )}
            <div>
              <h2>{LINEAS.remate.titulo}</h2>
              <p className="shop-muted">{LINEAS.remate.descripcion}</p>
            </div>
            <span className="shop-clearance-link">Explorar Casa y Cosas <span aria-hidden="true">→</span></span>
          </Link>
        </div>
        <SocialSection />
      </main>
      <Footer />
      <CartDrawer />
    </div>
  );
}
