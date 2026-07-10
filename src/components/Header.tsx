'use client';

import { useCart } from '@/context/CartContext';

export default function Header() {
  const { count, open } = useCart();

  return (
    <header className="flex items-center justify-between px-6 md:px-14 py-6 bg-verde-noche">
      <div className="font-display text-white text-lg md:text-xl tracking-wide">CASA Y COSAS</div>
      <nav className="flex items-center gap-4 md:gap-8">
        <a href="#catalogo" className="text-white text-xs md:text-sm uppercase tracking-wide opacity-95 hover:opacity-100">
          Catálogo
        </a>
        <a href="#ubicacion" className="text-white text-xs md:text-sm uppercase tracking-wide opacity-95 hover:opacity-100">
          Ubicación
        </a>
        <a href="#contacto" className="text-white text-xs md:text-sm uppercase tracking-wide opacity-95 hover:opacity-100">
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
    </header>
  );
}
