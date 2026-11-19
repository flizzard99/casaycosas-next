'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useCart } from '@/context/CartContext';
import ProductCarousel from './ProductCarousel';
import ProductCard from './ProductCard';
import type { Producto } from '@/lib/types';
import { tienda } from '@/lib/config';

const formatoCLP = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });

export default function ProductDetailClient({ producto, relacionados = [] }: { producto: Producto; relacionados?: Producto[] }) {
  const { addItem } = useCart();
  const sinStock = producto.stock <= 0;
  const imagenes = producto.images?.length ? producto.images : producto.image_url ? [producto.image_url] : [];

  const [qty, setQty] = useState(1);
  const [agregado, setAgregado] = useState(false);
  const maxQty = producto.stock || 1;

  function comprarAhora() {
    const msg = `Hola! Quisiera reservar: ${qty}x ${producto.name} — ${formatoCLP.format(producto.price * qty)} (retiro en tienda)`;
    window.open(`https://wa.me/${tienda.whatsappNumber}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener,noreferrer');
  }

  return (
    <div className="store-shell py-7 sm:py-10">
      <Link href="/catalogo" className="text-sm text-verde hover:text-verde-oscuro mb-6 inline-block">
        ← Volver al catálogo
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="relative aspect-square overflow-hidden rounded-xl border border-verde-noche/10">
          <ProductCarousel images={imagenes} alt={producto.name} />
        </div>

        <div className="flex flex-col md:py-6">
          <div className="text-sm capitalize text-verde-oscuro font-semibold">{producto.category}</div>
          <h1 className="font-display balance-text mt-2 text-3xl text-verde-noche sm:text-4xl">{producto.name}</h1>
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

          {!sinStock && (
            <div className="flex items-center gap-3 mt-6">
              <span className="text-sm text-verde-noche/70">Cantidad:</span>
              <div className="flex items-center border border-verde-noche/20 rounded-md">
                <button
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  disabled={qty === 1}
                  aria-label="Reducir cantidad"
                  className="w-9 h-9 flex items-center justify-center text-lg font-medium hover:bg-crema transition-colors rounded-l-md"
                >
                  −
                </button>
                <span className="w-10 text-center font-medium">{qty}</span>
                <button
                  onClick={() => setQty((q) => Math.min(maxQty, q + 1))}
                  disabled={qty >= maxQty}
                  aria-label="Aumentar cantidad"
                  className="w-9 h-9 flex items-center justify-center text-lg font-medium hover:bg-crema transition-colors rounded-r-md disabled:opacity-30"
                >
                  +
                </button>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 mt-4">
            <button
              disabled={sinStock}
              onClick={() => {
                addItem({
                  id: producto.id,
                  name: producto.name,
                  price: producto.price,
                  image_url: imagenes[0] || '',
                  stock: producto.stock
                }, qty);
                setQty(1);
                setAgregado(true);
                setTimeout(() => setAgregado(false), 1500);
              }}
              className={`flex-1 px-6 py-3 rounded-md text-sm font-semibold uppercase tracking-wide transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed ${
                agregado ? 'bg-verde-oscuro text-white' : 'bg-verde text-white hover:bg-verde-oscuro'
              }`}
            >
              {sinStock ? 'Sin stock' : agregado ? '✓ Agregado al carrito' : 'Agregar al carrito'}
            </button>
            {!sinStock && (
              <button
                onClick={comprarAhora}
                className="flex-1 px-6 py-3 rounded-md bg-verde-noche text-white text-sm font-semibold uppercase tracking-wide hover:bg-verde-oscuro transition-colors"
              >
                Consultar por WhatsApp
              </button>
            )}
          </div>

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
              </a>.
            </p>
          </div>
        </div>
      </div>

      {relacionados.length > 0 && (
        <div className="mt-16">
          <h2 className="font-display text-2xl text-verde-oscuro mb-6">Te puede interesar</h2>
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
