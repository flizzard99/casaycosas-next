'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { useCart } from '@/context/CartContext';
import type { Producto } from '@/lib/types';

const formatoCLP = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });

export default function ProductCard({ producto }: { producto: Producto }) {
  const { addItem } = useCart();
  const imagen = producto.images?.[0] || producto.image_url;
  const sinStock = producto.stock <= 0;
  const tieneVarias = (producto.images?.length || 0) > 1;

  const [fit, setFit] = useState<'cover' | 'contain'>('cover');
  const [qty, setQty] = useState(1);

  const maxQty = producto.stock || 1;

  return (
    <div className="bg-white rounded-md overflow-hidden border border-verde-noche/10 shadow-md hover:shadow-lg transition-all hover:-translate-y-0.5 flex flex-col">
      <Link href={`/producto/${producto.id}`} className="block">
        <div className="relative h-40 bg-crema" style={fit === 'contain' ? { padding: '0.5rem' } : undefined}>
          {imagen ? (
            <Image
              src={imagen}
              alt={producto.name}
              fill
              className="transition-opacity duration-300 hover:opacity-90"
              style={{ objectFit: fit }}
              sizes="(max-width: 768px) 50vw, 25vw"
              onLoad={(e) => {
                const img = e.currentTarget as HTMLImageElement;
                const ratio = img.naturalHeight / img.naturalWidth;
                if (ratio > 1.3) setFit('contain');
                else setFit('cover');
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-verde-oscuro/40 text-sm">
              Sin imagen
            </div>
          )}
          {sinStock && (
            <div className="absolute inset-0 bg-verde-noche/60 flex items-center justify-center">
              <span className="text-white text-xs font-semibold uppercase tracking-wide">Agotado</span>
            </div>
          )}
          {tieneVarias && !sinStock && (
            <span className="absolute top-2 right-2 bg-white/90 text-verde-noche text-[10px] font-semibold px-1.5 py-0.5 rounded">
              {producto.images.length} fotos
            </span>
          )}
        </div>
      </Link>
      <div className="p-4 flex flex-col flex-1">
        <Link href={`/producto/${producto.id}`}>
          <div className="text-[11px] uppercase tracking-wide text-sage font-semibold">{producto.category}</div>
          <h3 className="text-sm font-semibold mt-1 text-verde-noche hover:text-verde transition-colors">{producto.name}</h3>
        </Link>
        <p className="text-sm text-verde font-semibold mt-1.5">{formatoCLP.format(producto.price)}</p>
        <div className="mt-auto">
          {!sinStock && (
            <div className="flex items-center justify-center gap-2 mt-3">
              <button
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="w-7 h-7 rounded border border-verde-noche/20 text-sm font-medium hover:bg-crema transition-colors"
              >
                −
              </button>
              <span className="text-sm w-5 text-center font-medium">{qty}</span>
              <button
                onClick={() => setQty((q) => Math.min(maxQty, q + 1))}
                disabled={qty >= maxQty}
                className="w-7 h-7 rounded border border-verde-noche/20 text-sm font-medium hover:bg-crema transition-colors disabled:opacity-30"
              >
                +
              </button>
            </div>
          )}
          <button
            disabled={sinStock}
            onClick={() => {
              addItem({ id: producto.id, name: producto.name, price: producto.price, image_url: imagen, stock: producto.stock }, qty);
              setQty(1);
            }}
            className="mt-2 text-xs font-semibold uppercase tracking-wide py-2 rounded bg-verde text-white hover:bg-verde-oscuro transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {sinStock ? 'Sin stock' : 'Agregar al carrito'}
          </button>
        </div>
      </div>
    </div>
  );
}
