import Link from 'next/link';
import ProductCard from './ProductCard';
import type { Producto } from '@/lib/types';

export default function FeaturedGrid({ productos, titulo }: { productos: Producto[]; titulo: string }) {
  if (!productos.length) return null;

  return (
    <section className="py-10 sm:py-16">
      <div className="store-shell">
        <h2 className="font-display text-2xl md:text-3xl text-verde-oscuro mb-6">{titulo}</h2>
        <div className="store-grid">
          {productos.map((p) => (
            <ProductCard key={p.id} producto={p} />
          ))}
        </div>
        <div className="mt-6">
          <Link
            href="/catalogo"
            className="inline-flex min-h-11 items-center rounded-lg border border-verde-noche/30 px-4 text-sm font-semibold hover:bg-crema"
          >
            Ver catálogo completo
          </Link>
        </div>
      </div>
    </section>
  );
}
