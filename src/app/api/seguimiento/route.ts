import { createHmac } from 'node:crypto';
import { Redis } from '@upstash/redis';
import { NextRequest, NextResponse } from 'next/server';
import { autorizarSeguimientoPedido } from '@/lib/db';
import { checkAdminRateLimit } from '@/lib/adminRateLimit';
import { createOrderAccessToken, ORDER_ACCESS_COOKIE_NAME } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function permitirConsulta(req: NextRequest) {
  const limite = 8;
  const ventana = 600;
  if (!checkAdminRateLimit(req, limite, ventana * 1000)) return false;
  const { UPSTASH_REDIS_REST_URL: url, UPSTASH_REDIS_REST_TOKEN: token, SESSION_SECRET: secreto } = process.env;
  if (!url || !token || !secreto) return true;

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
  const huella = createHmac('sha256', secreto).update(ip).digest('hex');
  const intentos = await new Redis({ url, token }).eval<[number], number>(
    "local n = redis.call('INCR', KEYS[1]); if n == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end; return n",
    [`rl:seguimiento:${huella}`], [ventana]
  );
  return intentos <= limite;
}

export async function POST(req: NextRequest) {
  if (!req.headers.get('content-type')?.startsWith('application/json')) {
    return NextResponse.json({ error: 'Solicitud inválida.' }, { status: 415 });
  }
  const body = await req.json().catch(() => null);
  const codigo = typeof body?.codigo === 'string' ? body.codigo.trim().toUpperCase() : '';
  const email = typeof body?.email === 'string' ? body.email.trim() : '';
  try {
    if (!await permitirConsulta(req)) {
      return NextResponse.json({ error: 'Demasiados intentos. Espera unos minutos.' }, { status: 429 });
    }
    if (!await autorizarSeguimientoPedido(codigo, email)) {
      return NextResponse.json({ error: 'No encontramos un pedido con ese código y correo.' }, { status: 404 });
    }
    const response = NextResponse.json({ url: `/mi-pedido/${encodeURIComponent(codigo)}` }, {
      headers: { 'Cache-Control': 'private, no-store' }
    });
    response.cookies.set(ORDER_ACCESS_COOKIE_NAME, createOrderAccessToken(codigo), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30,
      path: '/'
    });
    return response;
  } catch {
    console.error('[seguimiento] No se pudo verificar el acceso al pedido.');
    return NextResponse.json({ error: 'No pudimos consultar el pedido.' }, { status: 500 });
  }
}
