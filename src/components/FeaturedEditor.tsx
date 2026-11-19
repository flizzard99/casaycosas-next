'use client';

import AdminIcon from './AdminIcon';
import { nombreCategoria } from '@/lib/categorias';
import { useEffect, useMemo, useState } from 'react';
import type { Producto, FeaturedConfig } from '@/lib/types';
import { adminFetch } from '@/lib/adminFetch';

type Props = {
  productos: Producto[];
  featureConfigInicial: FeaturedConfig;
  onGuardado: (config: FeaturedConfig) => void;
};

const MAX = 4;

export default function FeaturedEditor({ productos, featureConfigInicial, onGuardado }: Props) {
  const [seleccionados, setSeleccionados] = useState<number[]>(featureConfigInicial.productIds);
  const [titulo, setTitulo] = useState(featureConfigInicial.title);
  const [busqueda, setBusqueda] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [ok, setOk] = useState(false);

  useEffect(() => {
    setSeleccionados(featureConfigInicial.productIds.filter((id) => productos.some((producto) => producto.id === id)));
    setTitulo(featureConfigInicial.title);
  }, [featureConfigInicial, productos]);

  const filtrados = useMemo(() => {
    const term = busqueda.trim().toLowerCase();
    if (!term) return productos;
    return productos.filter((p) => p.name.toLowerCase().includes(term) || p.category.toLowerCase().includes(term));
  }, [productos, busqueda]);

  function toggle(id: number) {
    setOk(false);
    setSeleccionados((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= MAX) return prev;
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
    if (seleccionados.length !== MAX) {
      setError(`Debes seleccionar exactamente ${MAX} productos.`);
      return;
    }
    setError('');
    setOk(false);
    setGuardando(true);
    try {
      const res = await adminFetch('/api/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ featured: { productIds: seleccionados, title: titulo.trim() || 'Productos más vendidos' } })
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
      onGuardado({ productIds: seleccionados, title: titulo.trim() || 'Productos más vendidos' });
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
      <h3 className="font-display text-lg text-verde-noche mb-1">Productos destacados</h3>
      <p className="text-xs text-verde-noche/60 mb-4">
        Selecciona exactamente {MAX} productos que aparecerán como destacados en sus colecciones.
      </p>

      <label className="block text-sm font-medium text-verde-noche mb-1">Título de la sección</label>
      <input
        value={titulo}
        onChange={(e) => {
          setTitulo(e.target.value);
          setOk(false);
        }}
        placeholder="Productos más vendidos"
        maxLength={80}
        className="w-full px-3 py-2 rounded border border-verde-noche/20 text-sm mb-4"
      />

      <div className="mb-4">
        <p className="text-sm font-medium text-verde-noche mb-2">
          Seleccionados ({seleccionados.length}/{MAX})
        </p>
        <div className="space-y-1.5">
          {productosSeleccionados.length === 0 && (
            <p className="text-xs text-verde-noche/50 italic">Ninguno seleccionado aún.</p>
          )}
          {productosSeleccionados.map((p, i) => (
            <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-crema/50 px-3 py-2">
              <div className="min-w-0 flex-1 basis-24">
                <p className="break-words text-sm text-verde-noche">{i + 1}. {p.name}</p>
                <p className="text-xs text-verde-oscuro">{nombreCategoria(p.category)}</p>
              </div>
              <div className="flex shrink-0 gap-1">
                <button type="button" onClick={() => mover(p.id, -1)} disabled={i === 0}
                  aria-label={`Subir ${p.name}`}
                  className="grid size-10 place-items-center rounded-lg border border-verde-noche/15 bg-white hover:bg-crema disabled:opacity-30">
                  <AdminIcon name="arriba" />
                </button>
                <button type="button" onClick={() => mover(p.id, 1)} disabled={i === productosSeleccionados.length - 1}
                  aria-label={`Bajar ${p.name}`}
                  className="grid size-10 place-items-center rounded-lg border border-verde-noche/15 bg-white hover:bg-crema disabled:opacity-30">
                  <AdminIcon name="abajo" />
                </button>
                <button type="button" onClick={() => toggle(p.id)} aria-label={`Quitar ${p.name} de destacados`}
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
        placeholder="Buscar productos para destacar..."
        className="w-full px-3 py-2 rounded border border-verde-noche/20 text-sm mb-3"
      />

      <div className="max-h-64 overflow-y-auto border border-verde-noche/10 rounded">
        {filtrados.slice(0, 100).map((p) => {
          const checked = seleccionados.includes(p.id);
          const disabled = !checked && seleccionados.length >= MAX;
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
              <span className="text-[11px] text-verde-oscuro">{nombreCategoria(p.category)}</span>
            </label>
          );
        })}
      </div>

      {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
      {ok && <p role="status" className="mt-3 flex items-center gap-2 text-sm text-verde-oscuro"><AdminIcon name="check" /> Guardado correctamente.</p>}

      <button
        onClick={guardar}
        disabled={guardando || seleccionados.length !== MAX}
        className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 py-2.5 rounded-md bg-verde text-white text-sm font-semibold hover:bg-verde-oscuro disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <AdminIcon name="guardar" /> {guardando ? 'Guardando…' : `Guardar destaque (${seleccionados.length}/${MAX})`}
      </button>
    </div>
  );
}