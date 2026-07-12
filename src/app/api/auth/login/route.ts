export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { Redis } from '@upstash/redis';
import {
  checkPassword,
  createSessionToken,
  createCsrfToken,
  SESSION_COOKIE_NAME,
  CSRF_COOKIE_NAME
} from '@/lib/auth';

const MAX_INTENTOS = 5;
const VENTANA_SEG = 15 * 60;

function getRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

async function checkRateLimit(ip: string): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return true;
  try {
    const key = `rl:login:${ip}`;
    const count = await redis.incr(key);
    if (count === 1) await redis.expire(key, VENTANA_SEG);
    return count <= MAX_INTENTOS;
  } catch {
    return true;
  }
}

async function registerFailedAttempt(ip: string) {
  const redis = getRedis();
  if (!redis) return;
  try {
    const key = `rl:login:${ip}`;
    await redis.incr(key);
    await redis.expire(key, VENTANA_SEG);
  } catch {
    // no-op
  }
}

async function clearAttempts(ip: string) {
  const redis = getRedis();
  if (!redis) return;
  try {
    await redis.del(`rl:login:${ip}`);
  } catch {
    // no-op
  }
}

function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return 'unknown';
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);

  const permitido = await checkRateLimit(ip);
  if (!permitido) {
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
    await registerFailedAttempt(ip);
    return NextResponse.json({ error: 'Contraseña incorrecta' }, { status: 401 });
  }

  await clearAttempts(ip);
  const token = createSessionToken();
  const csrf = createCsrfToken();
  const cookieOpts = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    path: '/',
    maxAge: 60 * 60 * 12
  };
  cookies().set(SESSION_COOKIE_NAME, token, cookieOpts);
  cookies().set(CSRF_COOKIE_NAME, csrf, {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    path: '/',
    maxAge: 60 * 60 * 12
  });
  return NextResponse.json({ ok: true });
}