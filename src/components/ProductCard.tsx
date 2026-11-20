'use client';

import { nombreCategoria } from '@/lib/categorias';
import { grupoProducto, lineaProducto } from '@/lib/lineas';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { useCart } from '@/context/CartContext';
import type { Producto } from '@/lib/types';
import { parsearEncuadre, estilosEncuadre } from '@/lib/encuadre';

import { precioActual } from '@/lib/precios';
import PrecioProducto from './PrecioProducto';

export default function ProductCard({ producto }: { producto: Producto }) {
  const { addItem } = useCart();
  const imagen = producto.images?.[0] || producto.image_url;
  const { url: imagenLimpia, encuadre } = parsearEncuadre(imagen);
  const linea = lineaProducto(producto);
  const sinStock = producto.stock <= 0;
  const tieneVarias = (producto.images?.length || 0) > 1;

  const [qty, setQty] = useState(1);
  const [agregado, setAgregado] = useState(false);

  const maxQty = producto.stock || 1;

  return (
    <article className="shop-panel flex flex-col overflow-hidden rounded-xl border">
      <Link href={`/producto/${producto.id}`} prefetch={false} className="group block" tabIndex={-1} aria-hidden="true">
        <div className={`relative aspect-square overflow-hidden shop-image-surface ${imagen ? 'product-watermark' : ''}`}>
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
            <div className="w-full h-full flex items-center justify-center shop-muted text-sm">
              Sin imagen
            </div>
          )}
          {sinStock && (
            <div className="absolute left-2 top-2 rounded-md shop-stock-badge px-2 py-1">
              <span className="text-xs font-semibold uppercase tracking-wide">Agotado</span>
            </div>
          )}
          {tieneVarias && !sinStock && (
            <span className="absolute top-2 right-2 shop-panel text-[10px] font-semibold px-1.5 py-0.5 rounded">
              {producto.images.length} fotos
            </span>
          )}
        </div>
      </Link>
      <div className="p-4 flex flex-col flex-1">
        <Link href={`/producto/${producto.id}`} prefetch={false}>
          <div className="shop-muted text-xs font-medium">{linea ? grupoProducto(producto, linea) : nombreCategoria(producto.category)}</div>
          <h3 className="mt-1 text-sm font-semibold leading-snug hover:underline sm:text-base">{producto.name}</h3>
        </Link>
        <PrecioProducto producto={producto} className="mt-2 flex-1 text-base font-semibold shop-accent" />
        {!sinStock && !producto.variantes.length && (
          <div className="flex items-center justify-center gap-2 mt-3">
              <button
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                disabled={qty === 1}
                aria-label="Reducir cantidad"
                className="w-9 h-9 shop-control rounded border text-sm font-medium transition-colors"
              >
                −
              </button>
              <span className="text-sm w-5 text-center font-medium" aria-live="polite">{qty}</span>
              <button
                onClick={() => setQty((q) => Math.min(maxQty, q + 1))}
                disabled={qty >= maxQty}
                aria-label="Aumentar cantidad"
                className="w-9 h-9 shop-control rounded border text-sm font-medium transition-colors disabled:opacity-30"
              >
                +
              </button>
            </div>
          )}
          {producto.variantes.length && !sinStock ? (
            <Link href={`/producto/${producto.id}`} prefetch={false} className="shop-button mt-3 px-2 py-2 text-xs">Elegir color</Link>
          ) : (
          <button
            disabled={sinStock}
            onClick={() => {
              addItem({ id: producto.id, name: producto.name, price: precioActual(producto), image_url: imagenLimpia, stock: producto.stock }, qty);
              setQty(1);
              setAgregado(true);
              setTimeout(() => setAgregado(false), 1500);
            }}
            className="shop-button mt-3 px-2 py-2 text-xs"
          >
            {sinStock ? 'Sin stock' : agregado ? '✓ Agregado' : 'Agregar al carrito'}
          </button>
          )}
      </div>
    </article>
  );
}
