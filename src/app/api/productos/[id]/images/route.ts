export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { agregarImagenes } from '@/lib/db';
import { verifySessionToken, SESSION_COOKIE_NAME } from '@/lib/auth';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const token = cookies().get(SESSION_COOKIE_NAME)?.value;
  if (!verifySessionToken(token)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  try {
    const { images } = await req.json();
    if (!Array.isArray(images) || !images.length) {
      return NextResponse.json({ error: 'images debe ser un array no vacío' }, { status: 400 });
    }
    const producto = await agregarImagenes(parseInt(params.id, 10), images);
    if (!producto) return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
    revalidatePath(`/producto/${params.id}`, 'page');
    return NextResponse.json(producto);
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Error desconocido' }, { status: 500 });
  }
}
