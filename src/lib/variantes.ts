import type { Variante } from './types';

export function etiquetaVariante(variante: Variante) {
  return [variante.color, variante.talla].filter(Boolean).join(' · ');
}

export function nombreConVariante(nombre: string, variante?: Variante) {
  return variante ? `${nombre} (${etiquetaVariante(variante)})` : nombre;
}

export function tipoVariantes(variantes: Variante[]) {
  const color = variantes.some((variante) => variante.color);
  const talla = variantes.some((variante) => variante.talla);
  if (color && talla) return variantes.every((variante) => variante.color && variante.talla) ? 'Color y talla' : 'Color o talla';
  return talla ? 'Talla' : 'Color';
}
