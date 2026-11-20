import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE_NAME, verifySessionToken } from '@/lib/auth';
import { verifyCsrf } from '@/lib/csrf';
import { checkAdminRateLimit } from '@/lib/adminRateLimit';
import { despacharPedido, parseIdOrBadRequest } from '@/lib/db';

export const runtime = 'nodejs';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!checkAdminRateLimit(req)) return NextResponse.json({ error: 'Demasiadas solicitudes' }, { status: 429 });
  if (!verifySessionToken(req.cookies.get(SESSION_COOKIE_NAME)?.value) || !verifyCsrf(req)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  const id = parseIdOrBadRequest((await params).id);
  const body = await req.json().catch(() => null);
  if (!id || typeof body?.codigo !== 'string' || body.codigo.trim().length > 80) {
    return NextResponse.json({ error: 'Revisa el código de seguimiento.' }, { status: 400 });
  }
  try {
    const ok = await despacharPedido(id, body.codigo.trim());
    if (!ok) return NextResponse.json({ error: 'El pedido ya fue despachado o requiere confirmación.' }, { status: 409 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[despacho]', error);
    return NextResponse.json({ error: 'No se pudo guardar el despacho.' }, { status: 500 });
  }
}
