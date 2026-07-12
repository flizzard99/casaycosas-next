export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { eliminarImagen } from '@/lib/db';
import { verifySessionToken, SESSION_COOKIE_NAME } from '@/lib/auth';

export async function DELETE(_req: NextRequest, { params }: { params: { id: string; index: string } }) {
  const token = cookies().get(SESSION_COOKIE_NAME)?.value;
  if (!verifySessionToken(token)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  try {
    const idx = parseInt(params.index, 10);
    if (isNaN(idx) || idx < 0) return NextResponse.json({ error: 'Índice inválido' }, { status: 400 });
    const producto = await eliminarImagen(parseInt(params.id, 10), idx);
    if (!producto) return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
    revalidatePath(`/producto/${params.id}`, 'page');
    return NextResponse.json(producto);
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Error desconocido' }, { status: 500 });
  }
}
