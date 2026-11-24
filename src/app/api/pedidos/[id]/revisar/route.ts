export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { checkAdminRateLimit } from '@/lib/adminRateLimit';
import { SESSION_COOKIE_NAME, verifySessionToken } from '@/lib/auth';
import { verifyCsrf } from '@/lib/csrf';
import { marcarPedidoRevisado, parseIdOrBadRequest } from '@/lib/db';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!checkAdminRateLimit(req)) return NextResponse.json({ error: 'Demasiadas solicitudes' }, { status: 429 });
  if (!verifySessionToken(req.cookies.get(SESSION_COOKIE_NAME)?.value) || !verifyCsrf(req)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  const id = parseIdOrBadRequest((await params).id);
  if (!id) return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
  try {
    const pedido = await marcarPedidoRevisado(id);
    if (!pedido) return NextResponse.json({ error: 'Pedido no encontrado.' }, { status: 404 });
    return NextResponse.json(pedido);
  } catch (error) {
    console.error('[pedidos] revisar:', error);
    return NextResponse.json({ error: 'No se pudo marcar el pedido como revisado.' }, { status: 500 });
  }
}
