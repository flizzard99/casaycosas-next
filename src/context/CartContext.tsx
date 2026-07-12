'use client';

import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';

export type CartItem = {
  id: number;
  name: string;
  price: number;
  image_url: string;
  qty: number;
  stock?: number;
};

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

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {
      // localStorage no disponible o corrupto
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // si falla el guardado, no bloqueamos la UI
    }
  }, [items, hydrated]);

  function addItem(item: Omit<CartItem, 'qty'>, qty = 1) {
    setItems((prev) => {
      const existente = prev.find((p) => p.id === item.id);
      const maxStock = item.stock ?? Infinity;
      if (existente) {
        const newQty = Math.min(existente.qty + qty, maxStock);
        return prev.map((p) => (p.id === item.id ? { ...p, qty: newQty } : p));
      }
      return [...prev, { ...item, qty: Math.min(qty, maxStock) }];
    });
  }

  function removeItem(id: number) {
    setItems((prev) => prev.filter((p) => p.id !== id));
  }

  function updateQty(id: number, qty: number) {
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
