import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { CSRF_COOKIE_NAME, verifyCsrfToken } from './auth';

export function verifyCsrf(req: NextRequest): boolean {
  const cookie = cookies().get(CSRF_COOKIE_NAME)?.value;
  const header = req.headers.get('x-csrf-token');
  if (!cookie || !header) return false;
  return verifyCsrfToken(header) && header === cookie;
}