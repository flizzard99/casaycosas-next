import Link from 'next/link';
import { tienda } from '@/lib/config';
import { LINEAS } from '@/lib/lineas';

export default function Footer() {
  const telefono = tienda.whatsappNumber.replace(/\D/g, '');
  const telefonoVisible = `+${telefono.replace(/^(56)(\d)(\d{4})(\d{4})$/, '$1 $2 $3 $4')}`;
  return (
    <footer className="shop-footer py-7">
      <div className="store-shell flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="font-display text-lg">Casa y Cosas</p>
          <p className="mt-1 text-sm">Tienda online</p>
          <a href={`tel:${telefonoVisible.replaceAll(' ', '')}`} className="mt-2 inline-block text-sm font-semibold underline underline-offset-4">
            {telefonoVisible}
          </a>
        </div>
        <nav aria-label="Enlaces del pie de página" className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
          {Object.values(LINEAS).map(({ href, nombre }) => (
            <Link key={href} href={href} className="hover:underline">{nombre}</Link>
          ))}
          <Link href="/seguimiento" className="hover:underline">Seguir pedido</Link>
          <Link href="/#contacto" className="hover:underline">Redes sociales</Link>
          <a href={tienda.whatsappUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">WhatsApp</a>
        </nav>
      </div>
    </footer>
  );
}
