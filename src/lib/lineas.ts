import type { Producto } from './types';

export const LINEAS = {
  matera: {
    nombre: 'Matera',
    href: '/matera',
    titulo: 'El ritual del mate',
    descripcion: 'Yerbas, mates, bombillas y accesorios para preparar y compartir un buen mate.',
    imagen: '/matera-algarrobo.webp',
    alt: 'Mate de algarrobo con bombilla',
    grupos: ['Yerbas', 'Mates', 'Bombillas', 'Accesorios'],
  },
  cristiana: {
    nombre: 'Cristiana',
    href: '/cristiana',
    titulo: 'La Palabra, cerca de ti',
    descripcion: 'Biblias, papelería y detalles cristianos para leer, escribir y regalar.',
    imagen: '/cristiana-biblia.webp',
    alt: 'Biblia con una oveja en la portada',
    grupos: ['Biblias', 'Papelería', 'Regalos y Lecturas'],
  },
} as const;

export type Linea = keyof typeof LINEAS;
type ProductoDeLinea = Pick<Producto, 'category' | 'name'>;

export function normalizarBusqueda(texto: string) {
  return texto.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();
}

const categorias = {
  matera: ['mate', 'matera', 'yerbas', 'bombillas', 'accesorios materos'],
  cristiana: ['libreria cristiana', 'cristiana', 'biblias', 'papeleria', 'articulos oficina', 'articulos de oficina']
};

const papeleria = /\b(cuaderno|cuadernos|libreta|libretas|lapiz|lapices|boligrafo|marcador|marcadores|destacador|destacadores|separador|separadores|senaladores|notas|notitas|goma|clip|clips|tijera|pizarra|planificador|corcheteras|sticker|estuche|kit oficina|lapicero|cinta adhesiva)\b/;

export function lineaProducto(producto: ProductoDeLinea): Linea | null {
  const categoria = normalizarBusqueda(producto.category);
  if (categorias.matera.includes(categoria)) return 'matera';
  if (categorias.cristiana.includes(categoria)) return 'cristiana';
  if (categoria !== 'hogar') return null;

  const nombre = normalizarBusqueda(producto.name);
  if (/\b(yerba|yerbero|matero|bombilla)\b/.test(nombre)) return 'matera';
  if (/\b(biblia|biblico|himnario|pan de vida)\b/.test(nombre) || papeleria.test(nombre)) return 'cristiana';
  return null;
}

export function grupoProducto(producto: ProductoDeLinea, linea: Linea) {
  const nombre = normalizarBusqueda(producto.name);
  if (linea === 'matera') {
    if (/^yerbas?\b/.test(nombre)) return 'Yerbas';
    if (/^bombillas?\b/.test(nombre)) return 'Bombillas';
    if (/^(mate|matero)\b/.test(nombre)) return 'Mates';
    return 'Accesorios';
  }
  if (papeleria.test(nombre) || /^(papeleria|articulos (de )?oficina)$/.test(normalizarBusqueda(producto.category))) return 'Papelería';
  if (/^biblias?\b/.test(nombre)) return 'Biblias';
  return 'Regalos y Lecturas';
}

