export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getPedidoPublico, registrarPagoMercadoPago, resumenPublicoPedido } from '@/lib/db';
import { ORDER_ACCESS_COOKIE_NAME, verifyOrderAccessToken } from '@/lib/auth';
import { checkAdminRateLimit } from '@/lib/adminRateLimit';
import { rutaSeguimiento } from '@/lib/checkout';
import { enviarEmailCambioEstado } from '@/lib/email';
import { esReferenciaDeCompra, origenCheckout, verificarPagoMercadoPago } from '@/lib/mercadoPago';

const noCache = { 'Cache-Control': 'private, no-store' };

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const codigo = decodeURIComponent((await params).id).toUpperCase();
    const accesoAutorizado = verifyOrderAccessToken(req.cookies.get(ORDER_ACCESS_COOKIE_NAME)?.value, codigo);
    const pedido = await getPedidoPublico(codigo, req.nextUrl.searchParams.get('ref') ?? undefined, accesoAutorizado);
    if (!pedido) return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });
    return NextResponse.json(pedido, { headers: noCache });
  } catch (e: unknown) {
    console.error('[API Error] pedido/id:', e);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!req.headers.get('content-type')?.startsWith('application/json')) {
    return new NextResponse(null, { status: 415 });
  }
  if (!checkAdminRateLimit(req, 8, 60_000)) return new NextResponse(null, { status: 429 });

  const { referencia, pagoId } = await req.json().catch(() => null) ?? {};
  if (!esReferenciaDeCompra(referencia) || typeof pagoId !== 'string' || !/^\d{1,30}$/.test(pagoId)) {
    return new NextResponse(null, { status: 400 });
  }

  try {
    const codigo = (await params).id.toUpperCase();
    const pedido = await getPedidoPublico(codigo, referencia);
    if (!pedido || pedido.metodo_pago !== 'tarjeta') return new NextResponse(null, { status: 404 });
    if (pedido.pago_estado === 'aprobado' || pedido.pago_estado === 'revision') {
      return NextResponse.json({ pedido, reintentarPago: false }, { headers: noCache });
    }

    const origen = origenCheckout();
    if (!origen) return new NextResponse(null, { status: 503 });
    const pago = await verificarPagoMercadoPago(pagoId);
    if (!pago || pago.referencia !== referencia) return new NextResponse(null, { status: 409 });

    const confirmado = await registrarPagoMercadoPago(pago, pedido.codigo);
    if (confirmado) {
      await enviarEmailCambioEstado(confirmado, origen + rutaSeguimiento(confirmado.codigo_publico, referencia));
    }
    const actualizado = confirmado ? resumenPublicoPedido(confirmado) : await getPedidoPublico(codigo, referencia);
    if (!actualizado) return new NextResponse(null, { status: 404 });

    const reintentarPago = actualizado.estado === 'pendiente' && actualizado.pago_estado === 'pendiente' &&
      pago.estado === 'rejected' && pago.moneda === 'CLP' && pago.total === actualizado.total;
    return NextResponse.json({ pedido: actualizado, reintentarPago }, { headers: noCache });
  } catch {
    console.error('[retorno Mercado Pago] No se pudo verificar el pago.');
    return new NextResponse(null, { status: 502 });
  }
}
