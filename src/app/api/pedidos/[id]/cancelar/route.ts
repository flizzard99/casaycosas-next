export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { cancelarPedido, parseIdOrBadRequest } from '@/lib/db';
import { verifySessionToken, SESSION_COOKIE_NAME } from '@/lib/auth';
import { verifyCsrf } from '@/lib/csrf';
import { checkAdminRateLimit } from '@/lib/adminRateLimit';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!checkAdminRateLimit(req)) return NextResponse.json({ error: 'Demasiadas solicitudes' }, { status: 429 });
  const token = cookies().get(SESSION_COOKIE_NAME)?.value;
  if (!verifySessionToken(token) || !verifyCsrf(req)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  try {
    const id = parseIdOrBadRequest(params.id);
    if (id === null) return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    const pedido = await cancelarPedido(id);
    if (!pedido) return NextResponse.json({ error: 'Pedido no encontrado o ya procesado' }, { status: 404 });
    return NextResponse.json(pedido);
  } catch (e: unknown) {
    console.error('[API Error] cancelar:', e);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}