'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import ProductCard from './ProductCard';
import type { Producto } from '@/lib/types';

const PAGE_SIZE = 24;
const ORDENES = [
  { value: 'recientes', label: 'Más recientes' },
  { value: 'menor-precio', label: 'Menor precio' },
  { value: 'mayor-precio', label: 'Mayor precio' },
  { value: 'nombre', label: 'Nombre: A a Z' }
] as const;

type Filtros = {
  busqueda: string;
  categoria: string;
  orden: typeof ORDENES[number]['value'];
  disponibles: boolean;
  cantidad: number;
};

const INICIALES: Filtros = {
  busqueda: '',
  categoria: '',
  orden: 'recientes',
  disponibles: false,
  cantidad: PAGE_SIZE
};

const nombres = new Intl.Collator('es-CL', { sensitivity: 'base' });

function normalizar(texto: string) {
  return texto.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

export default function CatalogClient({ productos, categorias, categoriaActual }: {
  productos: Producto[];
  categorias: string[];
  categoriaActual?: string;
}) {
  const [filtros, setFiltros] = useState(INICIALES);
  const campoBusqueda = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function leerFiltros() {
      const query = new URLSearchParams(window.location.search);
      const categoria = query.get('categoria') ?? '';
      const cantidad = Number(query.get('cantidad'));
      setFiltros({
        busqueda: (query.get('q') ?? '').slice(0, 120),
        categoria: !categoriaActual && categorias.includes(categoria) ? categoria : '',
        orden: ORDENES.find((opcion) => opcion.value === query.get('orden'))?.value ?? 'recientes',
        disponibles: query.get('stock') === '1',
        cantidad: Number.isSafeInteger(cantidad) && cantidad > PAGE_SIZE
          ? Math.max(PAGE_SIZE, Math.min(cantidad, productos.length))
          : PAGE_SIZE
      });
    }
    leerFiltros();
    window.addEventListener('popstate', leerFiltros);
    return () => window.removeEventListener('popstate', leerFiltros);
  }, [categoriaActual, categorias, productos.length]);

  function actualizar(cambios: Partial<Filtros>) {
    const siguientes = { ...filtros, cantidad: PAGE_SIZE, ...cambios };
    setFiltros(siguientes);
    const url = new URL(window.location.href);
    const parametros = {
      q: siguientes.busqueda.trim(),
      categoria: siguientes.categoria,
      orden: siguientes.orden === 'recientes' ? '' : siguientes.orden,
      stock: siguientes.disponibles ? '1' : '',
      cantidad: siguientes.cantidad > PAGE_SIZE ? String(siguientes.cantidad) : ''
    };
    for (const [clave, valor] of Object.entries(parametros)) {
      if (valor) url.searchParams.set(clave, valor);
      else url.searchParams.delete(clave);
    }
    window.history.replaceState(window.history.state, '', url);
  }

  const indice = useMemo(() => productos.map((producto) => ({
    producto,
    texto: normalizar(`${producto.name} ${producto.category} ${producto.description || ''}`)
  })), [productos]);

  const resultados = useMemo(() => {
    const palabras = normalizar(filtros.busqueda).trim().split(/\s+/).filter(Boolean);
    const coincidencias = indice
      .filter(({ producto, texto }) =>
        (!filtros.categoria || producto.category === filtros.categoria) &&
        (!filtros.disponibles || producto.stock > 0) &&
        palabras.every((palabra) => texto.includes(palabra)))
      .map(({ producto }) => producto);

    if (filtros.orden === 'menor-precio') return coincidencias.sort((a, b) => a.price - b.price);
    if (filtros.orden === 'mayor-precio') return coincidencias.sort((a, b) => b.price - a.price);
    if (filtros.orden === 'nombre') return coincidencias.sort((a, b) => nombres.compare(a.name, b.name));
    return coincidencias;
  }, [indice, filtros.busqueda, filtros.categoria, filtros.disponibles, filtros.orden]);

  const visibles = resultados.slice(0, filtros.cantidad);
  const hayFiltros = !!(filtros.busqueda || filtros.categoria || filtros.disponibles || filtros.orden !== 'recientes');

  return (
    <section aria-label="Productos del catálogo" className="store-shell pb-14 pt-7 md:pb-20">
      {!!productos.length && (
        <div className="rounded-2xl border border-verde-noche/15 bg-white p-4 sm:p-5">
          <div className={`grid gap-3 ${categoriaActual ? 'sm:grid-cols-[2fr_1fr]' : 'grid-cols-2 lg:grid-cols-[2fr_1fr_1fr]'}`}>
            <label className={`grid gap-1.5 text-sm font-semibold ${categoriaActual ? '' : 'col-span-2 lg:col-span-1'}`}>
              Buscar productos
              <input ref={campoBusqueda} type="search" value={filtros.busqueda} maxLength={120}
                onChange={(event) => actualizar({ busqueda: event.target.value })}
                placeholder="Nombre, categoría o descripción"
                className="min-h-11 min-w-0 rounded-lg border border-verde-noche/25 px-3 text-base font-normal" />
            </label>
            {!categoriaActual && (
              <label className="grid min-w-0 gap-1.5 text-sm font-semibold">
                Categoría
                <select value={filtros.categoria} onChange={(event) => actualizar({ categoria: event.target.value })}
                  className="min-h-11 min-w-0 rounded-lg border border-verde-noche/25 bg-white px-3 text-base font-normal">
                  <option value="">Todas</option>
                  {categorias.map((categoria) => <option key={categoria}>{categoria}</option>)}
                </select>
              </label>
            )}
            <label className="grid min-w-0 gap-1.5 text-sm font-semibold">
              Ordenar por
              <select value={filtros.orden} onChange={(event) => actualizar({ orden: event.target.value as Filtros['orden'] })}
                className="min-h-11 min-w-0 rounded-lg border border-verde-noche/25 bg-white px-3 text-base font-normal">
                {ORDENES.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
            <label className="flex min-h-11 items-center gap-2 text-sm font-medium">
              <input type="checkbox" checked={filtros.disponibles}
                onChange={(event) => actualizar({ disponibles: event.target.checked })}
                className="size-4 accent-verde-oscuro" />
              Solo en stock
            </label>
            {hayFiltros && (
              <button type="button" onClick={() => { actualizar(INICIALES); campoBusqueda.current?.focus(); }}
                className="min-h-11 text-sm font-semibold text-verde-oscuro underline underline-offset-4">
                Limpiar filtros
              </button>
            )}
          </div>
        </div>
      )}

      <p role="status" className="my-5 text-sm font-medium text-verde-noche/80">
        {resultados.length} {resultados.length === 1 ? 'producto' : 'productos'}
        {visibles.length < resultados.length && ` · Mostrando ${visibles.length}`}
      </p>
      <h2 className="sr-only">Resultados del catálogo</h2>
      {visibles.length ? (
        <div className="store-grid">
          {visibles.map((producto) => <ProductCard key={producto.id} producto={producto} />)}
        </div>
      ) : (
        <div className="rounded-2xl border border-verde-noche/15 bg-white p-6">
          <h2 className="font-semibold">{hayFiltros ? 'No hay resultados con estos filtros' : 'Aún no hay productos disponibles'}</h2>
          {categoriaActual && <Link href="/catalogo" className="mt-3 inline-block text-sm font-semibold underline">Ver todo el catálogo</Link>}
        </div>
      )}

      {visibles.length < resultados.length && (
        <div className="mt-8 text-center">
          <button type="button" onClick={() => actualizar({ cantidad: filtros.cantidad + PAGE_SIZE })}
            className="min-h-12 rounded-lg bg-verde-noche px-6 text-sm font-semibold text-white hover:bg-verde-oscuro">
            Ver más productos
          </button>
        </div>
      )}
    </section>
  );
}
