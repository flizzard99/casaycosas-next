export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { cancelarPedido, parseIdOrBadRequest } from '@/lib/db';
import { verifySessionToken, SESSION_COOKIE_NAME } from '@/lib/auth';
import { verifyCsrf } from '@/lib/csrf';
import { checkAdminRateLimit } from '@/lib/adminRateLimit';
import { enviarEmailCambioEstado } from '@/lib/email';
import { rutaSeguimiento } from '@/lib/checkout';
import { origenTienda } from '@/lib/origenTienda';
import { revalidatePath } from 'next/cache';
import { revalidarCatalogo } from '@/lib/revalidarCatalogo';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!checkAdminRateLimit(req)) return NextResponse.json({ error: 'Demasiadas solicitudes' }, { status: 429 });
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!verifySessionToken(token) || !verifyCsrf(req)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  try {
    const id = parseIdOrBadRequest((await params).id);
    if (id === null) return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    const pedido = await cancelarPedido(id);
    if (!pedido) return NextResponse.json({ error: 'Pedido no encontrado o ya procesado' }, { status: 404 });
    for (const id of new Set(pedido.items.map((item) => item.producto_id))) revalidatePath(`/producto/${id}`);
    revalidarCatalogo();
    const origen = origenTienda();
    if (origen) await enviarEmailCambioEstado(pedido, origen + rutaSeguimiento(pedido.codigo_publico, pedido.pago_referencia));
    return NextResponse.json(pedido);
  } catch (e: unknown) {
    console.error('[API Error] cancelar:', e);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
