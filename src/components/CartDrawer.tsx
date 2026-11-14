'use client';

import ProductImage from './ProductImage';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useCart } from '@/context/CartContext';

const formatoCLP = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });

export default function CartDrawer() {
  const { items, isOpen, close, updateQty, removeItem, total, clear } = useCart();
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [bloqueado, setBloqueado] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const drawerRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      close();
      return;
    }
    if (e.key !== 'Tab' || !drawerRef.current) return;
    const focusable = drawerRef.current.querySelectorAll<HTMLElement>(
      'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])'
    );
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }, [close]);

  useEffect(() => {
    if (!isOpen) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeBtnRef.current?.focus();
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, handleKeyDown]);

  function validarEmail(valor: string): boolean {
    if (!valor.trim()) return true;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor.trim());
  }

  async function reservarPedido() {
    if (!items.length || bloqueado) return;
    if (!validarEmail(email)) {
      setEmailError('Email inválido. Déjalo vacío si no quieres recibir notificaciones.');
      return;
    }
    setBloqueado(true);
    setError('');
    setEmailError('');
    try {
      const res = await fetch('/api/pedido', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map((i) => ({ id: i.id, qty: i.qty })),
          nombre: nombre.trim(),
          email: email.trim()
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'No se pudo procesar el pedido');
        return;
      }
      const estadoUrl = data.estadoUrl as string;
      clear();
      setNombre('');
      setEmail('');
      close();
      const destino = new URL(estadoUrl, window.location.origin);
      router.push(`${destino.pathname}${destino.search}`);
    } catch {
      setError('Error de conexión. Intenta nuevamente.');
    } finally {
      setBloqueado(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 z-50 flex justify-end transition-opacity duration-300 ${isOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}>
      <div
        className={`absolute inset-0 bg-black/40 cursor-pointer transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}
        onClick={close}
        aria-hidden="true"
      />
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Carrito de compras"
        className={`relative w-full max-w-sm bg-white h-full flex flex-col shadow-xl transition-transform duration-300 ease-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-verde-noche/10">
          <h2 className="font-display text-lg text-verde-noche">Tu carrito</h2>
          <button ref={closeBtnRef} onClick={close} aria-label="Cerrar carrito" className="text-verde-noche/60 hover:text-verde-noche text-xl leading-none">
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
                <div className="w-14 h-14 rounded bg-crema flex-shrink-0 overflow-hidden relative">
                  {item.image_url && (
                    <ProductImage src={item.image_url} alt={item.name} fill className="object-cover" sizes="56px" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-verde-noche truncate">{item.name}</p>
                  <p className="text-xs text-verde">{formatoCLP.format(item.price)}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <button
                      onClick={() => updateQty(item.id, item.qty - 1)}
                      aria-label={`Reducir ${item.name}`}
                      className="w-6 h-6 rounded border border-verde-noche/20 text-sm"
                    >
                      −
                    </button>
                    <span className="text-sm w-5 text-center" aria-live="polite">{item.qty}</span>
                    <button
                      onClick={() => updateQty(item.id, item.qty + 1)}
                      disabled={atMax}
                      aria-label={`Aumentar ${item.name}`}
                      className="w-6 h-6 rounded border border-verde-noche/20 text-sm disabled:opacity-30"
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
              <input
                type="text"
                aria-label="Tu nombre (opcional)"
                autoComplete="name"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Tu nombre (opcional)"
                className="w-full mb-2 px-3 py-2 rounded-md border border-verde-noche/20 bg-crema/30 text-sm focus:outline-none focus:ring-2 focus:ring-verde"
                maxLength={50}
              />
              <input
                type="email"
                aria-label="Tu email (opcional, para seguimiento)"
                autoComplete="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setEmailError(''); }}
                placeholder="Tu email (opcional, para seguimiento)"
                className="w-full mb-1 px-3 py-2 rounded-md border border-verde-noche/20 bg-crema/30 text-sm focus:outline-none focus:ring-2 focus:ring-verde"
                maxLength={200}
              />
              {emailError && <p className="text-xs text-red-600 mb-1">{emailError}</p>}
              <p className="text-[11px] text-verde-noche/40 mb-3 leading-relaxed">
                Reservaremos el stock 48h. Recibirás un enlace para seguir tu pedido. WhatsApp queda opcional.
              </p>
            </>
          )}

          {error && (
            <p role="alert" className="text-xs text-red-600 mb-2 leading-relaxed">{error}</p>
          )}

          <button
            onClick={reservarPedido}
            disabled={!items.length || bloqueado}
            className="w-full bg-verde text-white text-sm font-semibold py-3 rounded-md hover:bg-verde-oscuro disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {bloqueado ? 'Reservando…' : 'Reservar pedido'}
          </button>

          {items.length > 0 && (
            <button onClick={clear} className="w-full text-xs text-verde-noche/50 hover:text-verde-noche mt-2">
              Vaciar carrito
            </button>
          )}
        </div>
      </div>
    </div>
  );
}