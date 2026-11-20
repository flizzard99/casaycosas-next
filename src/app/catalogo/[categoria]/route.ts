import { permanentRedirect } from 'next/navigation';
import { LINEAS, lineaProducto } from '@/lib/lineas';

export async function GET(_request: Request, { params }: { params: Promise<{ categoria: string }> }) {
  let { categoria } = await params;
  try {
    categoria = decodeURIComponent(categoria);
  } catch {
    // El parámetro puede contener un signo de porcentaje literal.
  }
  const linea = lineaProducto({ category: categoria, name: '' });
  permanentRedirect(LINEAS[linea].href);
}
