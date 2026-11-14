export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getPedidoByIdPublic, parseIdOrBadRequest, PEDIDO_EXPIRACION_MS } from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const id = parseIdOrBadRequest((await params).id);
    if (id === null) return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    const pedido = await getPedidoByIdPublic(id, req.nextUrl.searchParams.get('token') || '');
    if (!pedido) return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });
    const createdMs = new Date(pedido.created_at).getTime();
    const expiracionAt = createdMs + PEDIDO_EXPIRACION_MS;
    return NextResponse.json({ ...pedido, cliente_email: undefined, cliente_whatsapp: undefined, tracking_token: undefined, expiracionAt }, { headers: { 'Cache-Control': 'private, no-store', 'Referrer-Policy': 'no-referrer' } });
  } catch (e: unknown) {
    console.error('[API Error] pedido/id:', e);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}