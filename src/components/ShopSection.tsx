import Image from 'next/image';
import Link from 'next/link';
import { LINEAS, lineaProducto, type Linea } from '@/lib/lineas';
import { getConfig, getProductosPublicos } from '@/lib/db';
import { destacadosDeLinea } from '@/lib/destacados';
import Header from './Header';
import CatalogClient from './CatalogClient';
import FeaturedGrid from './FeaturedGrid';
import Footer from './Footer';
import CartDrawer from './CartDrawer';

export default async function ShopSection({ linea }: { linea: Linea }) {
  const coleccion = LINEAS[linea];
  const [listado, configuracion] = await Promise.allSettled([getProductosPublicos(), getConfig()]);
  const config = configuracion.status === 'fulfilled' ? configuracion.value : undefined;
  const diseno = config?.diseno[linea];
  const productos = listado.status === 'fulfilled'
    ? listado.value.filter((producto) => lineaProducto(producto) === linea)
    : [];
  const destacados = config && destacadosDeLinea(config, linea, productos);

  return (
    <div className="shop" data-linea={linea}>
      <Header linea={linea} />
      <main id="contenido" tabIndex={-1}>
        <section className={`shop-section-hero ${diseno?.fondo ? 'shop-campaign' : ''}`}>
          {diseno?.fondo && (
            <Image src={diseno.fondo} alt="" fill sizes="100vw" className="shop-campaign-image" />
          )}
          <div className="store-shell shop-section-layout">
            <div className="shop-section-copy">
              {(linea !== 'remate' || diseno?.titulo) && <p className="shop-eyebrow">{linea === 'matera' ? 'Sección Matera' : coleccion.nombre}</p>}
              <h1>{diseno?.titulo || coleccion.titulo}</h1>
              <p className="shop-section-description">{diseno?.descripcion || coleccion.descripcion}</p>
              <Link href="#productos" className="shop-button">Ver productos <span aria-hidden="true">↓</span></Link>
            </div>
            <div className="shop-section-photo">
              <Image src={diseno?.imagen || coleccion.imagen} alt={diseno?.imagen ? `Imagen de ${coleccion.nombre}` : coleccion.alt} fill
                sizes="(min-width: 1280px) 520px, (min-width: 768px) 44vw, 88vw" priority />
              {linea !== 'remate' && <span className="shop-mascot-mark">
                <Image src="/oveja-logo.png" alt="" width={52} height={54} unoptimized />
              </span>}
            </div>
          </div>
        </section>
        <section id="productos" className="shop-products scroll-mt-28">
          <div className="store-shell pt-10 sm:pt-14">
            <h2 className="shop-display text-3xl sm:text-4xl">Productos de la sección</h2>
          </div>
          {listado.status === 'fulfilled' ? (
            <CatalogClient productos={productos} linea={linea} ordenGrupos={config?.categoryOrder ?? []} />
          ) : (
            <p role="status" className="store-shell py-8">El catálogo está temporalmente fuera de servicio. Vuelve a intentarlo en unos minutos.</p>
          )}
        </section>
        {destacados && <FeaturedGrid productos={destacados.productos} titulo={destacados.title} />}
      </main>
      <Footer />
      <CartDrawer />
    </div>
  );
}
