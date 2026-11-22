import { NextRequest, NextResponse } from 'next/server';
import { autorizarSeguimientoPedido } from '@/lib/db';
import { checkAdminRateLimit } from '@/lib/adminRateLimit';
import { createOrderAccessToken, ORDER_ACCESS_COOKIE_NAME } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  if (!checkAdminRateLimit(req, 8, 10 * 60_000)) {
    return NextResponse.json({ error: 'Demasiados intentos. Espera unos minutos.' }, { status: 429 });
  }
  if (!req.headers.get('content-type')?.startsWith('application/json')) {
    return NextResponse.json({ error: 'Solicitud inválida.' }, { status: 415 });
  }
  const body = await req.json().catch(() => null);
  const codigo = typeof body?.codigo === 'string' ? body.codigo.trim().toUpperCase() : '';
  const email = typeof body?.email === 'string' ? body.email.trim() : '';
  try {
    if (!await autorizarSeguimientoPedido(codigo, email)) {
      return NextResponse.json({ error: 'No encontramos un pedido con ese código y correo.' }, { status: 404 });
    }
    const response = NextResponse.json({ url: `/mi-pedido/${encodeURIComponent(codigo)}` });
    response.cookies.set(ORDER_ACCESS_COOKIE_NAME, createOrderAccessToken(codigo), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30,
      path: '/'
    });
    return response;
  } catch (error) {
    console.error('[seguimiento]', error);
    return NextResponse.json({ error: 'No pudimos consultar el pedido.' }, { status: 500 });
  }
}
