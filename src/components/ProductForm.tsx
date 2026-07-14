'use client';

import { useState, useRef, useCallback } from 'react';
import { fileToDataUrl } from '@/lib/fileToDataUrl';
import type { Producto } from '@/lib/types';
import { adminFetch } from '@/lib/adminFetch';
import { MAX_PRODUCT_IMAGES, MAX_UPLOAD_BYTES } from '@/lib/uploadLimits';

type Props = {
  producto?: Producto | null;
  categorias: string[];
  onGuardado: () => void;
  onCancelar: () => void;
};

type EstadoSubida = {
  id: string;
  url?: string;
  estado: 'subiendo' | 'ok' | 'error';
  progreso: number;
  error?: string;
};

const MIME_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif', 'image/heic', 'image/heif'];
const ACCEPT = 'image/jpeg,image/png,image/webp,image/gif,image/avif,image/heic,image/heif,.heic,.heif';

function archivoValido(file: File): string | null {
  const mime = (file.type || '').toLowerCase();
  const esHeic = mime === 'image/heic' || mime === 'image/heif' || file.name.toLowerCase().match(/\.heic$|\.heif$/);
  if (!MIME_PERMITIDOS.includes(mime) && !esHeic) {
    return 'Formato no admitido (use JPG, PNG, WebP, GIF, AVIF o HEIC)';
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return 'Supera 4 MB';
  }
  return null;
}

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
  const [subidas, setSubidas] = useState<EstadoSubida[]>([]);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const subiendo = subidas.some((s) => s.estado === 'subiendo');
  const totalPendientes = imagenes.length + subidas.filter((s) => s.estado === 'subiendo').length;
  const alLimite = totalPendientes >= MAX_PRODUCT_IMAGES;

  async function subirArchivo(file: File): Promise<void> {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const errValidacion = archivoValido(file);
    if (errValidacion) {
      setSubidas((prev) => [...prev, { id, estado: 'error', progreso: 0, error: errValidacion }]);
      return;
    }
    setSubidas((prev) => [...prev, { id, estado: 'subiendo', progreso: 0 }]);
    try {
      const dataUrl = await fileToDataUrl(file);
      setSubidas((prev) => prev.map((s) => (s.id === id ? { ...s, progreso: 50 } : s)));
      const res = await adminFetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: dataUrl })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al subir la imagen');
      setImagenes((prev) => [...prev, data.url]);
      setSubidas((prev) => prev.map((s) => (s.id === id ? { ...s, estado: 'ok', url: data.url, progreso: 100 } : s)));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al subir la imagen';
      setSubidas((prev) => prev.map((s) => (s.id === id ? { ...s, estado: 'error', error: message } : s)));
    }
  }

  const procesarArchivos = useCallback((files: FileList | File[]) => {
    const arr = Array.from(files);
    if (!arr.length) return;
    const espacioDisponible = MAX_PRODUCT_IMAGES - totalPendientes;
    if (espacioDisponible <= 0) {
      setError(`Máximo ${MAX_PRODUCT_IMAGES} imágenes por producto.`);
      return;
    }
    arr.slice(0, espacioDisponible).forEach((file) => subirArchivo(file));
    if (arr.length > espacioDisponible) {
      setError(`Solo se agregaron ${espacioDisponible} imagen(es); máximo ${MAX_PRODUCT_IMAGES} por producto.`);
    } else {
      setError('');
    }
  }, [totalPendientes]);

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files?.length) procesarArchivos(e.target.files);
    e.target.value = '';
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files?.length) procesarArchivos(e.dataTransfer.files);
  }

  function handleQuitarImagen(index: number) {
    setImagenes((prev) => prev.filter((_, i) => i !== index));
  }

  function quitarSubida(id: string) {
    setSubidas((prev) => prev.filter((s) => s.id !== id));
  }

  function moverImagen(index: number, dir: -1 | 1) {
    const nuevoIndex = index + dir;
    if (nuevoIndex < 0 || nuevoIndex >= imagenes.length) return;
    setImagenes((prev) => {
      const copia = [...prev];
      [copia[index], copia[nuevoIndex]] = [copia[nuevoIndex], copia[index]];
      return copia;
    });
  }

  function handleDragStart(i: number) {
    setDragIndex(i);
  }
  function handleDragOver(e: React.DragEvent<HTMLDivElement>, i: number) {
    e.preventDefault();
    if (dragIndex === null || dragIndex === i) return;
    setDragOverIndex(i);
  }
  function handleDropReorder(i: number) {
    if (dragIndex === null || dragIndex === i) return;
    setImagenes((prev) => {
      const copia = [...prev];
      const [movido] = copia.splice(dragIndex, 1);
      copia.splice(i, 0, movido);
      return copia;
    });
    setDragIndex(null);
    setDragOverIndex(null);
  }
  function handleDragEnd() {
    setDragIndex(null);
    setDragOverIndex(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const categoriaFinal = categoriaNueva.trim() || category;
    if (!name.trim() || !categoriaFinal.trim()) {
      setError('El nombre y la categoría son obligatorios.');
      return;
    }
    if (subiendo) {
      setError('Espera que terminen de subir las imágenes.');
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
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al guardar el producto';
      setError(message);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6 overflow-y-auto">
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto"
      >
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
              <option key={c} value={c}>{c}</option>
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

        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-verde-noche">Imágenes</label>
          <span className="text-xs text-verde-noche/50">{imagenes.length} / {MAX_PRODUCT_IMAGES}</span>
        </div>

        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => !alLimite && !subiendo && inputRef.current?.click()}
          className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors mb-3 ${
            dragOver ? 'border-verde bg-verde/5' : 'border-verde-noche/20 hover:border-verde-noche/40'
          } ${alLimite || subiendo ? 'opacity-50 pointer-events-none' : ''}`}
        >
          <p className="text-sm text-verde-noche/70">
            {alLimite ? 'Límite de imágenes alcanzado' : 'Arrastra imágenes aquí o haz clic para subir'}
          </p>
          <p className="text-xs text-verde-noche/40 mt-1">JPG, PNG, WebP, GIF, AVIF, HEIC · máx 4 MB · hasta {MAX_PRODUCT_IMAGES} fotos</p>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT}
            multiple
            onChange={handleInputChange}
            className="hidden"
          />
        </div>

        {imagenes.length > 0 && (
          <p className="text-xs text-verde-noche/50 mb-2">Arrastra para reordenar. La primera imagen es la principal.</p>
        )}

        <div className="grid grid-cols-4 gap-2 mb-3">
          {imagenes.map((url, i) => (
            <div
              key={`${url}-${i}`}
              draggable
              onDragStart={() => handleDragStart(i)}
              onDragOver={(e) => handleDragOver(e, i)}
              onDrop={() => handleDropReorder(i)}
              onDragEnd={handleDragEnd}
              className={`relative w-full aspect-square rounded overflow-hidden bg-crema group ${
                i === 0 ? 'ring-2 ring-verde' : ''
              } ${dragOverIndex === i && dragIndex !== null ? 'ring-2 ring-verde-oscuro' : ''}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="w-full h-full object-cover pointer-events-none" />
              {i === 0 && (
                <span className="absolute top-0.5 left-0.5 bg-verde text-white text-[9px] font-semibold px-1 rounded">PORTADA</span>
              )}
              <button
                type="button"
                onClick={() => handleQuitarImagen(i)}
                className="absolute -top-1.5 -right-1.5 bg-red-500 text-white w-5 h-5 rounded-full text-xs leading-none shadow"
                aria-label="Quitar imagen"
              >×</button>
              <div className="absolute inset-0 flex items-center justify-center gap-1 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  type="button"
                  onClick={() => moverImagen(i, -1)}
                  disabled={i === 0}
                  aria-label="Mover a la izquierda"
                  className="bg-white/90 text-verde-noche w-6 h-6 rounded text-xs disabled:opacity-30"
                >◀</button>
                <button
                  type="button"
                  onClick={() => moverImagen(i, 1)}
                  disabled={i === imagenes.length - 1}
                  aria-label="Mover a la derecha"
                  className="bg-white/90 text-verde-noche w-6 h-6 rounded text-xs disabled:opacity-30"
                >▶</button>
              </div>
            </div>
          ))}

          {subidas.filter((s) => s.estado === 'subiendo').map((s) => (
            <div key={s.id} className="relative w-full aspect-square rounded bg-crema flex items-center justify-center">
              <div className="absolute inset-0 bg-verde/10" style={{ height: `${s.progreso}%` }} />
              <span className="relative text-xs text-verde-noche/60">…</span>
            </div>
          ))}

          {subidas.filter((s) => s.estado === 'error').map((s) => (
            <div key={s.id} className="relative w-full aspect-square rounded bg-red-50 flex items-center justify-center p-1 text-center">
              <span className="text-[9px] text-red-600 leading-tight">{s.error}</span>
              <button
                type="button"
                onClick={() => quitarSubida(s.id)}
                className="absolute -top-1.5 -right-1.5 bg-red-500 text-white w-5 h-5 rounded-full text-xs leading-none shadow"
                aria-label="Quitar error"
              >×</button>
            </div>
          ))}
        </div>

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