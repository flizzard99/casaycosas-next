export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { checkAdminRateLimit } from '@/lib/adminRateLimit';
import { SESSION_COOKIE_NAME, verifySessionToken } from '@/lib/auth';
import { verifyCsrf } from '@/lib/csrf';
import { parseIdOrBadRequest, restaurarPedido } from '@/lib/db';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!checkAdminRateLimit(req)) return NextResponse.json({ error: 'Demasiadas solicitudes' }, { status: 429 });
  if (!verifySessionToken(req.cookies.get(SESSION_COOKIE_NAME)?.value) || !verifyCsrf(req)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  const id = parseIdOrBadRequest((await params).id);
  if (!id) return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
  try {
    const pedido = await restaurarPedido(id);
    if (!pedido) return NextResponse.json({ error: 'El pedido ya no está disponible en la papelera.' }, { status: 404 });
    return NextResponse.json(pedido);
  } catch (error) {
    console.error('[pedidos] restaurar:', error);
    return NextResponse.json({ error: 'No se pudo restaurar el pedido.' }, { status: 500 });
  }
}
