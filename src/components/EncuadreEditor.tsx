'use client';

import AdminIcon from './AdminIcon';
import { useState, useCallback, useRef, useEffect } from 'react';
import Cropper, { type Area, type Point } from 'react-easy-crop';
import {
  type Encuadre,
  parsearEncuadre,
  aplicarEncuadre,
  quitarEncuadre,
  ZOOM_MIN,
  ZOOM_MAX,
} from '@/lib/encuadre';
import 'react-easy-crop/react-easy-crop.css';

type Props = {
  url: string;
  index: number;
  onCancelar: () => void;
  onGuardarEncuadre: (urlNueva: string) => void;
  onRecortar: (dataUrl: string) => void;
  onRestablecer: () => void;
};

type Modo = 'encuadrar' | 'recortar';
const TAM_SALIDA = 1200;

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}

function urlToImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('No se pudo cargar la imagen'));
    img.src = url;
  });
}

function canvasToDataUrl(canvas: HTMLCanvasElement, mime: string): string {
  return canvas.toDataURL(mime, 0.92);
}

export default function EncuadreEditor({ url, onCancelar, onGuardarEncuadre, onRecortar, onRestablecer }: Props) {
  const parseado = parsearEncuadre(url);
  const urlLimpia = parseado.url;
  const inicial = parseado.encuadre;

  const [modo, setModo] = useState<Modo>('encuadrar');
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState<number>(inicial?.zoom ?? ZOOM_MIN);
  const [recortando, setRecortando] = useState(false);
  const [error, setError] = useState('');
  const [areaPixels, setAreaPixels] = useState<Area | null>(null);
  const [areaPercentages, setAreaPercentages] = useState<Area | null>(null);
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    dialogRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancelar();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onCancelar]);

  const onCropComplete = useCallback((area: Area, areaPx: Area) => {
    setAreaPercentages(area);
    setAreaPixels(areaPx);
  }, []);

  const onMediaLoaded = useCallback((mediaSize: { naturalWidth: number; naturalHeight: number }) => {
    setNaturalSize({ w: mediaSize.naturalWidth, h: mediaSize.naturalHeight });
  }, []);

  function estimarEncuadre(): Encuadre | null {
    if (!areaPercentages || !naturalSize) return null;
    const visibleW = areaPercentages.width / 100;
    const visibleH = areaPercentages.height / 100;
    const zoomX = 1 / Math.max(visibleW, 0.01);
    const zoomY = 1 / Math.max(visibleH, 0.01);
    const z = Math.min(Math.max(zoomX, zoomY), ZOOM_MAX);
    const cx = (areaPercentages.x + areaPercentages.width / 2) / 100;
    const cy = (areaPercentages.y + areaPercentages.height / 2) / 100;
    return { focalX: clamp01(cx), focalY: clamp01(cy), zoom: z };
  }

  async function handleGuardarEncuadre() {
    const e = estimarEncuadre();
    if (!e) {
      setError('Mueve o haz zoom para definir el encuadre.');
      return;
    }
    const nuevaUrl = aplicarEncuadre(urlLimpia, e);
    onGuardarEncuadre(nuevaUrl);
  }

  function handleRestablecer() {
    onRestablecer();
  }

  async function handleRecortar() {
    if (!areaPixels || !naturalSize) {
      setError('No se pudo calcular el recorte.');
      return;
    }
    setRecortando(true);
    setError('');
    try {
      const img = await urlToImage(urlLimpia);
      const canvas = document.createElement('canvas');
      canvas.width = TAM_SALIDA;
      canvas.height = TAM_SALIDA;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas no disponible');
      ctx.fillStyle = '#DAD7CD';
      ctx.fillRect(0, 0, TAM_SALIDA, TAM_SALIDA);
      ctx.drawImage(
        img,
        areaPixels.x,
        areaPixels.y,
        areaPixels.width,
        areaPixels.height,
        0,
        0,
        TAM_SALIDA,
        TAM_SALIDA
      );
      const eraPng = urlLimpia.toLowerCase().match(/\.png(\?|$)/) || img.src.startsWith('data:image/png');
      const mime = eraPng ? 'image/png' : 'image/jpeg';
      const dataUrl = canvasToDataUrl(canvas, mime);
      onRecortar(dataUrl);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al recortar';
      setError(message);
    } finally {
      setRecortando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 px-4 py-6" onClick={onCancelar}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Editor de encuadre"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto focus:outline-none"
      >
        <h2 className="font-display text-xl text-verde-noche mb-3">Encuadrar imagen</h2>

        <div className="flex gap-2 mb-4 bg-crema rounded p-1">
          <button
            type="button"
            onClick={() => setModo('encuadrar')}
            className={`inline-flex flex-1 items-center justify-center gap-2 text-sm font-semibold py-2 rounded transition-colors ${
              modo === 'encuadrar' ? 'bg-verde text-white' : 'text-verde-noche hover:bg-white'
            }`}
          >
            <AdminIcon name="encuadrar" /> Encuadrar
          </button>
          <button
            type="button"
            onClick={() => setModo('recortar')}
            className={`inline-flex flex-1 items-center justify-center gap-2 text-sm font-semibold py-2 rounded transition-colors ${
              modo === 'recortar' ? 'bg-verde text-white' : 'text-verde-noche hover:bg-white'
            }`}
          >
            <AdminIcon name="recortar" /> Recortar
          </button>
        </div>

        <div className="relative w-full aspect-square bg-crema rounded overflow-hidden mb-4">
          <Cropper
            image={urlLimpia}
            crop={crop}
            zoom={zoom}
            aspect={1}
            minZoom={ZOOM_MIN}
            maxZoom={ZOOM_MAX}
            objectFit="contain"
            showGrid
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
            onMediaLoaded={onMediaLoaded}
            restrictPosition
          />
        </div>

        <div className="flex items-center gap-3 mb-4">
          <label htmlFor="zoom-slider" className="inline-flex items-center gap-1 whitespace-nowrap text-sm text-verde-noche"><AdminIcon name="zoom" /> Zoom</label>
          <input
            id="zoom-slider"
            type="range"
            min={ZOOM_MIN}
            max={ZOOM_MAX}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(parseFloat(e.target.value))}
            className="flex-1 accent-verde"
          />
          <span className="text-sm text-verde-noche/70 w-10 text-right">{zoom.toFixed(1)}×</span>
        </div>

        <p className="text-xs text-verde-noche/60 mb-4 leading-relaxed">
          {modo === 'encuadrar'
            ? 'Mueve la imagen y ajusta el zoom. Al guardar, se conserva el original y se aplica el encuadre solo en la tarjeta del catálogo.'
            : 'Define el recorte. Se generará una nueva imagen 1200×1200 px que reemplazará la original.'}
        </p>

        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

        <div className="flex flex-wrap gap-2">
          {modo === 'encuadrar' ? (
            <>
              <button
                type="button"
                onClick={handleGuardarEncuadre}
                className="inline-flex min-w-[140px] flex-1 items-center justify-center gap-2 py-2.5 rounded-md bg-verde text-white text-sm font-semibold hover:bg-verde-oscuro"
              >
                <AdminIcon name="guardar" /> Guardar encuadre
              </button>
              <button
                type="button"
                onClick={handleRestablecer}
                className="inline-flex min-w-[140px] flex-1 items-center justify-center gap-2 py-2.5 rounded-md border border-verde-noche/20 text-sm font-semibold text-verde-noche hover:bg-crema"
              >
                <AdminIcon name="recargar" /> Restablecer
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={handleRecortar}
              disabled={recortando}
              className="inline-flex min-w-[140px] flex-1 items-center justify-center gap-2 py-2.5 rounded-md bg-verde text-white text-sm font-semibold hover:bg-verde-oscuro disabled:opacity-60"
            >
              <AdminIcon name="recortar" /> {recortando ? 'Recortando…' : 'Recortar y reemplazar'}
            </button>
          )}
          <button
            type="button"
            onClick={onCancelar}
            className="inline-flex min-w-[140px] flex-1 items-center justify-center gap-2 py-2.5 rounded-md border border-verde-noche/20 text-sm font-semibold text-verde-noche hover:bg-crema"
          >
            <AdminIcon name="cerrar" /> Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}