import { normalizarBusqueda } from './lineas';
import type { Variante } from './types';

export const esVarianteId = (id: unknown): id is string =>
  typeof id === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(id);

const entero = (valor: unknown, maximo: number): valor is number =>
  typeof valor === 'number' && Number.isInteger(valor) && valor >= 0 && valor <= maximo;

const textoOpcional = (valor: unknown) => valor === undefined || (typeof valor === 'string' && valor.trim().length <= 40);

export function validarInventario(data: Record<string, unknown>) {
  const precio = data.price ?? 0;
  const oferta = data.precioOferta;
  if (!entero(precio, 2147483647)) return 'El precio normal debe ser un entero válido en CLP.';
  if (oferta != null && (!entero(oferta, 2147483647) || oferta === 0 || oferta >= precio)) {
    return 'El precio de oferta debe ser mayor que cero y menor que el precio normal.';
  }
  if (!entero(data.stock ?? 0, 1000000)) return 'Ingresa un stock válido.';
  if (data.subcategoria !== undefined && (typeof data.subcategoria !== 'string' || data.subcategoria.trim().length > 80)) {
    return 'La subcategoría no puede superar 80 caracteres.';
  }
  if (typeof data.subcategoria === 'string') data.subcategoria = data.subcategoria.trim();
  if (data.variantes !== undefined) {
    const variantes = data.variantes;
    if (!Array.isArray(variantes) || variantes.length > 30 ||
      variantes.some((v) => !esVarianteId(v?.id) || !textoOpcional(v.color) || !textoOpcional(v.talla) ||
        !(v.color?.trim() || v.talla?.trim()) || !entero(v.stock, 1000000))) {
      return 'Ingresa un color o una talla y el stock de cada variante (máximo 30 variantes).';
    }
    const opciones = variantes.map((v: Variante) => JSON.stringify([
      normalizarBusqueda(v.color ?? ''), normalizarBusqueda(v.talla ?? '')
    ]));
    if (new Set(variantes.map((v) => v.id)).size !== variantes.length ||
        new Set(opciones).size !== variantes.length) {
      return 'Cada variante debe tener un color, una talla o una combinación distinta.';
    }
    data.variantes = variantes.map(({ id, color, talla, stock }: Variante) => ({
      id, color: color?.trim() || undefined, talla: talla?.trim() || undefined, stock
    }));
  }
  return null;
}
