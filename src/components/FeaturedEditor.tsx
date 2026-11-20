'use client';

import AdminIcon from './AdminIcon';
import { useMemo, useState } from 'react';
import { LINEAS, grupoProducto, normalizarBusqueda, type Linea } from '@/lib/lineas';
import { MAX_DESTACADOS, TITULO_DESTACADOS } from '@/lib/destacados';
import type { Producto, FeaturedConfig } from '@/lib/types';
import { adminFetch } from '@/lib/adminFetch';

type Props = {
  productos: Producto[];
  linea: Linea;
  featureConfigInicial: FeaturedConfig;
  onGuardado: (config: FeaturedConfig) => void;
};

export default function FeaturedEditor({ productos, linea, featureConfigInicial, onGuardado }: Props) {
  const [seleccionados, setSeleccionados] = useState(() => featureConfigInicial.productIds.filter((id) => productos.some((producto) => producto.id === id)));
  const [titulo, setTitulo] = useState(featureConfigInicial.title);
  const [busqueda, setBusqueda] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [ok, setOk] = useState(false);

  const filtrados = useMemo(() => {
    const term = normalizarBusqueda(busqueda);
    if (!term) return productos;
    return productos.filter((p) => normalizarBusqueda(`${p.name} ${p.category} ${grupoProducto(p, linea)}`).includes(term));
  }, [productos, busqueda, linea]);

  function toggle(id: number) {
    setOk(false);
    setSeleccionados((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= MAX_DESTACADOS) return prev;
      return [...prev, id];
    });
  }

  function mover(id: number, dir: -1 | 1) {
    setSeleccionados((prev) => {
      const i = prev.indexOf(id);
      if (i === -1) return prev;
      const j = i + dir;
      if (j < 0 || j >= prev.length) return prev;
      const arr = [...prev];
      [arr[i], arr[j]] = [arr[j], arr[i]];
      return arr;
    });
  }

  async function guardar() {
    setError('');
    setOk(false);
    setGuardando(true);
    const config = { productIds: seleccionados, title: titulo.trim() || TITULO_DESTACADOS };
    try {
      const res = await adminFetch('/api/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ featured: { linea, ...config } })
      });
      if (!res.ok) {
        const text = await res.text();
        let msg = `Error al guardar (HTTP ${res.status})`;
        try {
          const data = JSON.parse(text);
          msg = data.error || msg;
        } catch {
          if (text) msg += `: ${text.slice(0, 200)}`;
        }
        throw new Error(msg);
      }
      setOk(true);
      onGuardado(config);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al guardar';
      setError(message);
    } finally {
      setGuardando(false);
    }
  }

  const productosSeleccionados = seleccionados
    .map((id) => productos.find((p) => p.id === id))
    .filter((p): p is Producto => !!p);

  return (
    <div className="bg-white rounded-lg shadow-sm p-5">
      <h3 className="font-display text-lg text-verde-noche mb-1">Más vendidos de {LINEAS[linea].nombre}</h3>
      <p className="text-xs text-verde-noche/60 mb-4">
        Elige hasta {MAX_DESTACADOS} productos visibles. Si guardas la lista vacía, se oculta este bloque en la tienda.
      </p>

      <label className="mb-4 grid gap-1 text-sm font-medium text-verde-noche">Título de más vendidos
        <input
        value={titulo}
        onChange={(e) => {
          setTitulo(e.target.value);
          setOk(false);
        }}
        placeholder={TITULO_DESTACADOS}
        maxLength={80}
        className="w-full rounded border border-verde-noche/20 px-3 py-2 text-sm font-normal"
        />
      </label>

      <div className="mb-4">
        <p className="text-sm font-medium text-verde-noche mb-2">
          Seleccionados ({seleccionados.length}/{MAX_DESTACADOS})
        </p>
        <div className="space-y-1.5">
          {productosSeleccionados.length === 0 && (
            <p className="text-xs text-verde-noche/50 italic">Ninguno seleccionado aún.</p>
          )}
          {productosSeleccionados.map((p, i) => (
            <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-crema/50 px-3 py-2">
              <div className="min-w-0 flex-1 basis-24">
                <p className="break-words text-sm text-verde-noche">{i + 1}. {p.name}</p>
                <p className="text-xs text-verde-oscuro">{grupoProducto(p, linea)}</p>
              </div>
              <div className="flex shrink-0 gap-1">
                <button type="button" onClick={() => mover(p.id, -1)} disabled={guardando || i === 0}
                  aria-label={`Subir ${p.name}`}
                  className="grid size-10 place-items-center rounded-lg border border-verde-noche/15 bg-white hover:bg-crema disabled:opacity-30">
                  <AdminIcon name="arriba" />
                </button>
                <button type="button" onClick={() => mover(p.id, 1)} disabled={guardando || i === productosSeleccionados.length - 1}
                  aria-label={`Bajar ${p.name}`}
                  className="grid size-10 place-items-center rounded-lg border border-verde-noche/15 bg-white hover:bg-crema disabled:opacity-30">
                  <AdminIcon name="abajo" />
                </button>
                <button type="button" disabled={guardando} onClick={() => toggle(p.id)} aria-label={`Quitar ${p.name} de destacados`}
                  className="grid size-10 place-items-center rounded-lg border border-red-200 bg-red-50 text-red-800 hover:bg-red-100">
                  <AdminIcon name="cerrar" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <input
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        aria-label="Buscar productos para destacar"
        type="search"
        placeholder="Buscar productos para destacar..."
        className="w-full px-3 py-2 rounded border border-verde-noche/20 text-sm mb-3"
      />

      <div className="max-h-64 overflow-y-auto border border-verde-noche/10 rounded">
        {filtrados.length === 0 && <p className="p-3 text-sm text-verde-noche/70">No hay productos visibles que coincidan.</p>}
        {filtrados.slice(0, 100).map((p) => {
          const checked = seleccionados.includes(p.id);
          const disabled = guardando || (!checked && seleccionados.length >= MAX_DESTACADOS);
          return (
            <label
              key={p.id}
              className={`flex items-center gap-3 px-3 py-2 border-b border-verde-noche/5 last:border-0 ${
                disabled ? 'opacity-40' : 'hover:bg-crema/30 cursor-pointer'
              }`}
            >
              <input
                type="checkbox"
                checked={checked}
                disabled={disabled}
                onChange={() => toggle(p.id)}
                className="w-4 h-4 accent-verde-oscuro"
              />
              <span className="text-sm text-verde-noche flex-1 truncate">{p.name}</span>
              <span className="text-[11px] text-verde-oscuro">{grupoProducto(p, linea)}</span>
            </label>
          );
        })}
      </div>

      {error && <p role="alert" className="text-sm text-red-600 mt-3">{error}</p>}
      {ok && <p role="status" className="mt-3 flex items-center gap-2 text-sm text-verde-oscuro"><AdminIcon name="check" /> Guardado correctamente.</p>}

      <button
        onClick={guardar}
        disabled={guardando}
        className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 py-2.5 rounded-md bg-verde text-white text-sm font-semibold hover:bg-verde-oscuro disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <AdminIcon name="guardar" /> {guardando ? 'Guardando…' : 'Guardar más vendidos'}
      </button>
    </div>
  );
}
