'use client';

import { grupoProducto, LINEAS, type Linea } from '@/lib/lineas';
import { useId, useState } from 'react';
import Link from 'next/link';
import { useCart } from '@/context/CartContext';
import ProductCarousel from './ProductCarousel';
import ProductCard from './ProductCard';
import type { Producto } from '@/lib/types';
import { tienda } from '@/lib/config';
import { etiquetaVariante, nombreConVariante, tipoVariantes } from '@/lib/variantes';

import { precioActual } from '@/lib/precios';
import PrecioProducto from './PrecioProducto';

export default function ProductDetailClient({ linea, producto, relacionados = [] }: { linea: Linea; producto: Producto; relacionados?: Producto[] }) {
  const { addItem } = useCart();
  const sinStock = producto.stock <= 0;
  const imagenes = producto.images?.length ? producto.images : producto.image_url ? [producto.image_url] : [];

  const selectorId = useId();
  const [varianteId, setVarianteId] = useState('');
  const variante = producto.variantes.find((v) => v.id === varianteId);
  const requiereVariante = producto.variantes.length > 0;
  const tipo = tipoVariantes(producto.variantes);
  const indicacion = tipo === 'Talla' ? 'Selecciona una talla' : tipo === 'Color' ? 'Selecciona un color' : 'Selecciona una opción';
  const [qty, setQty] = useState(1);
  const [agregado, setAgregado] = useState(false);
  const maxQty = variante?.stock ?? (requiereVariante ? 0 : producto.stock);

  return (
    <div className="store-shell py-7 sm:py-10">
      <Link href={LINEAS[linea].href} className="shop-accent mb-6 inline-block text-sm font-semibold hover:underline">
        ← Volver a {LINEAS[linea].nombre}
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="relative aspect-square overflow-hidden rounded-xl border shop-divider">
          <ProductCarousel images={imagenes} alt={producto.name} />
        </div>

        <div className="flex flex-col md:py-6">
          <div className="shop-accent text-sm font-semibold">{grupoProducto(producto, linea)}</div>
          <h1 className="shop-display balance-text mt-2 text-3xl sm:text-4xl">{producto.name}</h1>
          <PrecioProducto producto={producto} className="shop-accent text-2xl font-semibold mt-3" />

          {producto.stock > 0 ? (
            <p className="shop-muted text-xs mt-1">Stock disponible: {producto.stock}</p>
          ) : (
            <span className="shop-stock-badge mt-1 self-start rounded px-2 py-1 text-xs font-semibold">
              Agotado
            </span>
          )}

          {producto.description && (
            <p className="shop-muted text-sm leading-relaxed mt-5">{producto.description}</p>
          )}

          {requiereVariante && (
            <div className="mt-6 grid max-w-sm gap-2 text-sm font-semibold">
              <label htmlFor={selectorId}>{tipo}</label>
              <select id={selectorId} className="shop-control min-h-11 rounded-lg border px-3" value={varianteId}
                onChange={(event) => { setVarianteId(event.target.value); setQty(1); setAgregado(false); }}>
                <option value="">{indicacion}</option>
                {producto.variantes.map((v) => (
                  <option key={v.id} value={v.id} disabled={v.stock <= 0}>{etiquetaVariante(v)}{v.stock <= 0 ? ' · Agotado' : ''}</option>
                ))}
              </select>
              {variante && <span role="status" className="shop-muted text-xs">Stock de {etiquetaVariante(variante)}: {variante.stock}</span>}
            </div>
          )}

          {!sinStock && maxQty > 0 && (
            <div className="flex items-center gap-3 mt-6">
              <span className="shop-muted text-sm">Cantidad:</span>
              <div className="flex items-center border shop-divider rounded-md">
                <button
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  disabled={qty === 1}
                  aria-label="Reducir cantidad"
                  className="w-9 h-9 flex items-center justify-center text-lg font-medium shop-control transition-colors rounded-l-md"
                >
                  −
                </button>
                <span className="w-10 text-center font-medium">{qty}</span>
                <button
                  onClick={() => setQty((q) => Math.min(maxQty, q + 1))}
                  disabled={qty >= maxQty}
                  aria-label="Aumentar cantidad"
                  className="w-9 h-9 flex items-center justify-center text-lg font-medium shop-control transition-colors rounded-r-md disabled:opacity-30"
                >
                  +
                </button>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 mt-4">
            <button
              disabled={maxQty <= 0}
              onClick={() => {
                addItem({
                  id: producto.id,
                  name: nombreConVariante(producto.name, variante),
                  varianteId: variante?.id,
                  price: precioActual(producto),
                  image_url: imagenes[0] || '',
                  stock: maxQty
                }, qty);
                setQty(1);
                setAgregado(true);
                setTimeout(() => setAgregado(false), 1500);
              }}
              className="shop-button flex-1"
            >
              {sinStock ? 'Sin stock' : requiereVariante && !variante ? indicacion : agregado ? '✓ Agregado al carrito' : 'Agregar al carrito'}
            </button>
          </div>

          {producto.instagram_url && (
            <a
              href={producto.instagram_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 text-sm shop-accent hover:underline"
            >
              Ver en Instagram
            </a>
          )}

          <div className="mt-8 pt-6 border-t shop-divider">
            <p className="shop-muted text-sm">
              ¿Dudas? Escríbenos por{' '}
              <a href={tienda.whatsappUrl} target="_blank" rel="noopener noreferrer" className="shop-accent hover:underline">
                WhatsApp
              </a>.
            </p>
          </div>
        </div>
      </div>

      {relacionados.length > 0 && (
        <div className="mt-16">
          <h2 className="shop-display text-2xl mb-6">Te puede interesar</h2>
          <div className="store-grid">
            {relacionados.map((p) => (
              <ProductCard key={p.id} producto={p} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
