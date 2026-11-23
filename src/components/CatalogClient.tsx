'use client';

import { grupoProducto, LINEAS, normalizarBusqueda, type Linea } from '@/lib/lineas';
import { useEffect, useMemo, useRef, useState } from 'react';
import { esOferta, precioActual } from '@/lib/precios';
import ProductCard from './ProductCard';
import type { Producto } from '@/lib/types';

const PAGE_SIZE = 8;
const CATEGORIA_OFERTAS = 'Ofertas';
const ORDENES = [
  { value: 'recientes', label: 'Más recientes' },
  { value: 'menor-precio', label: 'Menor precio' },
  { value: 'mayor-precio', label: 'Mayor precio' },
  { value: 'nombre', label: 'Nombre: A a Z' }
] as const;

type Filtros = {
  busqueda: string;
  categoria: string;
  subcategoria: string;
  orden: typeof ORDENES[number]['value'];
  disponibles: boolean;
  pagina: number;
};

const INICIALES: Filtros = {
  busqueda: '',
  categoria: '',
  subcategoria: '',
  orden: 'recientes',
  disponibles: false,
  pagina: 1
};

const nombres = new Intl.Collator('es-CL', { sensitivity: 'base' });

function paginasVisibles(actual: number, total: number) {
  const paginas = new Set([1, total, actual - 1, actual, actual + 1]);
  return [...paginas].filter((pagina) => pagina >= 1 && pagina <= total).sort((a, b) => a - b);
}

export default function CatalogClient({ productos, linea, ordenGrupos }: { productos: Producto[]; linea: Linea; ordenGrupos: string[] }) {
  const indice = useMemo(() => productos.map((producto) => ({
    producto,
    grupo: grupoProducto(producto, linea),
    oferta: linea !== 'remate' && esOferta(producto),
    texto: normalizarBusqueda(`${producto.name} ${producto.category} ${producto.subcategoria} ${producto.description || ''}`)
  })), [productos, linea]);
  const categorias = useMemo(() => {
    const grupos = new Set<string>(LINEAS[linea].grupos);
    const ordenadas = [...ordenGrupos.filter((grupo) => grupos.delete(grupo)), ...grupos];
    return linea === 'remate' ? ordenadas : [CATEGORIA_OFERTAS, ...ordenadas];
  }, [linea, ordenGrupos]);
  const [filtros, setFiltros] = useState(INICIALES);
  const campoBusqueda = useRef<HTMLInputElement>(null);
  const inicioResultados = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    function leerFiltros() {
      const query = new URLSearchParams(window.location.search);
      const categoriaSolicitada = query.get('categoria') ?? '';
      const categoria = categorias.includes(categoriaSolicitada) ? categoriaSolicitada : '';
      const pagina = Number(query.get('pagina'));
      setFiltros({
        busqueda: (query.get('q') ?? '').slice(0, 120),
        categoria,
        subcategoria: categoria && categoria !== CATEGORIA_OFERTAS ? (query.get('subcategoria') ?? '').slice(0, 80) : '',
        orden: ORDENES.find((opcion) => opcion.value === query.get('orden'))?.value ?? 'recientes',
        disponibles: query.get('stock') === '1',
        pagina: Number.isSafeInteger(pagina) && pagina > 0 ? pagina : 1
      });
    }
    leerFiltros();
    window.addEventListener('popstate', leerFiltros);
    return () => window.removeEventListener('popstate', leerFiltros);
  }, [categorias]);

  function actualizar(cambios: Partial<Filtros>, guardarHistorial = false) {
    const siguientes = { ...filtros, pagina: 1, ...cambios };
    setFiltros(siguientes);
    const url = new URL(window.location.href);
    const parametros = {
      q: siguientes.busqueda.trim(),
      categoria: siguientes.categoria,
      subcategoria: siguientes.subcategoria,
      orden: siguientes.orden === 'recientes' ? '' : siguientes.orden,
      stock: siguientes.disponibles ? '1' : '',
      pagina: siguientes.pagina > 1 ? String(siguientes.pagina) : ''
    };
    for (const [clave, valor] of Object.entries(parametros)) {
      if (valor) url.searchParams.set(clave, valor);
      else url.searchParams.delete(clave);
    }
    window.history[guardarHistorial ? 'pushState' : 'replaceState'](window.history.state, '', url);
  }

  const subcategorias = useMemo(() => {
    if (!filtros.categoria || filtros.categoria === CATEGORIA_OFERTAS) return [];
    return [...new Set(indice
      .filter(({ grupo, producto }) => grupo === filtros.categoria && producto.subcategoria)
      .map(({ producto }) => producto.subcategoria))].sort(nombres.compare);
  }, [indice, filtros.categoria]);

  const resultados = useMemo(() => {
    const palabras = normalizarBusqueda(filtros.busqueda).trim().split(/\s+/).filter(Boolean);
    const coincidencias = indice
      .filter(({ producto, texto, grupo, oferta }) =>
        (!filtros.categoria || (filtros.categoria === CATEGORIA_OFERTAS ? oferta : grupo === filtros.categoria)) &&
        (!filtros.subcategoria || producto.subcategoria === filtros.subcategoria) &&
        (!filtros.disponibles || producto.stock > 0) &&
        palabras.every((palabra) => texto.includes(palabra)))
      .map(({ producto }) => producto);

    if (filtros.orden === 'menor-precio') return coincidencias.sort((a, b) => precioActual(a) - precioActual(b));
    if (filtros.orden === 'mayor-precio') return coincidencias.sort((a, b) => precioActual(b) - precioActual(a));
    if (filtros.orden === 'nombre') return coincidencias.sort((a, b) => nombres.compare(a.name, b.name));
    return coincidencias;
  }, [indice, filtros]);

  const totalPaginas = Math.max(1, Math.ceil(resultados.length / PAGE_SIZE));
  const paginaActual = Math.min(filtros.pagina, totalPaginas);
  const inicio = (paginaActual - 1) * PAGE_SIZE;
  const visibles = resultados.slice(inicio, inicio + PAGE_SIZE);
  const hayFiltros = !!(filtros.busqueda || filtros.categoria || filtros.subcategoria || filtros.disponibles || filtros.orden !== 'recientes');

  function irPagina(pagina: number) {
    if (pagina === paginaActual || pagina < 1 || pagina > totalPaginas) return;
    actualizar({ pagina }, true);
    window.requestAnimationFrame(() => inicioResultados.current?.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start'
    }));
  }

  const paginas = paginasVisibles(paginaActual, totalPaginas);

  return (
    <section aria-label="Productos del catálogo" className="store-shell pb-14 pt-7 md:pb-20">
      <div className="shop-panel rounded-2xl border p-4 sm:p-5">
        {categorias.length > 0 && <div className="mb-4 flex flex-wrap gap-2" aria-label="Tipos de producto" role="group">
          {['', ...categorias].map((grupo) => (
            <button type="button" key={grupo} aria-pressed={filtros.categoria === grupo}
              className="shop-chip" onClick={() => actualizar({ categoria: grupo, subcategoria: '' })}>
              {grupo || 'Todos'}
            </button>
          ))}
        </div>}
        {subcategorias.length > 0 && (
          <div className="mb-4 border-t border-[var(--shop-line)] pt-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] shop-muted">Subcategoría</p>
            <div className="flex flex-wrap gap-2" role="group" aria-label={`Subcategorías de ${filtros.categoria}`}>
              {['', ...subcategorias].map((subcategoria) => (
                <button type="button" key={subcategoria} aria-pressed={filtros.subcategoria === subcategoria}
                  className="shop-chip" onClick={() => actualizar({ subcategoria })}>
                  {subcategoria || 'Todas'}
                </button>
              ))}
            </div>
          </div>
        )}
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

      <p ref={inicioResultados} role="status" className="my-5 scroll-mt-28 shop-muted text-sm font-medium">
        {resultados.length} {resultados.length === 1 ? 'producto' : 'productos'}
        {resultados.length > 0 && ` · Mostrando ${inicio + 1}–${Math.min(inicio + PAGE_SIZE, resultados.length)}`}
      </p>
      <h2 className="sr-only">Resultados del catálogo</h2>
      {visibles.length ? (
        <div className="store-grid">
          {visibles.map((producto) => <ProductCard key={producto.id} producto={producto} />)}
        </div>
      ) : (
        <div className="shop-panel rounded-2xl border p-6">
          <h2 className="font-semibold">{hayFiltros ? 'No hay resultados con estos filtros' : 'Aún no hay productos disponibles'}</h2>
        </div>
      )}

      {totalPaginas > 1 && (
        <nav aria-label="Paginación del catálogo" className="mt-9 flex flex-wrap items-center justify-center gap-2">
          <button type="button" disabled={paginaActual === 1} onClick={() => irPagina(paginaActual - 1)}
            className="shop-page-button px-3">Anterior</button>
          {paginas.map((pagina, indicePagina) => (
            <span key={pagina} className="contents">
              {indicePagina > 0 && pagina - paginas[indicePagina - 1] > 1 && <span aria-hidden="true" className="px-1 shop-muted">…</span>}
              <button type="button" aria-current={pagina === paginaActual ? 'page' : undefined}
                aria-label={`Página ${pagina}`} onClick={() => irPagina(pagina)} className="shop-page-button size-11">
                {pagina}
              </button>
            </span>
          ))}
          <button type="button" disabled={paginaActual === totalPaginas} onClick={() => irPagina(paginaActual + 1)}
            className="shop-page-button px-3">Siguiente</button>
        </nav>
      )}
    </section>
  );
}
