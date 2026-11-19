'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRef, useEffect } from 'react';
import { useCart } from '@/context/CartContext';

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
      className="cart-dialog fixed inset-y-0 left-auto right-0 m-0 h-dvh max-h-none w-full max-w-md bg-white text-verde-noche shadow-xl"
    >
      <div className="flex h-full flex-col overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-verde-noche/10">
          <h2 id="cart-title" className="font-display text-xl text-verde-noche">Tu carrito</h2>
          <button autoFocus onClick={close} aria-label="Cerrar carrito" className="grid size-11 place-items-center rounded-lg text-2xl hover:bg-crema/50">
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {items.length === 0 && (
            <div className="text-center py-10">
              <p className="text-sm text-verde-noche/60 mb-3">Tu carrito está vacío.</p>
              <Link href="/catalogo" onClick={close} className="text-sm text-verde hover:text-verde-oscuro font-medium">
                Explora nuestro catálogo →
              </Link>
            </div>
          )}
          {items.map((item) => {
            const maxStock = item.stock ?? Infinity;
            const atMax = item.qty >= maxStock;
            return (
              <div key={item.id} className="flex gap-3 items-center">
                <div className={`relative size-14 shrink-0 overflow-hidden rounded bg-crema/40 ${item.image_url ? 'product-watermark' : ''}`}>
                  {item.image_url && (
                    <Image src={item.image_url} alt="" fill className="object-cover" sizes="56px" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-verde-noche truncate">{item.name}</p>
                  <p className="text-xs text-verde">{formatoCLP.format(item.price)}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <button
                      onClick={() => updateQty(item.id, item.qty - 1)}
                      aria-label={`Reducir ${item.name}`}
                      className="w-9 h-9 rounded border border-verde-noche/20 text-sm"
                    >
                      −
                    </button>
                    <span className="text-sm w-5 text-center" aria-live="polite">{item.qty}</span>
                    <button
                      onClick={() => updateQty(item.id, item.qty + 1)}
                      disabled={atMax}
                      aria-label={`Aumentar ${item.name}`}
                      className="w-9 h-9 rounded border border-verde-noche/20 text-sm disabled:opacity-30"
                    >
                      +
                    </button>
                    <button
                      onClick={() => removeItem(item.id)}
                      aria-label={`Quitar ${item.name} del carrito`}
                      className="ml-auto text-xs text-red-500 hover:underline"
                    >
                      Quitar
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="px-5 py-4 border-t border-verde-noche/10">
          <div className="flex justify-between text-sm mb-3">
            <span className="text-verde-noche/70">Total</span>
            <span className="font-semibold text-verde-noche">{formatoCLP.format(total)}</span>
          </div>

          {items.length > 0 && (
            <>
              <Link href="/comprar" onClick={close}
                className="flex min-h-12 items-center justify-center rounded-lg bg-verde-oscuro px-3 font-semibold text-white hover:bg-verde-noche">
                Finalizar compra
              </Link>
              <button type="button" onClick={clear} className="mt-2 min-h-10 w-full text-sm text-verde-noche/70 hover:underline">
                Vaciar carrito
              </button>
            </>
          )}
        </div>
      </div>
    </dialog>
  );
}