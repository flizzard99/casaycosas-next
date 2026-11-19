import Image from 'next/image';
import Link from 'next/link';
import Header from '@/components/Header';
import SocialSection from '@/components/SocialSection';
import Footer from '@/components/Footer';
import CartDrawer from '@/components/CartDrawer';
import { LINEAS } from '@/lib/lineas';

export default function HomePage() {
  return (
    <div className="shop">
      <Header />
      <main id="contenido" tabIndex={-1}>
        <div className="store-shell shop-home">
          <div className="shop-home-heading">
            <Image src="/oveja-logo.png" alt="" width={58} height={61} unoptimized />
            <h1>Casa y Cosas</h1>
            <p>Elige tu colección</p>
          </div>
          <div className="shop-collections">
            {(['matera', 'cristiana'] as const).map((linea) => {
              const coleccion = LINEAS[linea];
              return (
                <Link key={linea} href={coleccion.href} data-linea={linea} className="shop-collection">
                  <div className="shop-collection-photo">
                    <Image src={coleccion.imagen} alt="" fill sizes="(min-width: 1280px) 580px, (min-width: 640px) 47vw, 92vw"
                      priority />
                  </div>
                  <div className="shop-collection-content">
                    <h2>{coleccion.nombre}</h2>
                    <p>{coleccion.descripcion}</p>
                    <span className="shop-collection-link">Explorar {coleccion.nombre} <span aria-hidden="true">→</span></span>
                  </div>
                </Link>
              );
            })}
          </div>
          <Link href={LINEAS.remate.href} className="shop-clearance-entry">
            <span>
              <strong>Remate</strong>
              <span className="shop-muted block">Últimas unidades y productos seleccionados.</span>
            </span>
            <span className="shop-clearance-link">Ver Remate <span aria-hidden="true">→</span></span>
          </Link>
        </div>
        <SocialSection />
      </main>
      <Footer />
      <CartDrawer />
    </div>
  );
}
