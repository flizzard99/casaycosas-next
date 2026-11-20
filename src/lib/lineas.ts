import type { Producto } from './types';

export const LINEAS = {
  matera: {
    nombre: 'Matera',
    href: '/matera',
    titulo: 'El ritual del mate',
    descripcion: 'Yerbas, mates, bombillas y accesorios para preparar y compartir un buen mate.',
    imagen: '/matera-algarrobo.webp',
    alt: 'Mate de algarrobo con bombilla',
    grupos: ['Yerbas Mate', 'Mates', 'Decant', 'Accesorios'],
  },
  cristiana: {
    nombre: 'Cristiana',
    href: '/cristiana',
    titulo: 'La Palabra, cerca de ti',
    descripcion: 'Biblias, papelería y detalles cristianos para leer, escribir y regalar.',
    imagen: '/cristiana-biblia.webp',
    alt: 'Biblia con una oveja en la portada',
    grupos: ['Biblias', 'Biblias Personalizadas', 'Restauraciones', 'Papelería y Accesorios'],
  },
  remate: {
    nombre: 'Remate',
    href: '/remate',
    titulo: 'Remate',
    descripcion: 'Últimas unidades y productos seleccionados del inventario, hasta agotar stock.',
    imagen: '/oveja-portada.webp',
    alt: '',
    grupos: ['Artículos Oficina', 'Artesanías', 'Belleza', 'Hogar', 'Juguetería', 'Perfumería'],
  },
} as const;

export type Linea = keyof typeof LINEAS;
type ProductoDeLinea = Pick<Producto, 'category' | 'name'> & Partial<Pick<Producto, 'remate'>>;

export function normalizarBusqueda(texto: string) {
  return texto.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();
}

const categorias = {
  matera: ['mate', 'matera', 'yerbas', 'bombillas', 'accesorios materos'],
  cristiana: ['libreria cristiana', 'cristiana', 'biblias', 'papeleria', 'articulos oficina', 'articulos de oficina']
};

const papeleria = /\b(cuaderno|cuadernos|libreta|libretas|lapiz|lapices|boligrafo|marcador|marcadores|destacador|destacadores|separador|separadores|senaladores|notas|notitas|goma|clip|clips|tijera|pizarra|planificador|corcheteras|sticker|estuche|kit oficina|lapicero|cinta adhesiva)\b/;

const yerbaMate = /^(yerbas?|buenas y santas|cbse|mananita|mateando|verdeflor|dona javiera|playadito|pipore|cruz de malta|rosamonte|rei verde|sara|kurupi|la merced|baldo|esmeralda|canarias|taragui)\b|\bmate cocido\b/;

export function categoriaDefinida(categoria: string) {
  const buscada = normalizarBusqueda(categoria);
  for (const linea of ['matera', 'cristiana', 'remate'] as const) {
    const grupo = LINEAS[linea].grupos.find((opcion) => normalizarBusqueda(opcion) === buscada);
    if (grupo) return { linea, grupo };
  }
  return null;
}

export function lineaProducto(producto: ProductoDeLinea): Linea | null {
  if (producto.remate) return 'remate';
  const definida = categoriaDefinida(producto.category);
  if (definida && definida.linea !== 'remate') return definida.linea;
  const categoria = normalizarBusqueda(producto.category);
  const nombre = normalizarBusqueda(producto.name);
  if ((categoria === 'articulos oficina' || categoria === 'articulos de oficina') && /\bmate cocido\b/.test(nombre)) return 'matera';
  if (categorias.matera.includes(categoria)) return 'matera';
  if (categorias.cristiana.includes(categoria)) return 'cristiana';
  if (categoria !== 'hogar') return null;
  if (/\b(yerba|yerbero|matero|bombilla|decant)\b/.test(nombre)) return 'matera';
  if (/\b(biblia|biblico|himnario|pan de vida|restauracion)\b/.test(nombre) || papeleria.test(nombre)) return 'cristiana';
  return null;
}

export function grupoProducto(producto: ProductoDeLinea, linea: Linea) {
  const definida = categoriaDefinida(producto.category);
  if (definida?.linea === linea) return definida.grupo;
  const nombre = normalizarBusqueda(producto.name);
  const categoria = normalizarBusqueda(producto.category);
  if (linea === 'remate') {
    if (categoria === 'perfumes') return 'Perfumería';
    if (categoria === 'articulos de oficina') return 'Artículos Oficina';
    return 'Hogar';
  }
  if (linea === 'matera') {
    if (/\bdecants?\b/.test(nombre)) return 'Decant';
    if (yerbaMate.test(nombre) || categoria === 'yerbas') return 'Yerbas Mate';
    if (/^(mate|matero)\b/.test(nombre)) return 'Mates';
    return 'Accesorios';
  }
  if (/\brestauraciones?\b/.test(nombre) || /\brestauracion\b/.test(nombre)) return 'Restauraciones';
  if (/^biblias?\b/.test(nombre) && /\bpersonalizad[ao]s?\b/.test(nombre)) return 'Biblias Personalizadas';
  if (!papeleria.test(nombre) && /^biblias?\b/.test(nombre)) return 'Biblias';
  return 'Papelería y Accesorios';
}
