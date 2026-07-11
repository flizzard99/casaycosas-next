'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { useCart } from '@/context/CartContext';

function categoriaHref(cat: string) {
  return `/catalogo/${encodeURIComponent(cat)}`;
}

export default function Header({ categorias = [] }: { categorias?: string[] }) {
  const { count, open } = useCart();
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [catAbierto, setCatAbierto] = useState(false);

  return (
    <header className="bg-verde-noche sticky top-0 z-40">
      <div className="flex items-center justify-between px-6 md:px-14 py-4">
        <Link href="/" className="flex items-center gap-3">
          <Image src="/logo.png" alt="Casa y Cosas" width={40} height={40} className="rounded-md" priority />
          <span className="font-display text-white text-lg md:text-xl tracking-wide">CASA Y COSAS</span>
        </Link>

        <nav className="hidden md:flex items-center gap-6 md:gap-8">
          <Link href="/catalogo" className="text-white text-xs md:text-sm uppercase tracking-wide opacity-95 hover:opacity-100">
            Catálogo
          </Link>
          {categorias.length > 0 && (
            <div
              className="relative"
              onMouseEnter={() => setCatAbierto(true)}
              onMouseLeave={() => setCatAbierto(false)}
            >
              <button
                onClick={() => setCatAbierto((v) => !v)}
                className="text-white text-xs md:text-sm uppercase tracking-wide opacity-95 hover:opacity-100"
              >
                Categorías ▾
              </button>
              {catAbierto && (
                <div className="absolute left-0 top-full bg-white rounded-md shadow-xl py-2 min-w-[200px] border border-verde-noche/10">
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
          <a href="/#contacto" className="text-white text-xs md:text-sm uppercase tracking-wide opacity-95 hover:opacity-100">
            Visítanos
          </a>
          <button
            onClick={open}
            className="relative text-white text-xs md:text-sm uppercase tracking-wide border border-white/40 rounded px-3 py-1.5 hover:bg-white/10"
          >
            Carrito
            {count > 0 && (
              <span className="absolute -top-2 -right-2 bg-sage text-verde-noche text-[11px] font-semibold rounded-full w-5 h-5 flex items-center justify-center">
                {count}
              </span>
            )}
          </button>
        </nav>

        <button
          onClick={() => setMenuAbierto((v) => !v)}
          className="md:hidden text-white text-2xl leading-none"
          aria-label="Abrir menú"
        >
          {menuAbierto ? '×' : '☰'}
        </button>
      </div>

      {menuAbierto && (
        <div className="md:hidden border-t border-white/10 px-6 py-4 space-y-3">
          <Link
            href="/catalogo"
            className="block text-white text-sm uppercase tracking-wide"
            onClick={() => setMenuAbierto(false)}
          >
            Catálogo
          </Link>
          <div className="pl-4 space-y-2">
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
          <a
            href="/#contacto"
            className="block text-white text-sm uppercase tracking-wide"
            onClick={() => setMenuAbierto(false)}
          >
            Visítanos
          </a>
          <button
            onClick={() => {
              setMenuAbierto(false);
              open();
            }}
            className="relative text-white text-sm uppercase tracking-wide border border-white/40 rounded px-3 py-1.5"
          >
            Carrito {count > 0 && `(${count})`}
          </button>
        </div>
      )}
    </header>
  );
}