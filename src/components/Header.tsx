'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { useCart } from '@/context/CartContext';

function categoriaHref(cat: string) {
  return `/catalogo/${encodeURIComponent(cat)}`;
}

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

export default function Header({ categorias = [] }: { categorias?: string[] }) {
  const { count, open } = useCart();
  const pathname = usePathname();
  const menu = useRef<HTMLDetailsElement>(null);

  function cerrarMenu() {
    if (menu.current) menu.current.open = false;
  }

  useEffect(cerrarMenu, [pathname]);

  return (
    <header className="sticky top-0 z-40 border-b border-verde-noche/15 bg-white">
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-2 focus:z-10 focus:rounded focus:bg-white focus:p-3"
      >
        Saltar al contenido
      </a>
      <div className="store-shell flex min-h-16 items-center justify-between gap-3 py-2">
        <Link href="/" className="flex shrink-0 items-center gap-2 font-display text-lg text-verde-noche">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-verde-noche">
            <Image src="/oveja-logo.png" alt="" width={35} height={35} unoptimized />
          </span>
          <span>Casa y Cosas</span>
        </Link>

        <nav aria-label="Navegación principal" className="flex items-center gap-2 sm:gap-4">
          <Link href="/catalogo" aria-current={pathname === '/catalogo' ? 'page' : undefined} className="hidden font-semibold hover:underline sm:inline">
            Catálogo
          </Link>
          <Link href="/#contacto" className="hidden font-semibold hover:underline md:inline">
            Redes sociales
          </Link>
          <details
            ref={menu}
            className="relative"
            onKeyDown={(event) => {
              if (event.key === 'Escape' && menu.current?.open) {
                cerrarMenu();
                menu.current.querySelector('summary')?.focus();
              }
            }}
            onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget)) cerrarMenu();
            }}
          >
            <summary className="flex min-h-11 cursor-pointer list-none items-center gap-1 rounded-lg px-2 text-sm font-semibold hover:bg-crema/50 [&::-webkit-details-marker]:hidden">
              <span className="sm:hidden">Menú</span>
              <span className="hidden sm:inline">Categorías</span>
              <span aria-hidden="true">⌄</span>
            </summary>
            <ul className="absolute right-0 top-full mt-2 max-h-[65dvh] w-52 max-w-[70vw] overflow-y-auto rounded-xl border border-verde-noche/15 bg-white p-1.5 shadow-lg">
              <li><Link href="/catalogo" onClick={cerrarMenu} className="block rounded-lg px-3 py-2 font-semibold hover:bg-crema/50">Todo el catálogo</Link></li>
              {categorias.map((cat) => (
                <li key={cat}>
                  <Link href={categoriaHref(cat)} prefetch={false} onClick={cerrarMenu} className="block rounded-lg px-3 py-2 capitalize hover:bg-crema/50">
                    {cat}
                  </Link>
                </li>
              ))}
              <li className="md:hidden"><Link href="/#contacto" onClick={cerrarMenu} className="block rounded-lg px-3 py-2 hover:bg-crema/50">Redes sociales</Link></li>
            </ul>
          </details>
          <button
            type="button"
            onClick={() => { cerrarMenu(); open(); }}
            className="relative grid size-11 place-items-center rounded-lg border border-verde-noche/20 hover:bg-crema/50"
            aria-label={count ? `Abrir carrito, ${count} productos` : 'Abrir carrito'}
            aria-haspopup="dialog"
          >
            <CartIcon count={count} />
          </button>
        </nav>
      </div>
    </header>
  );
}
