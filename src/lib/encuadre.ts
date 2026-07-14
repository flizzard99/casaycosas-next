import type { CSSProperties } from 'react';

export type Encuadre = {
  focalX: number;
  focalY: number;
  zoom: number;
};

export const ZOOM_MIN = 1;
export const ZOOM_MAX = 2.5;
export const PARAM_NAME = 'cyc-crop';

const RE_ENCUADRE = /^(\d+(?:\.\d+)?),(\d+(?:\.\d+)?),(\d+(?:\.\d+)?)$/;

export function clampZoom(z: number): number {
  if (!Number.isFinite(z)) return 1;
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z));
}

export function clampFocal(v: number): number {
  if (!Number.isFinite(v)) return 0.5;
  return Math.min(1, Math.max(0, v));
}

export function esUrlManipulable(url: string): boolean {
  return !!url && /^https?:\/\//i.test(url);
}

export function parsearEncuadre(url: string): { url: string; encuadre: Encuadre | null } {
  if (!esUrlManipulable(url)) return { url, encuadre: null };
  try {
    const u = new URL(url);
    const raw = u.searchParams.get(PARAM_NAME);
    if (!raw) return { url, encuadre: null };
    const m = raw.match(RE_ENCUADRE);
    if (!m) return { url, encuadre: null };
    const focalX = clampFocal(parseFloat(m[1]));
    const focalY = clampFocal(parseFloat(m[2]));
    const zoom = clampZoom(parseFloat(m[3]));
    const limpia = new URL(url);
    limpia.searchParams.delete(PARAM_NAME);
    return { url: limpia.toString(), encuadre: { focalX, focalY, zoom } };
  } catch {
    return { url, encuadre: null };
  }
}

export function aplicarEncuadre(url: string, e: Encuadre): string {
  if (!esUrlManipulable(url)) return url;
  const valor = `${clampFocal(e.focalX).toFixed(3)},${clampFocal(e.focalY).toFixed(3)},${clampZoom(e.zoom).toFixed(3)}`;
  try {
    const u = new URL(url);
    u.searchParams.set(PARAM_NAME, valor);
    return u.toString();
  } catch {
    return url;
  }
}

export function quitarEncuadre(url: string): string {
  if (!esUrlManipulable(url)) return url;
  try {
    const u = new URL(url);
    u.searchParams.delete(PARAM_NAME);
    return u.toString();
  } catch {
    return url;
  }
}

export function estilosEncuadre(e: Encuadre | null): CSSProperties {
  if (!e) return { objectFit: 'contain' };
  const px = `${(e.focalX * 100).toFixed(1)}%`;
  const py = `${(e.focalY * 100).toFixed(1)}%`;
  return {
    objectFit: 'cover',
    objectPosition: `${px} ${py}`,
    transform: `scale(${e.zoom})`,
    transformOrigin: `${px} ${py}`,
  };
}