import ProductCard from './ProductCard';
import type { Producto } from '@/lib/types';

export default function FeaturedGrid({ productos, titulo }: { productos: Producto[]; titulo: string }) {
  if (!productos.length) return null;

  return (
    <section className="py-10 sm:py-16">
      <div className="store-shell">
        <h2 className="shop-display text-2xl md:text-3xl mb-6">{titulo}</h2>
        <div className="store-grid">
          {productos.map((p) => (
            <ProductCard key={p.id} producto={p} />
          ))}
        </div>
      </div>
    </section>
  );
}
