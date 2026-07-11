'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { useCart } from '@/context/CartContext';

export default function Header({ categorias = [] }: { categorias?: string[] }) {
  const { count, open } = useCart();
  const [menuAbierto, setMenuAbierto] = useState(false);

  return (
    <header className="bg-verde-noche sticky top-0 z-40">
      <div className="flex items-center justify-between px-6 md:px-14 py-4">
        <Link href="/" className="flex items-center gap-3">
          <Image src="/logo.png" alt="Casa y Cosas" width={40} height={40} className="rounded-md" priority />
          <span className="font-display text-white text-lg md:text-xl tracking-wide">CASA Y COSAS</span>
        </Link>

        <nav className="hidden md:flex items-center gap-6 md:gap-8">
          <a href="/#catalogo" className="text-white text-xs md:text-sm uppercase tracking-wide opacity-95 hover:opacity-100">
            Catálogo
          </a>
          {categorias.length > 0 && (
            <div className="relative group">
              <button className="text-white text-xs md:text-sm uppercase tracking-wide opacity-95 hover:opacity-100">
                Categorías
              </button>
              <div className="absolute left-0 top-full mt-2 hidden group-hover:flex group-hover:flex-col bg-white rounded-md shadow-xl py-2 min-w-[180px] border border-verde-noche/10">
                {categorias.map((cat) => (
                  <a
                    key={cat}
                    href={`/#catalogo`}
                    className="px-4 py-1.5 text-sm text-verde-noche hover:bg-crema capitalize whitespace-nowrap"
                  >
                    {cat}
                  </a>
                ))}
              </div>
            </div>
          )}
          <a href="/#ubicacion" className="text-white text-xs md:text-sm uppercase tracking-wide opacity-95 hover:opacity-100">
            Ubicación
          </a>
          <a href="/#contacto" className="text-white text-xs md:text-sm uppercase tracking-wide opacity-95 hover:opacity-100">
            Contacto
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
          <a
            href="/#catalogo"
            className="block text-white text-sm uppercase tracking-wide"
            onClick={() => setMenuAbierto(false)}
          >
            Catálogo
          </a>
          {categorias.map((cat) => (
            <a
              key={cat}
              href="/#catalogo"
              className="block text-white/80 text-sm capitalize pl-4"
              onClick={() => setMenuAbierto(false)}
            >
              {cat}
            </a>
          ))}
          <a
            href="/#ubicacion"
            className="block text-white text-sm uppercase tracking-wide"
            onClick={() => setMenuAbierto(false)}
          >
            Ubicación
          </a>
          <a
            href="/#contacto"
            className="block text-white text-sm uppercase tracking-wide"
            onClick={() => setMenuAbierto(false)}
          >
            Contacto
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