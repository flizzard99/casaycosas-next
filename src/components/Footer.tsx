import Link from 'next/link';
import { tienda } from '@/lib/config';

export default function Footer() {
  return (
    <footer className="bg-verde-noche py-7 text-crema">
      <div className="store-shell flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="font-display text-lg text-white">Casa y Cosas</p>
          <p className="mt-1 text-sm">Tienda online</p>
        </div>
        <nav aria-label="Enlaces del pie de página" className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
          <Link href="/catalogo" className="hover:underline">Catálogo</Link>
          <Link href="/#contacto" className="hover:underline">Redes sociales</Link>
          <a href={tienda.whatsappUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">WhatsApp</a>
          <Link href="/admin" className="hover:underline">Administración</Link>
        </nav>
      </div>
    </footer>
  );
}
