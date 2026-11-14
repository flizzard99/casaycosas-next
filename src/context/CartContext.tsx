'use client';

import { createContext, useContext, useMemo, useState, useSyncExternalStore, ReactNode } from 'react';

import { normalizarCarrito, type CartItem } from '@/lib/cart';
export type { CartItem } from '@/lib/cart';

type CartContextType = {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'qty'>, qty?: number) => void;
  removeItem: (id: number) => void;
  updateQty: (id: number, qty: number) => void;
  clear: () => void;
  total: number;
  count: number;
  isOpen: boolean;
  open: () => void;
  close: () => void;
};

const CartContext = createContext<CartContextType | null>(null);
const STORAGE_KEY = 'casaycosas_cart';

const EMPTY_CART: CartItem[] = [];
let currentItems: CartItem[] = EMPTY_CART;
let storedRaw: string | null = null;
const listeners = new Set<() => void>();

function getCartSnapshot(): CartItem[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw !== storedRaw) {
      storedRaw = raw;
      try { currentItems = raw ? normalizarCarrito(JSON.parse(raw)) : EMPTY_CART; }
      catch { currentItems = EMPTY_CART; }
    }
  } catch {}
  return currentItems;
}

function subscribeCart(listener: () => void) {
  listeners.add(listener);
  window.addEventListener('storage', listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', listener);
  };
}

function setItems(update: CartItem[] | ((previous: CartItem[]) => CartItem[])) {
  const previous = getCartSnapshot();
  currentItems = normalizarCarrito(typeof update === 'function' ? update(previous) : update);
  const raw = JSON.stringify(currentItems);
  try {
    window.localStorage.setItem(STORAGE_KEY, raw);
    storedRaw = raw;
  } catch {}
  listeners.forEach((listener) => listener());
}

export function CartProvider({ children }: { children: ReactNode }) {
  const items = useSyncExternalStore(subscribeCart, getCartSnapshot, () => EMPTY_CART);
  const [isOpen, setIsOpen] = useState(false);

  function addItem(item: Omit<CartItem, 'qty'>, qty = 1) {
    if (!Number.isSafeInteger(qty) || qty <= 0) return;
    setItems((prev) => {
      const existente = prev.find((p) => p.id === item.id);
      const maxStock = item.stock ?? 999;
      if (existente) {
        const newQty = Math.min(existente.qty + qty, maxStock);
        return normalizarCarrito(prev.map((p) => (p.id === item.id ? { ...item, qty: newQty } : p)));
      }
      return normalizarCarrito([...prev, { ...item, qty: Math.min(qty, maxStock) }]);
    });
  }

  function removeItem(id: number) {
    setItems((prev) => prev.filter((p) => p.id !== id));
  }

  function updateQty(id: number, qty: number) {
    if (!Number.isSafeInteger(qty)) return;
    if (qty <= 0) return removeItem(id);
    setItems((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        const maxStock = p.stock ?? Infinity;
        return { ...p, qty: Math.min(qty, maxStock) };
      })
    );
  }

  function clear() {
    setItems([]);
  }

  const total = useMemo(() => items.reduce((sum, i) => sum + i.price * i.qty, 0), [items]);
  const count = useMemo(() => items.reduce((sum, i) => sum + i.qty, 0), [items]);

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQty,
        clear,
        total,
        count,
        isOpen,
        open: () => setIsOpen(true),
        close: () => setIsOpen(false)
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart debe usarse dentro de <CartProvider>');
  return ctx;
}
