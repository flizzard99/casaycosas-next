import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-6 text-center">
      <h1 className="font-display text-6xl text-verde-oscuro mb-4">404</h1>
      <p className="text-verde-noche text-lg mb-2">Esta página no existe.</p>
      <p className="text-verde-noche/60 text-sm mb-8">
        Puede que el producto haya sido retirado o el enlace ya no sea válido.
      </p>
      <Link
        href="/"
        className="px-6 py-3 rounded-md bg-verde text-white text-sm font-semibold uppercase tracking-wide hover:bg-verde-oscuro transition-colors"
      >
        ← Volver al catálogo
      </Link>
    </div>
  );
}