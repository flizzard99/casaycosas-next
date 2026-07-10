'use client';

import Image from 'next/image';
import { useCart } from '@/context/CartContext';
import type { Producto } from '@/lib/types';

const formatoCLP = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });

export default function ProductCard({ producto }: { producto: Producto }) {
  const { addItem } = useCart();
  const imagen = producto.images?.[0] || producto.image_url;
  const sinStock = producto.stock <= 0;

  return (
    <div className="bg-white rounded-md overflow-hidden shadow-[0_2px_0_rgba(52,78,65,0.08)] flex flex-col">
      <div className="relative h-40 bg-crema">
        {imagen ? (
          <Image src={imagen} alt={producto.name} fill className="object-cover" sizes="(max-width: 768px) 50vw, 25vw" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-verde-oscuro/40 text-sm">Sin imagen</div>
        )}
        {sinStock && (
          <div className="absolute inset-0 bg-verde-noche/60 flex items-center justify-center">
            <span className="text-white text-xs font-semibold uppercase tracking-wide">Agotado</span>
          </div>
        )}
      </div>
      <div className="p-4 flex flex-col flex-1">
        <div className="text-[11px] uppercase tracking-wide text-sage font-semibold">{producto.category}</div>
        <h3 className="text-sm font-semibold mt-1 text-verde-noche">{producto.name}</h3>
        <p className="text-sm text-verde font-semibold mt-1.5">{formatoCLP.format(producto.price)}</p>
        <button
          disabled={sinStock}
          onClick={() =>
            addItem({ id: producto.id, name: producto.name, price: producto.price, image_url: imagen })
          }
          className="mt-3 text-xs font-semibold uppercase tracking-wide py-2 rounded bg-verde text-white hover:bg-verde-oscuro transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {sinStock ? 'Sin stock' : 'Agregar al carrito'}
        </button>
      </div>
    </div>
  );
}
