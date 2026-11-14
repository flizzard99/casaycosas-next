'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { useCart } from '@/context/CartContext';

function categoriaHref(cat: string) {
  return `/catalogo/${encodeURIComponent(cat)}`;
}

function CartIcon({ count }: { count: number }) {
  return (
    <>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
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
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [catAbierto, setCatAbierto] = useState(false);

  return (
    <header className="bg-verde sticky top-0 z-40">
      <a href="#contenido" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-white focus:p-3">Saltar al contenido</a>
      <div className="flex items-center justify-between px-4 md:px-14 py-4 relative">
        {/* Logo (izquierda) */}
        <Link href="/" className="flex items-center gap-3 z-10">
          <Image src="/oveja-logo.png" alt="Casa y Cosas" width={40} height={40} className="rounded-md w-10 h-auto" priority />
        </Link>

        {/* Texto centrado (mobile + desktop) */}
        <Link
          href="/"
          className="font-display text-white text-base sm:text-xl tracking-wide md:mr-auto md:ml-4 hover:opacity-80 transition-opacity"
        >
          CASA Y COSAS
        </Link>

        {/* Nav desktop */}
        <nav aria-label="Navegación principal" className="hidden md:flex items-center gap-4 lg:gap-6">
          <Link href="/catalogo" className="text-white text-sm uppercase tracking-wide">Catálogo</Link>
          {categorias.length > 0 && (
            <div
              className="relative"
              onMouseEnter={() => setCatAbierto(true)}
              onMouseLeave={() => setCatAbierto(false)}
            >
              <button
                onClick={() => setCatAbierto((v) => !v)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setCatAbierto(false);
                }}
                aria-expanded={catAbierto}
                aria-controls="categorias-menu"
                className="text-white text-xs md:text-sm uppercase tracking-wide opacity-95 hover:opacity-100"
              >
                Categorías ▾
              </button>
              {catAbierto && (
                <div
                  id="categorias-menu"
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') setCatAbierto(false);
                  }}
                  className="absolute right-0 top-full bg-white rounded-md shadow-xl py-2 min-w-[200px] max-h-[65vh] overflow-y-auto border border-verde-noche/10"
                >
                  <Link
                    href="/catalogo"
                    className="block px-4 py-1.5 text-sm text-verde-noche hover:bg-crema font-semibold"
                    onClick={() => setCatAbierto(false)}
                  >
                    Todos los productos
                  </Link>
                  <div className="border-t border-verde-noche/10 my-1" />
                  {categorias.map((cat) => (
                    <Link
                      key={cat}
                      href={categoriaHref(cat)}
                      className="block px-4 py-1.5 text-sm text-verde-noche hover:bg-crema capitalize whitespace-nowrap"
                      onClick={() => setCatAbierto(false)}
                    >
                      {cat}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
          <Link href="/#contacto" className="text-white text-xs md:text-sm uppercase tracking-wide opacity-95 hover:opacity-100">
            Visítanos
          </Link>
          <button
            onClick={open}
            className="relative text-white border border-white/40 rounded p-2 hover:bg-white/10 transition-colors"
            aria-label="Abrir carrito"
          >
            <CartIcon count={count} />
          </button>
        </nav>

        {/* Carrito + Hamburguesa en mobile */}
        <div className="md:hidden flex items-center gap-2 z-10">
          <button
            onClick={open}
            className="relative text-white border border-white/40 rounded p-2 hover:bg-white/10 transition-colors"
            aria-label="Abrir carrito"
          >
            <CartIcon count={count} />
          </button>
          <button
            onClick={() => setMenuAbierto((v) => !v)}
            className="text-white text-2xl leading-none"
            aria-label={menuAbierto ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={menuAbierto}
            aria-controls="menu-mobile"
          >
            {menuAbierto ? '×' : '☰'}
          </button>
        </div>
      </div>

      {menuAbierto && (
        <nav id="menu-mobile" aria-label="Navegación móvil" className="md:hidden border-t border-white/10 px-6 py-4 space-y-3 max-h-[75vh] overflow-y-auto">
          <Link href="/catalogo" onClick={() => setMenuAbierto(false)} className="block text-white text-sm font-semibold">Ver catálogo completo</Link>
          {categorias.length > 0 && (
            <div className="space-y-2">
              <p className="text-white/50 text-xs uppercase tracking-wide">Categorías</p>
              <Link
                href="/catalogo"
                className="block text-white/80 text-sm font-semibold"
                onClick={() => setMenuAbierto(false)}
              >
                Todos los productos
              </Link>
              {categorias.map((cat) => (
                <Link
                  key={cat}
                  href={categoriaHref(cat)}
                  className="block text-white/80 text-sm capitalize"
                  onClick={() => setMenuAbierto(false)}
                >
                  {cat}
                </Link>
              ))}
            </div>
          )}
          <Link
            href="/#contacto"
            className="block text-white text-sm uppercase tracking-wide"
            onClick={() => setMenuAbierto(false)}
          >
            Visítanos
          </Link>
        </nav>
      )}
    </header>
  );
}