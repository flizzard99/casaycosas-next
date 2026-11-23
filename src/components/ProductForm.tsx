'use client';

import AdminIcon from './AdminIcon';
import { LINEAS, SUBCATEGORIAS_SUGERIDAS, categoriaDefinida, grupoProducto, lineaProducto } from '@/lib/lineas';
import { nombreCategoria } from '@/lib/categorias';
import { useEffect, useState, useRef } from 'react';
import { prepararArchivoDiseno } from '@/lib/imagenDiseno';
import type { Producto, Variante } from '@/lib/types';
import { etiquetaVariante } from '@/lib/variantes';
import { adminFetch } from '@/lib/adminFetch';
import { MAX_PRODUCT_IMAGES, MAX_UPLOAD_BYTES, MAX_UPLOAD_DIRECT_BYTES } from '@/lib/uploadLimits';
import { parsearEncuadre, estilosEncuadre, quitarEncuadre } from '@/lib/encuadre';
import EncuadreEditor from './EncuadreEditor';

type Props = {
  producto?: Producto | null;
  onGuardado: () => void;
  onCancelar: () => void;
};

type EstadoSubida = {
  id: string;
  nombre?: string;
  vistaPrevia?: string;
  estado: 'preparando' | 'subiendo' | 'error';
  error?: string;
};

const MIME_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/heic', 'image/heif'];
const ACCEPT = 'image/jpeg,image/png,image/webp,image/avif,image/heic,image/heif,.heic,.heif';

function esHeic(file: File): boolean {
  const mime = (file.type || '').toLowerCase();
  return mime === 'image/heic' || mime === 'image/heif' || /\.heic$|\.heif$/i.test(file.name);
}

function archivoValido(file: File): string | null {
  const mime = (file.type || '').toLowerCase();
  const heic = esHeic(file);
  if (!MIME_PERMITIDOS.includes(mime) && !heic) {
    return 'Formato no admitido (usa JPG, PNG, WebP, AVIF o HEIC)';
  }
  const limit = heic ? MAX_UPLOAD_DIRECT_BYTES : MAX_UPLOAD_BYTES;
  if (file.size > limit) {
    return `Supera ${Math.round(limit / 1048576)} MB`;
  }
  return null;
}

export default function ProductForm({ producto, onGuardado, onCancelar }: Props) {
  const esEdicion = !!producto;
  const [name, setName] = useState(producto?.name || '');
  const [description, setDescription] = useState(producto?.description || '');
  const [category, setCategory] = useState(producto?.category || '');
  const [subcategoria, setSubcategoria] = useState(producto?.subcategoria || '');
  const lineaAnterior = producto && lineaProducto(producto);
  const categoriaAnterior = producto && lineaAnterior ? grupoProducto(producto, lineaAnterior) : '';
  const grupos = Object.values(LINEAS);
  const esCategoriaActual = grupos.some((linea) => linea.grupos.some((grupo) => grupo === category));
  const [precioOferta, setPrecioOferta] = useState(producto?.precioOferta?.toString() ?? '');
  const [variantes, setVariantes] = useState(producto?.variantes ?? []);
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
  const [editandoEncuadre, setEditandoEncuadre] = useState<number | null>(null);
  const [convirtiendo, setConvirtiendo] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const vistasSubidas = useRef(new Map<string, string>());
  const subidasAbortables = useRef(new Map<string, AbortController>());

  const subiendo = subidas.some((s) => s.estado === 'preparando' || s.estado === 'subiendo');
  const totalPendientes = imagenes.length + subidas.filter((s) => s.estado !== 'error').length;
  const alLimite = totalPendientes >= MAX_PRODUCT_IMAGES;

  useEffect(() => {
    const vistas = vistasSubidas.current;
    const controladores = subidasAbortables.current;
    return () => {
      for (const url of vistas.values()) URL.revokeObjectURL(url);
      for (const controller of controladores.values()) controller.abort();
      vistas.clear();
      controladores.clear();
    };
  }, []);

  function liberarSubida(id: string) {
    const vista = vistasSubidas.current.get(id);
    if (vista) URL.revokeObjectURL(vista);
    vistasSubidas.current.delete(id);
    subidasAbortables.current.delete(id);
  }

  async function subirArchivo(file: File): Promise<void> {
    const id = crypto.randomUUID();
    const errValidacion = archivoValido(file);
    if (errValidacion) {
      setSubidas((prev) => [...prev, { id, nombre: file.name, estado: 'error', error: errValidacion }]);
      return;
    }
    const vistaPrevia = URL.createObjectURL(file);
    const controller = new AbortController();
    vistasSubidas.current.set(id, vistaPrevia);
    subidasAbortables.current.set(id, controller);
    setSubidas((prev) => [...prev, { id, nombre: file.name, vistaPrevia, estado: 'preparando' }]);
    try {
      const imagen = await prepararArchivoDiseno(file);
      if (controller.signal.aborted) return;
      setSubidas((prev) => prev.map((s) => s.id === id ? { ...s, estado: 'subiendo' } : s));
      const res = await adminFetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': imagen.type || (file.name.toLowerCase().endsWith('.heif') ? 'image/heif' : 'image/heic') },
        body: imagen,
        signal: controller.signal
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || typeof data?.url !== 'string') throw new Error(data?.error || 'No pudimos subir la imagen.');
      if (controller.signal.aborted) return;
      setImagenes((prev) => [...prev, data.url]);
      setSubidas((prev) => prev.filter((s) => s.id !== id));
      liberarSubida(id);
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      const message = err instanceof Error ? err.message : 'Error al subir la imagen';
      setSubidas((prev) => prev.map((s) => (s.id === id ? { ...s, estado: 'error', error: message } : s)));
    } finally {
      subidasAbortables.current.delete(id);
    }
  }

  function procesarArchivos(files: FileList | File[]) {
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
  }

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

  function handleGuardarEncuadre(urlNueva: string) {
    if (editandoEncuadre === null) return;
    setImagenes((prev) => prev.map((u, i) => (i === editandoEncuadre ? urlNueva : u)));
    setEditandoEncuadre(null);
  }

  function handleRestablecerEncuadre() {
    if (editandoEncuadre === null) return;
    setImagenes((prev) => prev.map((u, i) => (i === editandoEncuadre ? quitarEncuadre(u) : u)));
    setEditandoEncuadre(null);
  }

  async function handleRecortar(archivo: Blob) {
    if (editandoEncuadre === null) return;
    setConvirtiendo(true);
    try {
      const res = await adminFetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': archivo.type || 'image/webp' },
        body: archivo
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || typeof data?.url !== 'string') throw new Error(data?.error || 'Error al subir el recorte');
      setImagenes((prev) => prev.map((u, i) => (i === editandoEncuadre ? data.url : u)));
      setEditandoEncuadre(null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al procesar el recorte';
      setError(message);
      throw err;
    } finally {
      setConvirtiendo(false);
    }
  }

  function quitarSubida(id: string) {
    subidasAbortables.current.get(id)?.abort();
    liberarSubida(id);
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

  function editarVariante(id: string, cambios: Partial<Omit<Variante, 'id'>>) {
    setVariantes((prev) => prev.map((variante) => variante.id === id ? { ...variante, ...cambios } : variante));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const categoriaFinal = category;
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
        subcategoria: subcategoria.trim(),
        price: Number(price),
        stock: variantes.length ? 0 : Number(stock),
        precioOferta: precioOferta === '' ? null : Number(precioOferta),
        variantes,
        version: producto?.updated_at,
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

        <label className="mb-3 grid gap-1 text-sm font-medium">
          Categoría
          <select value={category} required onChange={(event) => { setCategory(event.target.value); setSubcategoria(''); }}
            className="min-h-11 rounded-lg border border-verde-noche/20 px-3">
            <option value="">Elige una categoría</option>
            {category && !esCategoriaActual && (
              <option value={category}>{categoriaAnterior || nombreCategoria(category)} · Categoría actual</option>
            )}
            {grupos.map((linea) => (
              <optgroup key={linea.nombre} label={linea.nombre}>
                {linea.grupos.map((grupo) => <option key={grupo} value={grupo}>{grupo}</option>)}
              </optgroup>
            ))}
          </select>
        </label>
        <label className="mb-3 grid gap-1 text-sm font-medium">
          Subcategoría <span className="font-normal text-verde-noche/65">(opcional)</span>
          <input value={subcategoria} onChange={(event) => setSubcategoria(event.target.value)} maxLength={80}
            list="subcategorias-producto" placeholder={category ? 'Elige una sugerencia o escribe otra' : 'Elige primero una categoría'}
            disabled={!category || categoriaDefinida(category)?.linea === 'remate'}
            className="min-h-11 rounded-lg border border-verde-noche/20 px-3 disabled:bg-verde-noche/5 disabled:opacity-70" />
          <datalist id="subcategorias-producto">
            {(SUBCATEGORIAS_SUGERIDAS[category] ?? []).map((opcion) => <option key={opcion} value={opcion} />)}
          </datalist>
          <span className="text-xs font-normal text-verde-noche/65">Se convertirá automáticamente en un filtro cuando tenga productos asignados.</span>
        </label>
        {categoriaDefinida(category)?.linea === 'remate' && category !== producto?.category && (
          <p className="mb-3 text-xs text-verde-noche/75">Esta categoría asigna el producto a {LINEAS.remate.nombre} al guardar.</p>
        )}

        <div className="mb-3 grid grid-cols-2 gap-3">
          <label className="grid gap-1 text-sm font-medium">
            Precio normal (CLP)
            <input type="number" min="0" step="1" required value={price} onChange={(event) => setPrice(event.target.value)}
              className="min-h-11 min-w-0 rounded-lg border border-verde-noche/20 px-3" />
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Precio oferta (CLP)
            <input type="number" min="1" max={Math.max(1, Number(price) - 1)} step="1" value={precioOferta}
              onChange={(event) => setPrecioOferta(event.target.value)} placeholder="Sin oferta"
              className="min-h-11 min-w-0 rounded-lg border border-verde-noche/20 px-3" />
          </label>
        </div>

        <fieldset className="mb-4 rounded-lg border border-verde-noche/20 p-3">
          <legend className="px-1 text-sm font-semibold">Inventario</legend>
          {!variantes.length ? (
            <label className="mb-2 grid max-w-40 gap-1 text-sm">
              Stock general
              <input type="number" min="0" max="1000000" step="1" required value={stock} onChange={(event) => setStock(event.target.value)}
                className="min-h-10 min-w-0 rounded-lg border border-verde-noche/20 px-3" />
            </label>
          ) : (
            <>
              <p className="mb-2 text-sm">Stock total: {variantes.reduce((total, v) => total + v.stock, 0)}</p>
              <p className="mb-3 text-xs text-verde-noche/75">Completa el color, la talla o ambos. Cada variante tiene su propio stock.</p>
              {variantes.map((variante, i) => (
                <div key={variante.id} className="mb-2 grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_3.5rem] items-end gap-2 rounded border border-verde-noche/10 p-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_5rem_auto]">
                  <label className="grid gap-1 text-sm">Color {i + 1}
                    <input maxLength={40} value={variante.color ?? ''} placeholder="Ej. Negro"
                      onChange={(event) => editarVariante(variante.id, { color: event.target.value })}
                      className="min-h-10 min-w-0 rounded-lg border border-verde-noche/20 px-2" />
                  </label>
                  <label className="grid gap-1 text-sm">Talla {i + 1}
                    <input maxLength={40} value={variante.talla ?? ''} placeholder="Ej. M"
                      onChange={(event) => editarVariante(variante.id, { talla: event.target.value })}
                      className="min-h-10 min-w-0 rounded-lg border border-verde-noche/20 px-2" />
                  </label>
                  <label className="grid gap-1 text-sm">Stock
                    <input type="number" required min="0" max="1000000" step="1" value={variante.stock}
                      onChange={(event) => editarVariante(variante.id, { stock: Number(event.target.value) })}
                      className="min-h-10 min-w-0 rounded-lg border border-verde-noche/20 px-2" />
                  </label>
                  <button type="button" className="col-start-3 grid size-10 place-items-center justify-self-end rounded border border-red-200 text-red-700 sm:col-start-auto"
                    aria-label={`Quitar variante ${etiquetaVariante(variante) || i + 1}`}
                    onClick={() => {
                      if (variantes.length === 1) setStock(String(variante.stock));
                      setVariantes((prev) => prev.filter((v) => v.id !== variante.id));
                    }}>
                    <AdminIcon name="papelera" />
                  </button>
                </div>
              ))}
            </>
          )}
          <button type="button" disabled={variantes.length >= 30}
            onClick={() => setVariantes((prev) => [...prev, { id: crypto.randomUUID(), stock: prev.length ? 0 : Number(stock) }])}
            className="inline-flex min-h-10 items-center gap-1 rounded-lg border border-verde-noche/20 px-3 text-sm font-semibold disabled:opacity-50">
            <AdminIcon name="mas" /> Agregar variante
          </button>
        </fieldset>

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
          className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors mb-3 ${
            dragOver ? 'border-verde bg-verde/5' : 'border-verde-noche/20 hover:border-verde-noche/40'
          } ${alLimite || subiendo ? 'opacity-50 pointer-events-none' : ''}`}
        >
          <button type="button" disabled={alLimite || subiendo} onClick={() => inputRef.current?.click()}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-verde-noche/20 bg-white px-3 text-sm font-semibold hover:bg-crema/60">
            <AdminIcon name="subir" /> {alLimite ? 'Límite de imágenes alcanzado' : 'Subir imágenes'}
          </button>
          <p className="mt-1 text-xs text-verde-noche/70">También puedes arrastrarlas aquí.</p>
          <p className="text-xs text-verde-noche/40 mt-1">JPG, PNG, WebP o AVIF (máx. 25 MB) · HEIC (máx. 4 MB) · hasta {MAX_PRODUCT_IMAGES} fotos</p>
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
          <p className="text-xs text-verde-noche/50 mb-2">Arrastra para reordenar. La primera imagen es la principal. Usa el botón de encuadre para ajustar cada foto.</p>
        )}

        <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {imagenes.map((url, i) => {
            const { url: urlLimpia, encuadre } = parsearEncuadre(url);
            return (
              <div
                key={`${url}-${i}`}
                draggable
                onDragStart={() => handleDragStart(i)}
                onDragOver={(e) => handleDragOver(e, i)}
                onDrop={() => handleDropReorder(i)}
                onDragEnd={handleDragEnd}
                className={`min-w-0 overflow-hidden rounded-lg border border-verde-noche/15 ${dragOverIndex === i && dragIndex !== null ? 'ring-2 ring-verde-oscuro' : ''}`}
              >
                <div className="relative aspect-square overflow-hidden bg-crema">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={urlLimpia} alt="" className="h-full w-full pointer-events-none" style={estilosEncuadre(encuadre)} />
                  {i === 0 && <span className="absolute left-1 top-1 rounded bg-verde-noche px-1.5 py-1 text-[10px] font-semibold text-white">Portada</span>}
                  {encuadre && <span title="Encuadre aplicado" className="absolute right-1 top-1 rounded bg-verde-noche p-1 text-white"><AdminIcon name="encuadrar" className="size-4" /></span>}
                </div>
                <div className="flex justify-between bg-white">
                  <button type="button" onClick={() => moverImagen(i, -1)} disabled={i === 0}
                    aria-label={`Mover foto ${i + 1} a la izquierda`} className="grid min-h-11 min-w-0 flex-1 place-items-center hover:bg-crema/60 disabled:opacity-30">
                    <AdminIcon name="izquierda" />
                  </button>
                  <button type="button" onClick={() => moverImagen(i, 1)} disabled={i === imagenes.length - 1}
                    aria-label={`Mover foto ${i + 1} a la derecha`} className="grid min-h-11 min-w-0 flex-1 place-items-center hover:bg-crema/60 disabled:opacity-30">
                    <AdminIcon name="derecha" />
                  </button>
                  <button type="button" onClick={() => setEditandoEncuadre(i)}
                    aria-label={`Encuadrar foto ${i + 1}`} title="Encuadrar" className="grid min-h-11 min-w-0 flex-1 place-items-center hover:bg-crema/60">
                    <AdminIcon name="encuadrar" />
                  </button>
                  <button type="button" onClick={() => handleQuitarImagen(i)}
                    aria-label={`Quitar foto ${i + 1}`} title="Quitar foto" className="grid min-h-11 min-w-0 flex-1 place-items-center text-red-800 hover:bg-red-100">
                    <AdminIcon name="papelera" />
                  </button>
                </div>
              </div>
            );
        })}

          {subidas.filter((s) => s.estado === 'preparando' || s.estado === 'subiendo').map((s) => (
            <div key={s.id} className="relative aspect-square w-full overflow-hidden rounded-lg border border-verde-noche/15 bg-crema">
              {s.vistaPrevia && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={s.vistaPrevia} alt="" className="h-full w-full object-cover opacity-45" />
              )}
              <div className="absolute inset-x-0 bottom-0 h-1 overflow-hidden bg-white/70">
                <div className="h-full w-full animate-pulse bg-verde" />
              </div>
              <div className="absolute inset-0 grid place-content-center gap-1 bg-white/30 p-2 text-center backdrop-blur-[1px]">
                <span className="mx-auto" role="status"><AdminIcon name="subir" /></span>
                <span className="text-xs font-semibold">{s.estado === 'preparando' ? 'Preparando…' : 'Subiendo…'}</span>
                <span className="max-w-full truncate text-[10px] text-verde-noche/65">{s.nombre}</span>
              </div>
              <button type="button" onClick={() => quitarSubida(s.id)}
                className="absolute right-1 top-1 grid size-9 place-items-center rounded-lg bg-white/90 text-verde-noche hover:bg-white"
                aria-label={`Cancelar subida de ${s.nombre ?? 'imagen'}`}>
                <AdminIcon name="cerrar" />
              </button>
            </div>
          ))}

          {subidas.filter((s) => s.estado === 'error').map((s) => (
            <div key={s.id} className="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-lg border border-red-200 bg-red-50 p-2 text-center">
              {s.vistaPrevia && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={s.vistaPrevia} alt="" className="absolute inset-0 h-full w-full object-cover opacity-15" />
              )}
              <span className="relative text-[10px] leading-tight text-red-700">{s.error}</span>
              <button
                type="button"
                onClick={() => quitarSubida(s.id)}
                className="absolute right-1 top-1 grid size-9 place-items-center rounded-lg bg-white text-red-800 hover:bg-red-100"
                aria-label="Quitar error"
              ><AdminIcon name="cerrar" /></button>
            </div>
          ))}
        </div>

        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

        <div className="flex gap-3 mt-2">
          <button
            type="button"
            onClick={onCancelar}
            className="inline-flex flex-1 items-center justify-center gap-2 py-2.5 rounded-md border border-verde-noche/20 text-sm font-semibold text-verde-noche"
          >
            <AdminIcon name="cerrar" /> Cancelar
          </button>
          <button
            type="submit"
            disabled={guardando || subiendo}
            className="inline-flex flex-1 items-center justify-center gap-2 py-2.5 rounded-md bg-verde text-white text-sm font-semibold hover:bg-verde-oscuro disabled:opacity-60"
          >
            <AdminIcon name="guardar" /> {guardando ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </form>

      {editandoEncuadre !== null && imagenes[editandoEncuadre] && (
        <EncuadreEditor
          url={imagenes[editandoEncuadre]}
          index={editandoEncuadre}
          onCancelar={() => setEditandoEncuadre(null)}
          onGuardarEncuadre={handleGuardarEncuadre}
          onRecortar={handleRecortar}
          onRestablecer={handleRestablecerEncuadre}
        />
      )}

      {convirtiendo && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50">
          <div className="bg-white px-6 py-4 rounded-lg shadow-xl text-sm text-verde-noche">
            Procesando recorte…
          </div>
        </div>
      )}
    </div>
  );
}
