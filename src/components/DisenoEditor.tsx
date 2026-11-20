'use client';

import { useState } from 'react';
import { LINEAS, type Linea } from '@/lib/lineas';
import { adminFetch } from '@/lib/adminFetch';
import { prepararArchivoDiseno } from '@/lib/imagenDiseno';
import { MAX_UPLOAD_BYTES } from '@/lib/uploadLimits';
import type { Config, DisenoSeccion } from '@/lib/types';
import AdminIcon from './AdminIcon';

const campos = [
  { clave: 'imagen', etiqueta: 'Imagen de la sección', ayuda: 'Aparece en la tarjeta de inicio y en el encabezado.' },
  { clave: 'fondo', etiqueta: 'Fondo de campaña', ayuda: 'Aparece detrás del encabezado. Usa una foto horizontal.' }
] as const;

const tipos = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];

export default function DisenoEditor({ inicial, onGuardado }: {
  inicial: Config['diseno'];
  onGuardado: (linea: Linea, diseno: DisenoSeccion) => void;
}) {
  const [linea, setLinea] = useState<Linea>('matera');
  const [borradores, setBorradores] = useState(inicial);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const actual = borradores[linea] ?? {};

  function editar(campo: keyof DisenoSeccion, valor: string) {
    setAviso('');
    setBorradores((prev) => ({ ...prev, [linea]: { ...prev[linea], [campo]: valor } }));
  }

  async function subir(campo: 'imagen' | 'fondo', archivo: File) {
    setError('');
    setAviso('');
    if (!tipos.includes(archivo.type) || archivo.size <= 0 || archivo.size > MAX_UPLOAD_BYTES) {
      setError('Usa una imagen JPG, PNG, WebP o AVIF de hasta 25 MB.');
      return;
    }
    setOcupado(true);
    try {
      const imagen = await prepararArchivoDiseno(archivo);
      let subida: Response;
      try {
        subida = await adminFetch('/api/config/diseno/imagen', {
          method: 'POST',
          headers: { 'Content-Type': imagen.type },
          body: imagen
        });
      } catch {
        throw new Error('Se interrumpió la conexión al subir la imagen. Vuelve a intentarlo.');
      }
      const data = await subida.json().catch(() => null);
      if (!subida.ok || typeof data?.url !== 'string') {
        throw new Error(data?.error || 'No se pudo subir la imagen. Prueba con un archivo más liviano.');
      }
      editar(campo, data.url);
      setAviso('Imagen subida. Guarda el diseño para publicarla.');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'No se pudo subir la imagen.');
    } finally {
      setOcupado(false);
    }
  }

  async function guardar(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setAviso('');
    setOcupado(true);
    try {
      const respuesta = await adminFetch('/api/config/diseno', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ linea, diseno: actual })
      });
      const data = await respuesta.json();
      if (!respuesta.ok) throw new Error(data.error || 'No se pudo guardar el diseño.');
      setBorradores((prev) => ({ ...prev, [linea]: data }));
      onGuardado(linea, data);
      setAviso('Diseño publicado.');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'No se pudo guardar el diseño.');
    } finally {
      setOcupado(false);
    }
  }

  return (
    <form onSubmit={guardar} className="max-w-3xl space-y-4 rounded-xl border border-verde-noche/10 bg-white p-4 sm:p-6">
      <label className="grid max-w-sm gap-2 text-sm font-semibold">
        Sección
        <select disabled={ocupado} value={linea} onChange={(event) => {
          setLinea(event.target.value as Linea); setError(''); setAviso('');
        }} className="min-h-11 rounded-lg border border-verde-noche/20 px-3">
          {Object.entries(LINEAS).map(([id, seccion]) => <option key={id} value={id}>{seccion.nombre}</option>)}
        </select>
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        {campos.map(({ clave, etiqueta, ayuda }) => (
          <div key={`${linea}-${clave}`} className="rounded-lg border border-verde-noche/15 p-3">
            <h3 className="font-semibold">{etiqueta}</h3>
            <p className="mb-2 text-sm text-verde-noche/70">{ayuda}</p>
            {actual[clave] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={actual[clave]} alt={`Vista previa de ${etiqueta.toLowerCase()}`}
                className="mb-2 h-28 w-full rounded-lg bg-crema object-cover" />
            ) : <p className="mb-2 text-xs text-verde-noche/70">Usando el diseño original.</p>}
            <input type="file" aria-label={etiqueta} accept={tipos.join(',')} disabled={ocupado}
              className="max-w-full text-sm"
              onChange={(event) => {
                const archivo = event.target.files?.[0];
                if (archivo) void subir(clave, archivo);
                event.target.value = '';
              }} />
            {actual[clave] && (
              <button type="button" disabled={ocupado} onClick={() => editar(clave, '')}
                className="mt-2 block min-h-9 text-sm font-semibold underline">Restaurar diseño original</button>
            )}
          </div>
        ))}
      </div>
      <label className="grid gap-1 text-sm font-medium">Título de campaña
        <input value={actual.titulo ?? ''} onChange={(event) => editar('titulo', event.target.value)}
          maxLength={90} disabled={ocupado} placeholder={LINEAS[linea].titulo}
          className="min-h-11 rounded-lg border border-verde-noche/20 px-3" />
      </label>
      <label className="grid gap-1 text-sm font-medium">Texto de campaña
        <textarea value={actual.descripcion ?? ''} onChange={(event) => editar('descripcion', event.target.value)}
          maxLength={240} disabled={ocupado} placeholder={LINEAS[linea].descripcion}
          className="min-h-20 rounded-lg border border-verde-noche/20 p-3" />
      </label>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      {aviso && <p role="status" className="text-sm text-verde-oscuro">{aviso}</p>}
      <button disabled={ocupado} type="submit"
        className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-verde-oscuro px-4 text-sm font-semibold text-white disabled:opacity-50">
        <AdminIcon name="guardar" /> Guardar diseño
      </button>
    </form>
  );
}
