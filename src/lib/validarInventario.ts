import { normalizarBusqueda } from './lineas';
import type { Variante } from './types';

export const esVarianteId = (id: unknown): id is string =>
  typeof id === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(id);

const entero = (valor: unknown, maximo: number): valor is number =>
  typeof valor === 'number' && Number.isInteger(valor) && valor >= 0 && valor <= maximo;

export function validarInventario(data: Record<string, unknown>) {
  const precio = data.price ?? 0;
  const oferta = data.precioOferta;
  if (!entero(precio, 2147483647)) return 'El precio normal debe ser un entero válido en CLP.';
  if (oferta != null && (!entero(oferta, 2147483647) || oferta === 0 || oferta >= precio)) {
    return 'El precio de oferta debe ser mayor que cero y menor que el precio normal.';
  }
  if (!entero(data.stock ?? 0, 1000000)) return 'Ingresa un stock válido.';
  if (data.variantes !== undefined) {
    const variantes = data.variantes;
    if (!Array.isArray(variantes) || variantes.length > 30 ||
      variantes.some((v) => !esVarianteId(v?.id) || typeof v?.color !== 'string' ||
        !v.color.trim() || v.color.length > 40 || !entero(v?.stock, 1000000))) {
      return 'Revisa los colores y sus cantidades (máximo 30 colores).';
    }
    if (new Set(variantes.map((v) => v.id)).size !== variantes.length ||
        new Set(variantes.map((v) => normalizarBusqueda(v.color))).size !== variantes.length) {
      return 'Cada color debe tener un nombre distinto.';
    }
    data.variantes = variantes.map(({ id, color, stock }: Variante) => ({ id, color: color.trim(), stock }));
  }
  return null;
}
