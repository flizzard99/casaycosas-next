export const formatoCLP = new Intl.NumberFormat('es-CL', {
  style: 'currency', currency: 'CLP', maximumFractionDigits: 0
});

export function precioActual(producto: { price: number; precioOferta?: number | null }) {
  const oferta = producto.precioOferta;
  return oferta && oferta > 0 && oferta < producto.price ? oferta : producto.price;
}

export function esOferta(producto: { price: number; precioOferta?: number | null; remate?: boolean }) {
  return !producto.remate && precioActual(producto) < producto.price;
}
