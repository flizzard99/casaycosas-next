export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { eliminarImagen, parseIdOrBadRequest } from '@/lib/db';
import { verifySessionToken, SESSION_COOKIE_NAME } from '@/lib/auth';
import { verifyCsrf } from '@/lib/csrf';
import { checkAdminRateLimit } from '@/lib/adminRateLimit';

export async function DELETE(req: NextRequest, { params }: { params: { id: string; index: string } }) {
  if (!checkAdminRateLimit(req)) return NextResponse.json({ error: 'Demasiadas solicitudes' }, { status: 429 });
  const token = cookies().get(SESSION_COOKIE_NAME)?.value;
  if (!verifySessionToken(token) || !verifyCsrf(req)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  try {
    const idx = parseInt(params.index, 10);
    if (isNaN(idx) || idx < 0) return NextResponse.json({ error: 'Índice inválido' }, { status: 400 });
    const id = parseIdOrBadRequest(params.id);
    if (id === null) return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    const producto = await eliminarImagen(id, idx);
    if (!producto) return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
    revalidatePath(`/producto/${params.id}`, 'page');
    return NextResponse.json(producto);
  } catch (e: unknown) {
    console.error('[API Error] image delete:', e);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
