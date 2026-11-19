'use client';

import Image from 'next/image';
import { estilosEncuadre, parsearEncuadre } from '@/lib/encuadre';
import { useState, useRef, useCallback } from 'react';

export default function ProductCarousel({ images, alt }: { images: string[]; alt: string }) {
  const [indice, setIndice] = useState(0);
  const total = images.length;
  const touchStartX = useRef(0);

  const anterior = useCallback(() => {
    setIndice((i) => (i - 1 + total) % total);
  }, [total]);

  const siguiente = useCallback(() => {
    setIndice((i) => (i + 1) % total);
  }, [total]);

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }

  function handleTouchEnd(e: React.TouchEvent) {
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(delta) > 50) {
      delta > 0 ? anterior() : siguiente();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowLeft') anterior();
    if (e.key === 'ArrowRight') siguiente();
  }

  if (total === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center text-verde-oscuro/40 text-sm bg-crema">
        Sin imagen
      </div>
    );
  }

  const { url, encuadre } = parsearEncuadre(images[indice]);

  return (
    <div
      className="product-watermark relative h-full w-full overflow-hidden bg-crema/40"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="region"
      aria-label={`Galería de fotos de ${alt}`}
      aria-roledescription="carrusel"
    >
      <Image
        src={url}
        alt={`${alt} — foto ${indice + 1}`}
        fill
        style={estilosEncuadre(encuadre)}
        sizes="(min-width: 1024px) 500px, (min-width: 768px) 50vw, 100vw"
        loading="eager"
        fetchPriority={indice === 0 ? 'high' : undefined}
      />

      {total > 1 && (
        <>
          <button
            onClick={anterior}
            aria-label="Foto anterior"
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-verde-noche w-11 h-11 rounded-full flex items-center justify-center text-sm font-semibold"
          >
            ‹
          </button>
          <button
            onClick={siguiente}
            aria-label="Foto siguiente"
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-verde-noche w-11 h-11 rounded-full flex items-center justify-center text-sm font-semibold"
          >
            ›
          </button>
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-verde-noche/90 px-3 py-1 text-xs text-white" aria-live="polite">
            {indice + 1} / {total}
          </div>
        </>
      )}
    </div>
  );
}
