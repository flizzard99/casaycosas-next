'use client';

import { LINEAS, type Linea } from '@/lib/lineas';
import ThemeToggle from './ThemeToggle';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCart } from '@/context/CartContext';

function CartIcon({ count }: { count: number }) {
  return (
    <>
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
        <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" strokeLinejoin="round" />
        <line x1="3" y1="6" x2="21" y2="6" />
        <path d="M16 10a4 4 0 0 1-8 0" strokeLinecap="round" />
      </svg>
      {count > 0 && (
        <span className="absolute -top-2 -right-2 bg-sage text-verde-noche text-[11px] font-semibold rounded-full w-5 h-5 flex items-center justify-center">
          {count}
        </span>
      )}
    </>
  );
}

export default function Header({ linea }: { linea?: Linea }) {
  const { count, open } = useCart();
  const pathname = usePathname();

  return (
    <header className="shop-header">
      <a href="#contenido" className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-2 focus:z-10 focus:rounded focus:bg-white focus:p-3">
        Saltar al contenido
      </a>
      <div className="store-shell shop-header-inner">
        <Link href="/" className="shop-brand">
          <span className="shop-brand-icon"><Image src="/oveja-logo.png" alt="" width={33} height={33} unoptimized /></span>
          <span>Casa y Cosas</span>
        </Link>
        <nav aria-label="Colecciones" className="shop-nav">
          {Object.values(LINEAS).map((coleccion) => (
            <Link key={coleccion.href} href={coleccion.href} prefetch={false} aria-current={pathname === coleccion.href ? 'page' : undefined}
              className={linea === coleccion.href.slice(1) ? 'shop-nav-active' : undefined}>
              {coleccion.nombre}
            </Link>
          ))}
        </nav>
        <div className="shop-tools">
          <ThemeToggle />
          <button type="button" onClick={open} className="shop-icon-button relative"
            aria-label={count ? `Abrir carrito, ${count} productos` : 'Abrir carrito'} aria-haspopup="dialog">
            <CartIcon count={count} />
          </button>
        </div>
      </div>
    </header>
  );
}
