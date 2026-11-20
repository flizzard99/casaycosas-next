import { revalidatePath } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';
import { checkAdminRateLimit } from '@/lib/adminRateLimit';
import { SESSION_COOKIE_NAME, verifySessionToken } from '@/lib/auth';
import { verifyCsrf } from '@/lib/csrf';
import { eliminarPedido } from '@/lib/db';
import { revalidarCatalogo } from '@/lib/revalidarCatalogo';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!verifySessionToken(req.cookies.get(SESSION_COOKIE_NAME)?.value) || !verifyCsrf(req)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  if (!checkAdminRateLimit(req)) return NextResponse.json({ error: 'Demasiadas solicitudes' }, { status: 429 });
  const { id: valor } = await params;
  const id = Number(valor);
  if (!/^\d+$/.test(valor) || id < 1 || id > 2147483647) {
    return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
  }
  try {
    const resultado = await eliminarPedido(id);
    if (!resultado) return NextResponse.json({ error: 'Pedido no encontrado.' }, { status: 404 });
    for (const productoId of resultado.productosLiberados) revalidatePath(`/producto/${productoId}`);
    if (resultado.productosLiberados.length) revalidarCatalogo();
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[pedidos] eliminar:', error);
    return NextResponse.json({ error: 'No se pudo eliminar el pedido.' }, { status: 500 });
  }
}
