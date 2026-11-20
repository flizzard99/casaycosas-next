import { lineaProducto, type Linea } from './lineas';
import type { Config, Producto } from './types';

export const MAX_DESTACADOS = 4;
export const TITULO_DESTACADOS = 'Productos más vendidos';

export function destacadosDeLinea(config: Pick<Config, 'featured' | 'featuredByLine'>, linea: Linea, productos: Producto[]) {
  const seleccion = config.featuredByLine[linea] ?? config.featured;
  const disponibles = new Map(productos.filter((producto) => producto.visible && lineaProducto(producto) === linea)
    .map((producto) => [producto.id, producto]));
  return {
    title: seleccion.title,
    productos: seleccion.productIds.flatMap((id) => {
      const producto = disponibles.get(id);
      return producto ? [producto] : [];
    })
  };
}
