import Image from 'next/image';
import Link from 'next/link';
import { tienda } from '@/lib/config';
import { LINEAS } from '@/lib/lineas';
import { ENLACES_LEGALES } from '@/lib/legal';

export default function Footer() {
  const telefono = tienda.whatsappNumber.replace(/\D/g, '');
  const telefonoVisible = `+${telefono.replace(/^(56)(\d)(\d{4})(\d{4})$/, '$1 $2 $3 $4')}`;
  return (
    <footer className="shop-footer">
      <div className="store-shell shop-footer-grid">
        <div className="shop-footer-brand">
          <div className="shop-footer-identity">
            <Image src="/oveja-logo-hd.webp" alt="" width={44} height={44} />
            <div>
              <p>Casa y Cosas</p>
              <span>Tienda online</span>
            </div>
          </div>
          <p className="shop-footer-description">Detalles para regalar, compartir y hacer hogar.</p>
          <a href={`tel:${telefonoVisible.replaceAll(' ', '')}`} className="shop-footer-phone">{telefonoVisible}</a>
        </div>

        <nav aria-labelledby="footer-comprar" className="shop-footer-group">
          <h2 id="footer-comprar">Comprar</h2>
          {Object.values(LINEAS).map(({ href, nombre }) => (
            <Link key={href} href={href}>{nombre}</Link>
          ))}
        </nav>

        <nav aria-labelledby="footer-ayuda" className="shop-footer-group">
          <h2 id="footer-ayuda">Ayuda</h2>
          <Link href="/seguimiento">Seguir pedido</Link>
          <a href={tienda.whatsappUrl} target="_blank" rel="noopener noreferrer">WhatsApp</a>
          <a href={tienda.instagramUrl} target="_blank" rel="noopener noreferrer">Instagram</a>
        </nav>

        <nav aria-labelledby="footer-legal" className="shop-footer-group shop-footer-legal">
          <h2 id="footer-legal">Información legal</h2>
          {ENLACES_LEGALES.map(({ href, label }) => <Link key={href} href={href}>{label}</Link>)}
        </nav>
      </div>
      <div className="store-shell shop-footer-bottom">
        <p>© 2026 Casa y Cosas</p>
        <p>Compra segura y despacho a todo Chile.</p>
      </div>
    </footer>
  );
}
