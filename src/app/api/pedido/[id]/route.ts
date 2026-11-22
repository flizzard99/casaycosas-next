export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getPedidoPublico } from '@/lib/db';
import { ORDER_ACCESS_COOKIE_NAME, verifyOrderAccessToken } from '@/lib/auth';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const codigo = decodeURIComponent((await params).id).toUpperCase();
    const accesoAutorizado = verifyOrderAccessToken(req.cookies.get(ORDER_ACCESS_COOKIE_NAME)?.value, codigo);
    const pedido = await getPedidoPublico(codigo, req.nextUrl.searchParams.get('ref') ?? undefined, accesoAutorizado);
    if (!pedido) return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });
    return NextResponse.json(pedido, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (e: unknown) {
    console.error('[API Error] pedido/id:', e);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
