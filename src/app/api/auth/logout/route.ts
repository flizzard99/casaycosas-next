export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SESSION_COOKIE_NAME, CSRF_COOKIE_NAME, verifyCsrfToken } from '@/lib/auth';

async function verifyCsrfFromRequest(req: NextRequest): Promise<boolean> {
  const cookie = (await cookies()).get(CSRF_COOKIE_NAME)?.value;
  const header = req.headers.get('x-csrf-token');
  if (!cookie || !header) return false;
  return verifyCsrfToken(header) && header === cookie;
}

export async function POST(req: NextRequest) {
  if (!(await verifyCsrfFromRequest(req))) {
    return NextResponse.json({ error: 'Token CSRF inválido' }, { status: 403 });
  }
  (await cookies()).delete(SESSION_COOKIE_NAME);
  (await cookies()).delete(CSRF_COOKIE_NAME);
  return NextResponse.json({ ok: true });
}