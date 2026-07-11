'use client';

import { useMemo, useState } from 'react';
import ProductCard from './ProductCard';
import type { Producto } from '@/lib/types';

export default function CategoriaClient({ productos }: { productos: Producto[] }) {
  const [busqueda, setBusqueda] = useState('');

  const filtrados = useMemo(() => {
    const term = busqueda.trim().toLowerCase();
    if (!term) return productos;
    return productos.filter(
      (p) =>
        p.name.toLowerCase().includes(term) || (p.description || '').toLowerCase().includes(term)
    );
  }, [productos, busqueda]);

  return (
    <section className="px-6 md:px-14 py-10 md:py-14">
      <input
        type="text"
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        placeholder="Buscar en esta categoría..."
        className="w-full md:w-80 px-4 py-2.5 rounded-md border border-verde-oscuro/20 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-verde mb-8"
      />

      {filtrados.length === 0 ? (
        <p className="text-sm text-verde-oscuro/70">
          No encontramos productos que coincidan con tu búsqueda. Prueba con otra palabra.
        </p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
          {filtrados.map((p) => (
            <ProductCard key={p.id} producto={p} />
          ))}
        </div>
      )}
    </section>
  );
}