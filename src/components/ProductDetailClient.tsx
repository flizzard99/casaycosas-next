'use client';

import { useCart } from '@/context/CartContext';
import ProductCarousel from './ProductCarousel';
import type { Producto } from '@/lib/types';
import { tienda } from '@/lib/config';

const formatoCLP = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });

export default function ProductDetailClient({ producto }: { producto: Producto }) {
  const { addItem } = useCart();
  const sinStock = producto.stock <= 0;
  const imagenes = producto.images?.length ? producto.images : producto.image_url ? [producto.image_url] : [];

  return (
    <div className="max-w-4xl mx-auto px-6 md:px-0 py-8">
      <a href="/" className="text-sm text-verde hover:text-verde-oscuro mb-6 inline-block">
        ← Volver al catálogo
      </a>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="relative h-80 md:h-[28rem] rounded-lg overflow-hidden shadow-sm">
          <ProductCarousel images={imagenes} alt={producto.name} />
        </div>

        <div className="flex flex-col">
          <div className="text-xs uppercase tracking-wide text-sage font-semibold">{producto.category}</div>
          <h1 className="font-display text-3xl text-verde-oscuro mt-2">{producto.name}</h1>
          <p className="text-2xl font-semibold text-verde mt-3">{formatoCLP.format(producto.price)}</p>

          {producto.stock > 0 ? (
            <p className="text-xs text-verde-oscuro mt-1">Stock disponible: {producto.stock}</p>
          ) : (
            <span className="inline-block mt-1 text-xs font-semibold uppercase tracking-wide bg-verde-noche/10 text-verde-noche px-2 py-1 rounded">
              Agotado
            </span>
          )}

          {producto.description && (
            <p className="text-sm text-verde-noche/80 leading-relaxed mt-5">{producto.description}</p>
          )}

          <button
            disabled={sinStock}
            onClick={() =>
              addItem({
                id: producto.id,
                name: producto.name,
                price: producto.price,
                image_url: imagenes[0] || ''
              })
            }
            className="mt-6 w-full md:w-auto px-8 py-3 rounded-md bg-verde text-white text-sm font-semibold uppercase tracking-wide hover:bg-verde-oscuro transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {sinStock ? 'Sin stock' : 'Agregar al carrito'}
          </button>

          {producto.instagram_url && (
            <a
              href={producto.instagram_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 text-sm text-verde hover:text-verde-oscuro hover:underline"
            >
              Ver en Instagram
            </a>
          )}

          <div className="mt-8 pt-6 border-t border-verde-noche/10">
            <p className="text-sm text-verde-noche/70">
              ¿Dudas? Escríbenos por{' '}
              <a href={tienda.whatsappUrl} target="_blank" rel="noopener noreferrer" className="text-verde hover:underline">
                WhatsApp
              </a>
              .
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}