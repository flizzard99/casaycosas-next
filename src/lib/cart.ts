export type CartItem = {
  id: number;
  name: string;
  price: number;
  image_url: string;
  qty: number;
  stock?: number;
};

export function normalizarCarrito(value: unknown): CartItem[] {
  if (!Array.isArray(value)) return [];
  const items = new Map<number, CartItem>();
  for (const item of value.slice(0, 100)) {
    if (!item || typeof item !== 'object' || !Number.isSafeInteger(item.id) || item.id <= 0 ||
      typeof item.name !== 'string' || !Number.isSafeInteger(item.price) || item.price < 0 ||
      !Number.isSafeInteger(item.qty) || item.qty <= 0 ||
      (item.stock !== undefined && (!Number.isSafeInteger(item.stock) || item.stock < 0))) continue;
    const qty = Math.min(item.qty, item.stock ?? 999, 999);
    if (qty <= 0) continue;
    items.set(item.id, {
      id: item.id, name: item.name.slice(0, 200), price: item.price,
      image_url: typeof item.image_url === 'string' && /^(https:\/\/|\/(?!\/))/.test(item.image_url) ? item.image_url : '',
      qty, ...(item.stock !== undefined ? { stock: item.stock } : {})
    });
  }
  return [...items.values()];
}
