export const formatoCLP = new Intl.NumberFormat('es-CL', {
  style: 'currency', currency: 'CLP', maximumFractionDigits: 0
});

export function precioActual(producto: { price: number; precioOferta?: number | null }) {
  const oferta = producto.precioOferta;
  return oferta && oferta > 0 && oferta < producto.price ? oferta : producto.price;
}
