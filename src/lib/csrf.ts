import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { timingSafeEqual } from 'crypto';
import { CSRF_COOKIE_NAME, verifyCsrfToken } from './auth';

export function verifyCsrf(req: NextRequest): boolean {
  const cookie = cookies().get(CSRF_COOKIE_NAME)?.value;
  const header = req.headers.get('x-csrf-token');
  if (!cookie || !header) return false;
  if (!verifyCsrfToken(header)) return false;
  const a = Buffer.from(header);
  const b = Buffer.from(cookie);
  return a.length === b.length && timingSafeEqual(a, b);
}