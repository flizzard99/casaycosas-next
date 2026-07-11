import ProductCard from './ProductCard';
import type { Producto } from '@/lib/types';

export default function FeaturedGrid({ productos, titulo }: { productos: Producto[]; titulo: string }) {
  if (!productos.length) return null;

  return (
    <section
      className="px-6 md:px-14 py-14 md:py-20"
      style={{ backgroundImage: 'url(/patron.png)', backgroundSize: '400px', backgroundRepeat: 'repeat' }}
    >
      <h2 className="font-display text-2xl md:text-3xl text-verde-oscuro mb-8 text-center">{titulo}</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-5 max-w-5xl mx-auto">
        {productos.map((p) => (
          <ProductCard key={p.id} producto={p} />
        ))}
      </div>
      <div className="text-center mt-10">
        <a
          href="/catalogo"
          className="inline-block px-6 py-3 rounded-md bg-verde-noche text-white text-sm font-semibold uppercase tracking-wide hover:bg-verde-oscuro transition-colors"
        >
          Ver catálogo completo
        </a>
      </div>
    </section>
  );
}