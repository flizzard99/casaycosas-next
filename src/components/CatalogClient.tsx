'use client';

import { useEffect, useMemo, useState } from 'react';
import ProductCard from './ProductCard';
import type { Producto } from '@/lib/types';

export default function CatalogClient() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [categoryOrder, setCategoryOrder] = useState<string[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [categoriaActiva, setCategoriaActiva] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    async function cargar() {
      try {
        const [resProductos, resConfig] = await Promise.all([
          fetch('/api/productos'),
          fetch('/api/config')
        ]);
        const dataProductos = await resProductos.json();
        const dataConfig = await resConfig.json();
        setProductos(dataProductos);
        setCategoryOrder(dataConfig.categoryOrder || []);
      } finally {
        setCargando(false);
      }
    }
    cargar();
  }, []);

  const categorias = useMemo(() => {
    const set = new Set(productos.map((p) => p.category));
    const enOrden = categoryOrder.filter((c) => set.has(c));
    const resto = [...set].filter((c) => !categoryOrder.includes(c)).sort();
    return [...enOrden, ...resto];
  }, [productos, categoryOrder]);

  const filtrados = useMemo(() => {
    const term = busqueda.trim().toLowerCase();
    return productos.filter((p) => {
      const coincideBusqueda = !term || p.name.toLowerCase().includes(term) || p.category.toLowerCase().includes(term);
      const coincideCategoria = !categoriaActiva || p.category === categoriaActiva;
      return coincideBusqueda && coincideCategoria;
    });
  }, [productos, busqueda, categoriaActiva]);

  const grupos = useMemo(() => {
    const map = new Map<string, Producto[]>();
    for (const cat of categorias) map.set(cat, []);
    for (const p of filtrados) {
      if (!map.has(p.category)) map.set(p.category, []);
      map.get(p.category)!.push(p);
    }
    return [...map.entries()].filter(([, items]) => items.length > 0);
  }, [filtrados, categorias]);

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

      {cargando && <p className="text-sm text-verde-oscuro/70">Cargando catálogo…</p>}

      {!cargando && grupos.length === 0 && (
        <p className="text-sm text-verde-oscuro/70">
          No encontramos productos que coincidan con tu búsqueda. Prueba con otra palabra o revisa el catálogo
          completo en WhatsApp.
        </p>
      )}

      <div className="space-y-14">
        {grupos.map(([categoria, items]) => (
          <div key={categoria}>
            <h2 className="font-display text-2xl text-verde-oscuro mb-6 capitalize">{categoria}</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
              {items.map((p) => (
                <ProductCard key={p.id} producto={p} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
