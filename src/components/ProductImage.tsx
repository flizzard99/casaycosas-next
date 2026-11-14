'use client';

import Image, { type ImageProps } from 'next/image';
import { useState } from 'react';
import { parsearEncuadre, estilosEncuadre } from '@/lib/encuadre';

const HOSTS = new Set(['images.casaycosas.qzz.io', 'cdn11.bigcommerce.com', 'acdn-us.mitiendanube.com', 'cdn.sd.com.py', 'fimgs.net', 'mates.cl', 'tangofoodsusa.com', 'www.google.com', 'www.mundobiblia.com', 'www.schwarzenbach.ch']);

function imagenPermitida(src: string): boolean {
  if (src.startsWith('/') && !src.startsWith('//')) return true;
  try {
    const url = new URL(src);
    return url.protocol === 'https:' && !url.port && !url.username && !url.password && (HOSTS.has(url.hostname) || url.hostname.endsWith('.supabase.co'));
  } catch { return false; }
}

export default function ProductImage({ src, alt, style, ...props }: Omit<ImageProps, 'src'> & { src: string }) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const { url, encuadre } = parsearEncuadre(src);
  if (!imagenPermitida(url) || failedSrc === url) {
    return <div role="img" aria-label={`${alt}: imagen no disponible`} className="absolute inset-0 flex items-center justify-center bg-crema p-3 text-center text-xs text-verde-oscuro">Imagen no disponible</div>;
  }
  return <Image {...props} src={url} alt={alt} style={{ ...style, ...(encuadre ? estilosEncuadre(encuadre) : {}) }} onError={() => setFailedSrc(url)} />;
}
