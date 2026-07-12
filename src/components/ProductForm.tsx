'use client';

import { useState } from 'react';
import { fileToDataUrl } from '@/lib/fileToDataUrl';
import type { Producto } from '@/lib/types';
import { adminFetch } from '@/lib/adminFetch';

type Props = {
  producto?: Producto | null;
  categorias: string[];
  onGuardado: () => void;
  onCancelar: () => void;
};

export default function ProductForm({ producto, categorias, onGuardado, onCancelar }: Props) {
  const esEdicion = !!producto;
  const [name, setName] = useState(producto?.name || '');
  const [description, setDescription] = useState(producto?.description || '');
  const [category, setCategory] = useState(producto?.category || categorias[0] || '');
  const [categoriaNueva, setCategoriaNueva] = useState('');
  const [price, setPrice] = useState(producto?.price?.toString() || '0');
  const [stock, setStock] = useState(producto?.stock?.toString() || '0');
  const [instagramUrl, setInstagramUrl] = useState(producto?.instagram_url || '');
  const [imagenes, setImagenes] = useState<string[]>(producto?.images || []);
  const [subiendo, setSubiendo] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  async function handleSubirImagen(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    if (!archivo) return;
    setSubiendo(true);
    setError('');
    try {
      const dataUrl = await fileToDataUrl(archivo);
      const res = await adminFetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: dataUrl })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al subir la imagen');

      setImagenes((prev) => [...prev, data.url]);
    } catch (err: any) {
      setError(err.message || 'Error al subir la imagen');
    } finally {
      setSubiendo(false);
      e.target.value = '';
    }
  }

  async function handleQuitarImagen(index: number) {
    setImagenes((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const categoriaFinal = categoriaNueva.trim() || category;
    if (!name.trim() || !categoriaFinal.trim()) {
      setError('El nombre y la categoría son obligatorios.');
      return;
    }
    setGuardando(true);
    try {
      const body = {
        name: name.trim(),
        description,
        category: categoriaFinal.trim(),
        price: Math.max(0, parseInt(price, 10) || 0),
        stock: Math.max(0, parseInt(stock, 10) || 0),
        instagram_url: instagramUrl,
        image_url: imagenes[0] || '',
        images: imagenes
      };
      const url = esEdicion ? `/api/productos/${producto!.id}` : '/api/productos';
      const method = esEdicion ? 'PUT' : 'POST';
      const res = await adminFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al guardar el producto');
      onGuardado();
    } catch (err: any) {
      setError(err.message || 'Error al guardar el producto');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="font-display text-xl text-verde-noche mb-5">
          {esEdicion ? 'Editar producto' : 'Nuevo producto'}
        </h2>

        <label className="block text-sm font-medium text-verde-noche mb-1">Nombre</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-3 py-2 rounded border border-verde-noche/20 mb-3 text-sm"
        />

        <label className="block text-sm font-medium text-verde-noche mb-1">Descripción</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 rounded border border-verde-noche/20 mb-3 text-sm"
        />

        <label className="block text-sm font-medium text-verde-noche mb-1">Categoría</label>
        <div className="flex gap-2 mb-3">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="flex-1 px-3 py-2 rounded border border-verde-noche/20 text-sm capitalize"
          >
            {categorias.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <input
          value={categoriaNueva}
          onChange={(e) => setCategoriaNueva(e.target.value)}
          placeholder="O escribe una categoría nueva"
          className="w-full px-3 py-2 rounded border border-verde-noche/20 mb-3 text-sm"
        />

        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-sm font-medium text-verde-noche mb-1">Precio (CLP)</label>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full px-3 py-2 rounded border border-verde-noche/20 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-verde-noche mb-1">Stock</label>
            <input
              type="number"
              value={stock}
              onChange={(e) => setStock(e.target.value)}
              className="w-full px-3 py-2 rounded border border-verde-noche/20 text-sm"
            />
          </div>
        </div>

        <label className="block text-sm font-medium text-verde-noche mb-1">Instagram (opcional)</label>
        <input
          value={instagramUrl}
          onChange={(e) => setInstagramUrl(e.target.value)}
          placeholder="https://instagram.com/..."
          className="w-full px-3 py-2 rounded border border-verde-noche/20 mb-4 text-sm"
        />

        <label className="block text-sm font-medium text-verde-noche mb-2">Imágenes</label>
        <div className="flex flex-wrap gap-2 mb-3">
          {imagenes.map((url, i) => (
            <div key={i} className="relative w-16 h-16">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="w-full h-full object-cover rounded" />
              <button
                type="button"
                onClick={() => handleQuitarImagen(i)}
                className="absolute -top-1.5 -right-1.5 bg-red-500 text-white w-5 h-5 rounded-full text-xs leading-none"
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <input type="file" accept="image/*" onChange={handleSubirImagen} disabled={subiendo} className="text-sm mb-4" />

        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

        <div className="flex gap-3 mt-2">
          <button
            type="button"
            onClick={onCancelar}
            className="flex-1 py-2.5 rounded-md border border-verde-noche/20 text-sm font-semibold text-verde-noche"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={guardando || subiendo}
            className="flex-1 py-2.5 rounded-md bg-verde text-white text-sm font-semibold hover:bg-verde-oscuro disabled:opacity-60"
          >
            {guardando ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </form>
    </div>
  );
}
