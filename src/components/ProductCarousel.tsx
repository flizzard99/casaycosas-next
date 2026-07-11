'use client';

import Image from 'next/image';
import { useState } from 'react';

export default function ProductCarousel({ images, alt }: { images: string[]; alt: string }) {
  const [indice, setIndice] = useState(0);
  const total = images.length;

  if (total === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center text-verde-oscuro/40 text-sm bg-crema">
        Sin imagen
      </div>
    );
  }

  function anterior() {
    setIndice((i) => (i - 1 + total) % total);
  }

  function siguiente() {
    setIndice((i) => (i + 1) % total);
  }

  return (
    <div className="relative w-full h-full bg-crema">
      <Image
        src={images[indice]}
        alt={`${alt} — foto ${indice + 1}`}
        fill
        className="object-cover"
        sizes="(max-width: 768px) 100vw, 50vw"
        priority
      />

      {total > 1 && (
        <>
          <button
            onClick={anterior}
            aria-label="Foto anterior"
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-verde-noche w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold"
          >
            ‹
          </button>
          <button
            onClick={siguiente}
            aria-label="Foto siguiente"
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-verde-noche w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold"
          >
            ›
          </button>
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={() => setIndice(i)}
                aria-label={`Ir a la foto ${i + 1}`}
                className={`w-2 h-2 rounded-full transition-colors ${
                  i === indice ? 'bg-verde-oscuro' : 'bg-white/60'
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}