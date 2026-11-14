export type PedidoValidado = {
  items: { id: number; qty: number }[];
  nombre: string;
  whatsapp: string;
  email: string;
};

export function validarPedido(body: unknown): PedidoValidado | { error: string } {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { error: 'Pedido inválido' };
  const { items, nombre = '', whatsapp = '', email = '' } = body as Record<string, unknown>;
  if (!Array.isArray(items) || !items.length || items.length > 100) return { error: 'El carrito debe contener entre 1 y 100 productos' };
  if (typeof nombre !== 'string' || typeof whatsapp !== 'string' || typeof email !== 'string') return { error: 'Datos de contacto inválidos' };
  if (nombre.length > 100 || whatsapp.length > 20 || email.length > 200) return { error: 'Los datos de contacto son demasiado largos' };
  const emailLimpio = email.trim();
  if (emailLimpio && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailLimpio)) return { error: 'El email no es válido' };
  const agrupados = new Map<number, number>();
  for (const item of items) {
    if (!item || typeof item !== 'object' || !Number.isSafeInteger(item.id) || item.id <= 0 || item.id > 2147483647 || !Number.isSafeInteger(item.qty) || item.qty <= 0 || item.qty > 999) {
      return { error: 'Productos o cantidades inválidos' };
    }
    const qty = (agrupados.get(item.id) || 0) + item.qty;
    if (qty > 999) return { error: 'La cantidad máxima por producto es 999' };
    agrupados.set(item.id, qty);
  }
  return {
    items: [...agrupados].map(([id, qty]) => ({ id, qty })),
    nombre: nombre.trim(), whatsapp: whatsapp.trim(), email: emailLimpio
  };
}
