export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SESSION_COOKIE_NAME, CSRF_COOKIE_NAME, verifyCsrfToken } from '@/lib/auth';

function verifyCsrfFromRequest(req: NextRequest): boolean {
  const cookie = cookies().get(CSRF_COOKIE_NAME)?.value;
  const header = req.headers.get('x-csrf-token');
  if (!cookie || !header) return false;
  return verifyCsrfToken(header) && header === cookie;
}

export async function POST(req: NextRequest) {
  if (!verifyCsrfFromRequest(req)) {
    return NextResponse.json({ error: 'Token CSRF inválido' }, { status: 403 });
  }
  cookies().delete(SESSION_COOKIE_NAME);
  cookies().delete(CSRF_COOKIE_NAME);
  return NextResponse.json({ ok: true });
}