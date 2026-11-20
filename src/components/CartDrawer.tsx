'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRef, useEffect } from 'react';
import { claveCarrito, useCart } from '@/context/CartContext';
import { ENVIO_CHILE } from '@/lib/checkout';

const formatoCLP = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });

export default function CartDrawer() {
  const { items, isOpen, close, updateQty, removeItem, total, clear } = useCart();
  const drawerRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const drawer = drawerRef.current;
    if (!drawer) return;
    if (isOpen && !drawer.open) drawer.showModal();
    if (!isOpen && drawer.open) drawer.close();
  }, [isOpen]);

  return (
    <dialog
      ref={drawerRef}
      onClose={() => { if (!drawerRef.current?.open) close(); }}
      onClick={(event) => { if (event.target === event.currentTarget) close(); }}
      aria-labelledby="cart-title"
      className="cart-dialog fixed inset-y-0 left-auto right-0 m-0 h-dvh max-h-none w-full max-w-md shop-panel shadow-xl"
    >
      <div className="flex h-full flex-col overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b shop-divider">
          <h2 id="cart-title" className="shop-display text-xl">Tu carrito</h2>
          <button autoFocus onClick={close} aria-label="Cerrar carrito" className="grid size-11 place-items-center rounded-lg text-2xl hover:underline">
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {items.length === 0 && (
            <div className="text-center py-10">
              <p className="text-sm shop-muted mb-3">Tu carrito está vacío.</p>
              <Link href="/" onClick={close} className="text-sm shop-accent hover:underline font-medium">
                Explora las colecciones →
              </Link>
            </div>
          )}
          {items.map((item) => {
            const maxStock = item.stock ?? Infinity;
            const atMax = item.qty >= maxStock;
            return (
              <div key={claveCarrito(item)} className="flex gap-3 items-center">
                <div className={`relative size-14 shrink-0 overflow-hidden rounded shop-image-surface ${item.image_url ? 'product-watermark' : ''}`}>
                  {item.image_url && (
                    <Image src={item.image_url} alt="" fill className="object-cover" sizes="56px" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.name}</p>
                  <p className="text-xs shop-accent">{formatoCLP.format(item.price)}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <button
                      onClick={() => updateQty(item.id, item.qty - 1, item.varianteId)}
                      aria-label={`Reducir ${item.name}`}
                      className="w-9 h-9 shop-control rounded border text-sm"
                    >
                      −
                    </button>
                    <span className="text-sm w-5 text-center" aria-live="polite">{item.qty}</span>
                    <button
                      onClick={() => updateQty(item.id, item.qty + 1, item.varianteId)}
                      disabled={atMax}
                      aria-label={`Aumentar ${item.name}`}
                      className="w-9 h-9 shop-control rounded border text-sm disabled:opacity-30"
                    >
                      +
                    </button>
                    <button
                      onClick={() => removeItem(item.id, item.varianteId)}
                      aria-label={`Quitar ${item.name} del carrito`}
                      className="ml-auto text-xs shop-danger hover:underline"
                    >
                      Quitar
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="px-5 py-4 border-t shop-divider">
          {items.length > 0 && (
            <>
              <dl className="mb-3 space-y-1 text-sm">
                <div className="flex justify-between gap-3"><dt>Subtotal</dt><dd>{formatoCLP.format(total)}</dd></div>
                <div className="flex justify-between gap-3"><dt>Envío · {ENVIO_CHILE.servicio}</dt><dd>{formatoCLP.format(ENVIO_CHILE.precio)}</dd></div>
                <div className="flex justify-between gap-3 font-semibold"><dt>Total</dt><dd>{formatoCLP.format(total + ENVIO_CHILE.precio)}</dd></div>
              </dl>
              <Link href="/comprar" onClick={close}
                className="shop-button w-full">
                Finalizar compra
              </Link>
              <button type="button" onClick={clear} className="mt-2 min-h-10 w-full text-sm shop-muted hover:underline">
                Vaciar carrito
              </button>
            </>
          )}
        </div>
      </div>
    </dialog>
  );
}
