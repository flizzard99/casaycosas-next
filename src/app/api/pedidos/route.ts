export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getPedidosAdmin } from '@/lib/db';
import { verifySessionToken, SESSION_COOKIE_NAME } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!verifySessionToken(token)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  try {
    const estado = req.nextUrl.searchParams.get('estado');
    const estados = ['pendiente', 'confirmado', 'cancelado', 'expirado', 'revision', 'sin_revisar', 'papelera', 'archivo', 'todos'] as const;
    const filtro = estados.find((opcion) => opcion === estado) ?? 'pendiente';
    const pagina = Number(req.nextUrl.searchParams.get('pagina') ?? '1');
    if (!Number.isSafeInteger(pagina) || pagina < 1 || pagina > 100000) {
      return NextResponse.json({ error: 'Página inválida' }, { status: 400 });
    }
    const resultado = await getPedidosAdmin(filtro, pagina);
    return NextResponse.json(resultado, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (e: unknown) {
    console.error('[API Error] getPedidos:', e);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
