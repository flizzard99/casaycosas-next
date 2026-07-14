'use client';

import { useEffect, useMemo, useState } from 'react';
import ProductCard from './ProductCard';
import type { Producto } from '@/lib/types';

type Props = {
  productosIniciales: Producto[];
  categoryOrder: string[];
};

const PAGE_SIZE = 16;

export default function CatalogClient({ productosIniciales, categoryOrder }: Props) {
  const [busqueda, setBusqueda] = useState('');
  const [categoriaActiva, setCategoriaActiva] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [busqueda, categoriaActiva]);

  const categorias = useMemo(() => {
    const set = new Set(productosIniciales.map((p) => p.category));
    const enOrden = categoryOrder.filter((c) => set.has(c));
    const resto = [...set].filter((c) => !categoryOrder.includes(c)).sort();
    return [...enOrden, ...resto];
  }, [productosIniciales, categoryOrder]);

  const filtrados = useMemo(() => {
    const term = busqueda.trim().toLowerCase();
    if (!term && !categoriaActiva) return productosIniciales;
    return productosIniciales.filter((p) => {
      const coincideBusqueda =
        !term ||
        p.name.toLowerCase().includes(term) ||
        p.category.toLowerCase().includes(term) ||
        (p.description || '').toLowerCase().includes(term);
      const coincideCategoria = !categoriaActiva || p.category === categoriaActiva;
      return coincideBusqueda && coincideCategoria;
    });
  }, [productosIniciales, busqueda, categoriaActiva]);

  const grupos = useMemo(() => {
    const map = new Map<string, Producto[]>();
    for (const cat of categorias) map.set(cat, []);
    for (const p of filtrados) {
      if (!map.has(p.category)) map.set(p.category, []);
      map.get(p.category)!.push(p);
    }
    return [...map.entries()].filter(([, items]) => items.length > 0);
  }, [filtrados, categorias]);

  const visibleGroups = useMemo(() => {
    let remaining = visibleCount;
    const result: [string, Producto[]][] = [];
    for (const [cat, items] of grupos) {
      if (remaining <= 0) break;
      const slice = items.slice(0, remaining);
      result.push([cat, slice]);
      remaining -= slice.length;
    }
    return result;
  }, [grupos, visibleCount]);

  const totalVisible = visibleGroups.reduce((sum, [, items]) => sum + items.length, 0);
  const hasMore = filtrados.length > totalVisible;

  return (
    <section id="catalogo" className="px-6 md:px-14 py-14 md:py-20">
      <div className="flex flex-col md:flex-row md:items-center gap-4 mb-8">
        <input
          type="text"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar productos..."
          className="w-full md:w-80 px-4 py-2.5 rounded-md border border-verde-oscuro/20 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-verde"
        />
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setCategoriaActiva(null)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${
              categoriaActiva === null ? 'bg-verde-oscuro text-white border-verde-oscuro' : 'border-verde-oscuro/30 text-verde-oscuro'
            }`}
          >
            Todo
          </button>
          {categorias.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoriaActiva(cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border capitalize ${
                categoriaActiva === cat ? 'bg-verde-oscuro text-white border-verde-oscuro' : 'border-verde-oscuro/30 text-verde-oscuro'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {grupos.length === 0 && (
        <p className="text-sm text-verde-oscuro/70">
          No encontramos productos que coincidan con tu búsqueda. Prueba con otra palabra o revisa el
          catálogo completo en WhatsApp.
        </p>
      )}

      <div className="space-y-14">
        {visibleGroups.map(([categoria, items]) => (
          <div key={categoria}>
            <h2 className="font-display text-2xl text-verde-oscuro mb-6 capitalize">{categoria}</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-5 max-w-6xl mx-auto">
              {items.map((p) => (
                <ProductCard key={p.id} producto={p} />
              ))}
            </div>
          </div>
        ))}
      </div>

      {hasMore && (
        <div className="text-center mt-12">
          <button
            onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
            className="px-6 py-3 rounded-md bg-verde-noche text-white text-sm font-semibold uppercase tracking-wide hover:bg-verde-oscuro transition-colors"
          >
            Cargar más productos
          </button>
          <p className="text-xs text-verde-noche/50 mt-2">
            Mostrando {totalVisible} de {filtrados.length}
          </p>
        </div>
      )}
    </section>
  );
}