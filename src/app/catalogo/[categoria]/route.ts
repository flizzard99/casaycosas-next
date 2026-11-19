import { permanentRedirect } from 'next/navigation';
import { LINEAS, lineaProducto } from '@/lib/lineas';

export function GET(_request: Request, { params }: { params: { categoria: string } }) {
  let categoria = params.categoria;
  try {
    categoria = decodeURIComponent(categoria);
  } catch {
    // El parámetro puede contener un signo de porcentaje literal.
  }
  const linea = lineaProducto({ category: categoria, name: '' });
  permanentRedirect(linea ? LINEAS[linea].href : '/');
}
