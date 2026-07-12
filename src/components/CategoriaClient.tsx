'use client';

import { useMemo, useState } from 'react';
import ProductCard from './ProductCard';
import type { Producto } from '@/lib/types';

const PAGE_SIZE = 16;

export default function CategoriaClient({ productos }: { productos: Producto[] }) {
  const [busqueda, setBusqueda] = useState('');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const filtrados = useMemo(() => {
    const term = busqueda.trim().toLowerCase();
    if (!term) return productos;
    return productos.filter(
      (p) =>
        p.name.toLowerCase().includes(term) || (p.description || '').toLowerCase().includes(term)
    );
  }, [productos, busqueda]);

  const visibles = useMemo(() => filtrados.slice(0, visibleCount), [filtrados, visibleCount]);
  const hasMore = filtrados.length > visibles.length;

  return (
    <section className="px-6 md:px-14 py-10 md:py-14">
      <input
        type="text"
        value={busqueda}
        onChange={(e) => { setBusqueda(e.target.value); setVisibleCount(PAGE_SIZE); }}
        placeholder="Buscar en esta categoría..."
        className="w-full md:w-80 px-4 py-2.5 rounded-md border border-verde-oscuro/20 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-verde mb-8"
      />

      {visibles.length === 0 ? (
        <p className="text-sm text-verde-oscuro/70">
          No encontramos productos que coincidan con tu búsqueda. Prueba con otra palabra.
        </p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
          {visibles.map((p) => (
            <ProductCard key={p.id} producto={p} />
          ))}
        </div>
      )}

      {hasMore && (
        <div className="text-center mt-12">
          <button
            onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
            className="px-6 py-3 rounded-md bg-verde-noche text-white text-sm font-semibold uppercase tracking-wide hover:bg-verde-oscuro transition-colors"
          >
            Cargar más productos
          </button>
          <p className="text-xs text-verde-noche/50 mt-2">
            Mostrando {visibles.length} de {filtrados.length}
          </p>
        </div>
      )}
    </section>
  );
}
