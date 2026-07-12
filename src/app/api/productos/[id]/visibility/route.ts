export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { setVisibilidad } from '@/lib/db';
import { verifySessionToken, SESSION_COOKIE_NAME } from '@/lib/auth';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const token = cookies().get(SESSION_COOKIE_NAME)?.value;
  if (!verifySessionToken(token)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  try {
    const { visible } = await req.json();
    if (typeof visible !== 'boolean') {
      return NextResponse.json({ error: 'visible debe ser boolean' }, { status: 400 });
    }
    const producto = await setVisibilidad(parseInt(params.id, 10), visible);
    if (!producto) return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
    revalidatePath('/', 'layout');
    revalidatePath('/catalogo');
    revalidatePath(`/producto/${params.id}`, 'page');
    return NextResponse.json(producto);
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Error desconocido' }, { status: 500 });
  }
}
