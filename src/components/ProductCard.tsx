'use client';

import { nombreCategoria } from '@/lib/categorias';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { useCart } from '@/context/CartContext';
import type { Producto } from '@/lib/types';
import { parsearEncuadre, estilosEncuadre } from '@/lib/encuadre';

const formatoCLP = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });

export default function ProductCard({ producto }: { producto: Producto }) {
  const { addItem } = useCart();
  const imagen = producto.images?.[0] || producto.image_url;
  const { url: imagenLimpia, encuadre } = parsearEncuadre(imagen);
  const sinStock = producto.stock <= 0;
  const tieneVarias = (producto.images?.length || 0) > 1;

  const [qty, setQty] = useState(1);
  const [agregado, setAgregado] = useState(false);

  const maxQty = producto.stock || 1;

  return (
    <article className="flex flex-col overflow-hidden rounded-xl border border-verde-noche/15 bg-white">
      <Link href={`/producto/${producto.id}`} prefetch={false} className="group block" tabIndex={-1} aria-hidden="true">
        <div className={`relative aspect-square overflow-hidden bg-crema/40 ${imagen ? 'product-watermark' : ''}`}>
          {imagen ? (
            <Image
              src={imagenLimpia}
              alt=""
              fill
              className="group-hover:opacity-90"
              style={estilosEncuadre(encuadre)}
              sizes="(min-width: 1280px) 288px, (min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-verde-oscuro/40 text-sm">
              Sin imagen
            </div>
          )}
          {sinStock && (
            <div className="absolute left-2 top-2 rounded-md bg-verde-noche px-2 py-1">
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
        <Link href={`/producto/${producto.id}`} prefetch={false}>
          <div className="text-xs font-medium text-verde-oscuro">{nombreCategoria(producto.category)}</div>
          <h3 className="mt-1 text-sm font-semibold leading-snug text-verde-noche hover:underline sm:text-base">{producto.name}</h3>
        </Link>
        <p className="mt-2 flex-1 text-base font-semibold text-verde-oscuro">{formatoCLP.format(producto.price)}</p>
        {!sinStock && (
          <div className="flex items-center justify-center gap-2 mt-3">
              <button
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                disabled={qty === 1}
                aria-label="Reducir cantidad"
                className="w-9 h-9 rounded border border-verde-noche/20 text-sm font-medium hover:bg-crema transition-colors"
              >
                −
              </button>
              <span className="text-sm w-5 text-center font-medium" aria-live="polite">{qty}</span>
              <button
                onClick={() => setQty((q) => Math.min(maxQty, q + 1))}
                disabled={qty >= maxQty}
                aria-label="Aumentar cantidad"
                className="w-9 h-9 rounded border border-verde-noche/20 text-sm font-medium hover:bg-crema transition-colors disabled:opacity-30"
              >
                +
              </button>
            </div>
          )}
          <button
            disabled={sinStock}
            onClick={() => {
              addItem({ id: producto.id, name: producto.name, price: producto.price, image_url: imagenLimpia, stock: producto.stock }, qty);
              setQty(1);
              setAgregado(true);
              setTimeout(() => setAgregado(false), 1500);
            }}
            className={`mt-3 min-h-11 rounded-lg px-2 py-2 text-xs font-semibold transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed ${
              agregado ? 'bg-verde-oscuro text-white' : 'bg-verde-oscuro text-white hover:bg-verde-noche'
            }`}
          >
            {sinStock ? 'Sin stock' : agregado ? '✓ Agregado' : 'Agregar al carrito'}
          </button>
      </div>
    </article>
  );
}
