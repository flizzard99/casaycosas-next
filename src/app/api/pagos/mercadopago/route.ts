import { NextRequest, NextResponse } from 'next/server';
import { registrarPagoMercadoPago } from '@/lib/db';
import { enviarEmailCambioEstado } from '@/lib/email';
import { origenCheckout, verificarPagoMercadoPago, verificarWebhookMercadoPago } from '@/lib/mercadoPago';
import { rutaSeguimiento } from '@/lib/checkout';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const origen = origenCheckout();
  if (!origen) return new NextResponse(null, { status: 503 });

  const id = req.nextUrl.searchParams.get('data.id');
  if (!id || !/^\d{1,30}$/.test(id) || !verificarWebhookMercadoPago(req, id)) {
    return new NextResponse(null, { status: 401 });
  }
  const tipo = req.nextUrl.searchParams.get('type');
  if (tipo && tipo !== 'payment') return new NextResponse(null, { status: 204 });

  try {
    const pago = await verificarPagoMercadoPago(id);
    if (!pago) return new NextResponse(null, { status: 204 });

    const pedido = await registrarPagoMercadoPago(pago);
    if (pedido) await enviarEmailCambioEstado(pedido, origen + rutaSeguimiento(pedido.id, pago.referencia));
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('[webhook Mercado Pago]', error);
    return new NextResponse(null, { status: 502 });
  }
}
