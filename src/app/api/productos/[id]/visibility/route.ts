export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { setVisibilidad, parseIdOrBadRequest } from '@/lib/db';
import { verifySessionToken, SESSION_COOKIE_NAME } from '@/lib/auth';
import { verifyCsrf } from '@/lib/csrf';
import { checkAdminRateLimit } from '@/lib/adminRateLimit';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!checkAdminRateLimit(req)) return NextResponse.json({ error: 'Demasiadas solicitudes' }, { status: 429 });
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!verifySessionToken(token) || !verifyCsrf(req)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  try {
    const { visible } = await req.json();
    if (typeof visible !== 'boolean') {
      return NextResponse.json({ error: 'visible debe ser boolean' }, { status: 400 });
    }
    const id = parseIdOrBadRequest((await params).id);
    if (id === null) return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    const producto = await setVisibilidad(id, visible);
    if (!producto) return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
    revalidatePath('/', 'layout');
    revalidatePath('/catalogo');
    revalidatePath(`/producto/${id}`, 'page');
    return NextResponse.json(producto);
  } catch (e: unknown) {
    console.error('[API Error] visibility:', e);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
