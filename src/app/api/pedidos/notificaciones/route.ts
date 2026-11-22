export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getNotificacionesPedidosAdmin } from '@/lib/db';
import { verifySessionToken, SESSION_COOKIE_NAME } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!verifySessionToken(token)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  const valor = req.nextUrl.searchParams.get('desde');
  const desde = valor ? new Date(valor) : new Date(Date.now() - 86400000);
  if (!Number.isFinite(desde.getTime()) || desde.getTime() > Date.now() + 60000 || desde.getTime() < Date.now() - 30 * 86400000) {
    return NextResponse.json({ error: 'Fecha inválida' }, { status: 400 });
  }
  try {
    const resultado = await getNotificacionesPedidosAdmin(desde);
    return NextResponse.json(resultado, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    console.error('[API Error] notificaciones pedidos:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
