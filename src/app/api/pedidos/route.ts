export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getPedidosPendientes } from '@/lib/db';
import { verifySessionToken, SESSION_COOKIE_NAME } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  if (!verifySessionToken(token)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  try {
    const pedidos = await getPedidosPendientes();
    return NextResponse.json(pedidos);
  } catch (e: unknown) {
    console.error('[API Error] getPedidos:', e);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}