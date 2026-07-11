export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { checkPassword, createSessionToken, SESSION_COOKIE_NAME } from '@/lib/auth';

// Limita intentos de login por IP (protección simple contra fuerza bruta)
const intentos = new Map<string, { count: number; resetAt: number }>();
const MAX_INTENTOS = 8;
const VENTANA_MS = 10 * 60 * 1000;

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') || 'unknown';
  const ahora = Date.now();
  const registro = intentos.get(ip);
  if (registro && registro.resetAt > ahora && registro.count >= MAX_INTENTOS) {
    return NextResponse.json(
      { error: 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.' },
      { status: 429 }
    );
  }

  if (!process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'ADMIN_PASSWORD no configurada en el servidor' }, { status: 500 });
  }

  const { password } = await req.json();
  if (!password || !checkPassword(password)) {
    const actual = registro && registro.resetAt > ahora ? registro.count + 1 : 1;
    intentos.set(ip, { count: actual, resetAt: ahora + VENTANA_MS });
    return NextResponse.json({ error: 'Contraseña incorrecta' }, { status: 401 });
  }

  intentos.delete(ip);
  const token = createSessionToken();
  cookies().set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 12 // 12 horas
  });
  return NextResponse.json({ ok: true });
}
