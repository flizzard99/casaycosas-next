import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ajustarStock } from '@/lib/db';
import { verifySessionToken, SESSION_COOKIE_NAME } from '@/lib/auth';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const token = cookies().get(SESSION_COOKIE_NAME)?.value;
  if (!verifySessionToken(token)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  try {
    const { delta } = await req.json();
    if (typeof delta !== 'number') {
      return NextResponse.json({ error: 'delta debe ser un número' }, { status: 400 });
    }
    const producto = await ajustarStock(parseInt(params.id, 10), delta);
    if (!producto) return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
    return NextResponse.json(producto);
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Error desconocido' }, { status: 500 });
  }
}
