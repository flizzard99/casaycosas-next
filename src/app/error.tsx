'use client';

import Link from 'next/link';
import { useEffect } from 'react';

export default function Error({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Error de render:', error);
  }, [error]);

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-6 text-center">
      <h1 className="font-display text-6xl text-verde-oscuro mb-4">¡Ups!</h1>
      <p className="text-verde-noche text-lg mb-2">Algo se rompió.</p>
      <p className="text-verde-noche/60 text-sm mb-8">
        Ocurrió un error inesperado. Puedes volver a las colecciones o intentar de nuevo.
      </p>
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={reset}
          className="px-6 py-3 rounded-md bg-verde text-white text-sm font-semibold uppercase tracking-wide hover:bg-verde-oscuro transition-colors"
        >
          Reintentar
        </button>
        <Link
          href="/"
          className="px-6 py-3 rounded-md border border-verde-oscuro text-verde-oscuro text-sm font-semibold uppercase tracking-wide hover:bg-verde-oscuro hover:text-white transition-colors"
        >
          Ver colecciones
        </Link>
      </div>
    </div>
  );
}