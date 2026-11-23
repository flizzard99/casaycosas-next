import type { Producto } from './types';

export const LINEAS = {
  matera: {
    nombre: 'Matera',
    href: '/matera',
    titulo: 'El ritual del mate',
    descripcion: 'Yerbas, Mate, Bombillas y Accesorios para preparar y compartir un buen mate.',
    imagen: '/matera-algarrobo.webp',
    alt: 'Mate de algarrobo con bombilla',
    grupos: ['Yerbas Mate', 'Mates', 'Decant', 'Accesorios'],
  },
  cristiana: {
    nombre: 'Cristiana',
    href: '/cristiana',
    titulo: 'La Palabra, cerca de ti',
    descripcion: 'Biblias, Restauraciones y Accesorios para regalar o buscar tu intimidad con Dios',
    imagen: '/cristiana-biblia.webp',
    alt: 'Biblia con una oveja en la portada',
    grupos: ['Biblias', 'Biblias Personalizadas', 'Restauraciones', 'Papelería y Accesorios'],
  },
  remate: {
    nombre: 'Casa y Cosas',
    href: '/remate',
    titulo: 'Sección Casa y Cosas',
    descripcion: 'Aquí encontrarás diferentes detalles para regalar y para tu Hogar',
    imagen: '/oveja-portada.webp',
    alt: '',
    grupos: ['Artículos Oficina', 'Artesanías', 'Belleza', 'Hogar', 'Juguetería', 'Perfumería', 'Otros'],
  },
} as const;

export type Linea = keyof typeof LINEAS;
type ProductoDeLinea = Pick<Producto, 'category' | 'name'> & Partial<Pick<Producto, 'remate'>>;

export const SUBCATEGORIAS_SUGERIDAS: Record<string, readonly string[]> = {
  'Yerbas Mate': ['Tradicionales', 'Premium', 'Suaves', 'Compuestas', 'Saborizadas'],
  'Mates': ['Calabaza', 'Madera y Algarrobo', 'Acero inoxidable', 'Cerámica', 'Vidrio', 'Plástico y Autocebantes'],
  'Decant': ['Acero inoxidable', 'Vidrio', 'Plástico', 'Repuestos'],
  'Accesorios': ['Bombillas', 'Termos', 'Yerberos', 'Limpieza y cuidado', 'Repuestos'],
  'Biblias': ['Biblias de estudio', 'Devocionales', 'Letra grande', 'Juveniles', 'Infantiles'],
  'Biblias Personalizadas': ['Mujer', 'Hombre', 'Juveniles', 'Infantiles'],
  'Restauraciones': ['Restauración completa', 'Encuadernación', 'Reparación'],
  'Papelería y Accesorios': ['Cuadernos y libretas', 'Separadores', 'Escritura', 'Regalos']
};

export function normalizarBusqueda(texto: string) {
  return texto.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();
}

const categorias = {
  matera: ['mate', 'matera', 'yerbas', 'bombillas', 'accesorios materos'],
  cristiana: ['libreria cristiana', 'cristiana', 'biblias', 'papeleria']
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

export function lineaProducto(producto: ProductoDeLinea): Linea {
  if (producto.remate) return 'remate';
  const definida = categoriaDefinida(producto.category);
  if (definida && definida.linea !== 'remate') return definida.linea;
  const categoria = normalizarBusqueda(producto.category);
  const nombre = normalizarBusqueda(producto.name);
  if (categorias.matera.includes(categoria)) return 'matera';
  if (categorias.cristiana.includes(categoria)) return 'cristiana';
  if (['hogar', 'articulos oficina', 'articulos de oficina'].includes(categoria)) {
    if (yerbaMate.test(nombre) || /\b(yerbero|matero|bombilla|decant)\b/.test(nombre)) return 'matera';
    if (/\b(biblia|biblico|himnario|pan de vida|restauracion)\b/.test(nombre) || papeleria.test(nombre)) return 'cristiana';
  }
  return 'remate';
}

export function grupoProducto(producto: ProductoDeLinea, linea: Linea) {
  const definida = categoriaDefinida(producto.category);
  if (definida?.linea === linea) return definida.grupo;
  const nombre = normalizarBusqueda(producto.name);
  const categoria = normalizarBusqueda(producto.category);
  if (linea === 'remate') {
    if (categoria === 'perfumes') return 'Perfumería';
    if (categoria === 'articulos de oficina') return 'Artículos Oficina';
    return 'Otros';
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
