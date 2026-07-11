'use client';

import { useState } from 'react';

export default function CategoryOrderEditor({
  categorias,
  ordenInicial,
  onGuardado
}: {
  categorias: string[];
  ordenInicial: string[];
  onGuardado: (nuevoOrden: string[]) => void;
}) {
  const inicial = [...ordenInicial.filter((c) => categorias.includes(c)), ...categorias.filter((c) => !ordenInicial.includes(c))];
  const [orden, setOrden] = useState<string[]>(inicial);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  function mover(index: number, direccion: -1 | 1) {
    const destino = index + direccion;
    if (destino < 0 || destino >= orden.length) return;
    const copia = [...orden];
    [copia[index], copia[destino]] = [copia[destino], copia[index]];
    setOrden(copia);
  }

  async function guardar() {
    setGuardando(true);
    setError('');
    try {
      const res = await fetch('/api/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categoryOrder: orden })
      });
      if (!res.ok) {
        let msg = 'Error al guardar el orden';
        try {
          const data = await res.json();
          msg = data.error || msg;
        } catch {
          // respuesta vacía o no-JSON
        }
        throw new Error(msg);
      }
      onGuardado(orden);
    } catch (err: any) {
      setError(err.message || 'Error de conexión');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="bg-white rounded-lg p-5 shadow-sm">
      <h3 className="font-display text-lg text-verde-noche mb-1">Orden de categorías</h3>
      <p className="text-xs text-verde-noche/60 mb-4">Así se ordenan las secciones en el catálogo público.</p>
      <ul className="space-y-1.5 mb-4">
        {orden.map((cat, i) => (
          <li
            key={cat}
            className="flex items-center justify-between bg-crema/60 rounded px-3 py-2 text-sm capitalize text-verde-noche"
          >
            <span>{cat}</span>
            <div className="flex gap-1">
              <button
                onClick={() => mover(i, -1)}
                disabled={i === 0}
                className="w-6 h-6 rounded border border-verde-noche/20 text-xs disabled:opacity-30"
              >
                ↑
              </button>
              <button
                onClick={() => mover(i, 1)}
                disabled={i === orden.length - 1}
                className="w-6 h-6 rounded border border-verde-noche/20 text-xs disabled:opacity-30"
              >
                ↓
              </button>
            </div>
          </li>
        ))}
      </ul>
      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
      <button
        onClick={guardar}
        disabled={guardando}
        className="w-full py-2 rounded-md bg-verde-oscuro text-white text-sm font-semibold hover:bg-verde-noche disabled:opacity-60"
      >
        {guardando ? 'Guardando…' : 'Guardar orden'}
      </button>
    </div>
  );
}
