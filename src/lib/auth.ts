import { createHmac, timingSafeEqual } from 'crypto';

const SESSION_COOKIE = 'cyc_admin_session';
const SESSION_DURATION_MS = 1000 * 60 * 60 * 12; // 12 horas

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error('SESSION_SECRET no está configurada.');
  }
  return secret;
}

function sign(payload: string): string {
  return createHmac('sha256', getSecret()).update(payload).digest('hex');
}

/** Genera un token de sesión firmado: payload en base64 + firma HMAC */
export function createSessionToken(): string {
  const payload = JSON.stringify({ role: 'admin', exp: Date.now() + SESSION_DURATION_MS });
  const payloadB64 = Buffer.from(payload).toString('base64url');
  const signature = sign(payloadB64);
  return `${payloadB64}.${signature}`;
}

/** Verifica el token de sesión. Devuelve true si es válido y no ha expirado. */
export function verifySessionToken(token: string | undefined | null): boolean {
  if (!token) return false;
  const [payloadB64, signature] = token.split('.');
  if (!payloadB64 || !signature) return false;

  const expected = sign(payloadB64);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;

  try {
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString());
    return payload.role === 'admin' && payload.exp > Date.now();
  } catch {
    return false;
  }
}

export function checkPassword(password: string): boolean {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) return false;
  const a = createHmac('sha256', getSecret()).update(String(password)).digest();
  const b = createHmac('sha256', getSecret()).update(String(adminPassword)).digest();
  return timingSafeEqual(a, b);
}

const CSRF_COOKIE = 'cyc_admin_csrf';

export function createCsrfToken(): string {
  const payload = `${Date.now()}.${Math.random().toString(36).slice(2, 10)}`;
  const payloadB64 = Buffer.from(payload).toString('base64url');
  const signature = sign(payloadB64);
  return `${payloadB64}.${signature}`;
}

export function verifyCsrfToken(token: string | undefined | null): boolean {
  if (!token) return false;
  const [payloadB64, signature] = token.split('.');
  if (!payloadB64 || !signature) return false;
  const expected = sign(payloadB64);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export const CSRF_COOKIE_NAME = CSRF_COOKIE;

export const SESSION_COOKIE_NAME = SESSION_COOKIE;
