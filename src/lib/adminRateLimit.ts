import { NextRequest } from 'next/server';

const hits = new Map<string, { count: number; resetAt: number }>();

const CLEANUP_INTERVAL = 60_000;
let lastCleanup = Date.now();

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;
  for (const [key, val] of hits) {
    if (val.resetAt <= now) hits.delete(key);
  }
}

export function checkAdminRateLimit(
  req: NextRequest,
  maxRequests = 60,
  windowMs = 60_000
): boolean {
  cleanup();
  const forwarded = req.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown';
  const key = `${req.method}:${req.nextUrl.pathname}:${ip}`;
  const now = Date.now();
  const entry = hits.get(key);
  if (!entry || entry.resetAt <= now) {
    hits.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  entry.count++;
  return entry.count <= maxRequests;
}
