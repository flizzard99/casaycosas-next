export function validarProducto(body: unknown): string[] {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return ['Producto inválido'];
  const producto = body as Record<string, unknown>;
  const errores: string[] = [];
  for (const [key, label, max] of [['name', 'El nombre', 200], ['category', 'La categoría', 100]] as const) {
    if (typeof producto[key] !== 'string' || !producto[key].trim() || producto[key].length > max) errores.push(`${label} es obligatorio y no puede superar ${max} caracteres`);
  }
  for (const key of ['price', 'stock']) {
    const value = producto[key];
    if (value !== undefined && (!Number.isSafeInteger(value) || (value as number) < 0 || (value as number) > 2147483647)) errores.push(`${key === 'price' ? 'El precio' : 'El stock'} debe ser un entero positivo o cero`);
  }
  if (producto.description !== undefined && (typeof producto.description !== 'string' || producto.description.length > 2000)) errores.push('La descripción debe tener hasta 2000 caracteres');
  for (const key of ['image_url', 'instagram_url']) {
    if (producto[key] !== undefined && typeof producto[key] !== 'string') errores.push(`${key} debe ser texto`);
  }
  if (producto.images !== undefined && (!Array.isArray(producto.images) || producto.images.length > 20 || producto.images.some((image) => typeof image !== 'string'))) errores.push('Las imágenes deben ser una lista de hasta 20 URLs');
  return errores;
}
