'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Producto, FeaturedConfig } from '@/lib/types';

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
    setSeleccionados(featureConfigInicial.productIds);
    setTitulo(featureConfigInicial.title);
  }, [featureConfigInicial]);

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
      const res = await fetch('/api/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ featured: { productIds: seleccionados, title: titulo.trim() || 'Productos más vendidos' } })
      });
      if (!res.ok) {
        let msg = 'Error al guardar';
        try {
          const data = await res.json();
          msg = data.error || msg;
        } catch {
          // respuesta vacía o no-JSON del servidor
        }
        throw new Error(msg);
      }
      setOk(true);
      onGuardado({ productIds: seleccionados, title: titulo.trim() || 'Productos más vendidos' });
    } catch (err: any) {
      setError(err.message || 'Error al guardar');
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
        Selecciona exactamente {MAX} productos que aparecerán en la página principal.
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
            <div key={p.id} className="flex items-center gap-2 bg-crema/50 rounded px-3 py-1.5">
              <span className="text-xs text-verde-noche/50 font-semibold w-5">{i + 1}.</span>
              <span className="text-sm text-verde-noche flex-1 truncate">{p.name}</span>
              <span className="text-[11px] text-sage capitalize">{p.category}</span>
              <button onClick={() => mover(p.id, -1)} disabled={i === 0} className="text-xs px-1.5 disabled:opacity-30">
                ↑
              </button>
              <button
                onClick={() => mover(p.id, 1)}
                disabled={i === productosSeleccionados.length - 1}
                className="text-xs px-1.5 disabled:opacity-30"
              >
                ↓
              </button>
              <button onClick={() => toggle(p.id)} className="text-xs text-red-500 px-1.5">
                ×
              </button>
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
              <span className="text-[11px] text-sage capitalize">{p.category}</span>
            </label>
          );
        })}
      </div>

      {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
      {ok && <p className="text-sm text-verde mt-3">✓ Guardado correctamente.</p>}

      <button
        onClick={guardar}
        disabled={guardando || seleccionados.length !== MAX}
        className="mt-4 w-full py-2.5 rounded-md bg-verde text-white text-sm font-semibold hover:bg-verde-oscuro disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {guardando ? 'Guardando…' : `Guardar destaque (${seleccionados.length}/${MAX})`}
      </button>
    </div>
  );
}