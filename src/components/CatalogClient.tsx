'use client';

import { grupoProducto, LINEAS, normalizarBusqueda, type Linea } from '@/lib/lineas';
import { useEffect, useMemo, useRef, useState } from 'react';
import { precioActual } from '@/lib/precios';
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

export default function CatalogClient({ productos, linea, ordenGrupos }: { productos: Producto[]; linea: Linea; ordenGrupos: string[] }) {
  const indice = useMemo(() => productos.map((producto) => ({
    producto,
    grupo: grupoProducto(producto, linea),
    texto: normalizarBusqueda(`${producto.name} ${producto.category} ${producto.description || ''}`)
  })), [productos, linea]);
  const categorias = useMemo(() => {
    const grupos = new Set<string>(LINEAS[linea].grupos);
    return [...ordenGrupos.filter((grupo) => grupos.delete(grupo)), ...grupos];
  }, [linea, ordenGrupos]);
  const [filtros, setFiltros] = useState(INICIALES);
  const campoBusqueda = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function leerFiltros() {
      const query = new URLSearchParams(window.location.search);
      const categoria = query.get('categoria') ?? '';
      const cantidad = Number(query.get('cantidad'));
      setFiltros({
        busqueda: (query.get('q') ?? '').slice(0, 120),
        categoria: categorias.some((grupo) => grupo === categoria) ? categoria : '',
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
  }, [categorias, productos.length]);

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

  const resultados = useMemo(() => {
    const palabras = normalizarBusqueda(filtros.busqueda).trim().split(/\s+/).filter(Boolean);
    const coincidencias = indice
      .filter(({ producto, texto, grupo }) =>
        (!filtros.categoria || grupo === filtros.categoria) &&
        (!filtros.disponibles || producto.stock > 0) &&
        palabras.every((palabra) => texto.includes(palabra)))
      .map(({ producto }) => producto);

    if (filtros.orden === 'menor-precio') return coincidencias.sort((a, b) => precioActual(a) - precioActual(b));
    if (filtros.orden === 'mayor-precio') return coincidencias.sort((a, b) => precioActual(b) - precioActual(a));
    if (filtros.orden === 'nombre') return coincidencias.sort((a, b) => nombres.compare(a.name, b.name));
    return coincidencias;
  }, [indice, filtros.busqueda, filtros.categoria, filtros.disponibles, filtros.orden]);

  const visibles = resultados.slice(0, filtros.cantidad);
  const hayFiltros = !!(filtros.busqueda || filtros.categoria || filtros.disponibles || filtros.orden !== 'recientes');

  return (
    <section aria-label="Productos del catálogo" className="store-shell pb-14 pt-7 md:pb-20">
      <div className="shop-panel rounded-2xl border p-4 sm:p-5">
        {categorias.length > 0 && <div className="mb-4 flex flex-wrap gap-2" aria-label="Tipos de producto" role="group">
          {['', ...categorias].map((grupo) => (
            <button type="button" key={grupo} aria-pressed={filtros.categoria === grupo}
              className="shop-chip" onClick={() => actualizar({ categoria: grupo })}>
              {grupo || 'Todos'}
            </button>
          ))}
        </div>}
        <div className="grid gap-3 sm:grid-cols-[2fr_1fr]">
          <label className="grid gap-1.5 text-sm font-semibold">
            Buscar productos
            <input ref={campoBusqueda} type="search" value={filtros.busqueda} maxLength={120}
              onChange={(event) => actualizar({ busqueda: event.target.value })}
              placeholder="Nombre o descripción"
              className="shop-control min-h-11 min-w-0 rounded-lg border px-3 text-base font-normal" />
          </label>
          <label className="grid min-w-0 gap-1.5 text-sm font-semibold">
            Ordenar por
            <select value={filtros.orden} onChange={(event) => actualizar({ orden: event.target.value as Filtros['orden'] })}
              className="shop-control min-h-11 min-w-0 rounded-lg border px-3 text-base font-normal">
              {ORDENES.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
          <label className="flex min-h-11 items-center gap-2 text-sm font-medium">
            <input type="checkbox" checked={filtros.disponibles}
              onChange={(event) => actualizar({ disponibles: event.target.checked })}
              className="shop-checkbox size-4" />
            Solo en stock
          </label>
          {hayFiltros && (
            <button type="button" onClick={() => { actualizar(INICIALES); campoBusqueda.current?.focus(); }}
              className="min-h-11 text-sm font-semibold underline underline-offset-4">
              Limpiar filtros
            </button>
          )}
        </div>
      </div>

      <p role="status" className="my-5 shop-muted text-sm font-medium">
        {resultados.length} {resultados.length === 1 ? 'producto' : 'productos'}
        {visibles.length < resultados.length && ` · Mostrando ${visibles.length}`}
      </p>
      <h2 className="sr-only">Resultados del catálogo</h2>
      {visibles.length ? (
        <div className="store-grid">
          {visibles.map((producto) => <ProductCard key={producto.id} producto={producto} />)}
        </div>
      ) : (
        <div className="shop-panel rounded-2xl border p-6">
          <h2 className="font-semibold">{hayFiltros ? 'No hay resultados con estos filtros' : linea === 'remate' ? 'Por ahora no hay productos en remate' : 'Aún no hay productos disponibles'}</h2>
        </div>
      )}

      {visibles.length < resultados.length && (
        <div className="mt-8 text-center">
          <button type="button" onClick={() => actualizar({ cantidad: filtros.cantidad + PAGE_SIZE })}
            className="shop-button">
            Ver más productos
          </button>
        </div>
      )}
    </section>
  );
}
