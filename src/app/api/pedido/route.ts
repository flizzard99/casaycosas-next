export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { crearPedido, PEDIDO_EXPIRACION_MS } from '@/lib/db';
import { tienda } from '@/lib/config';
import { enviarEmailPedidoCreado } from '@/lib/email';
import { validarPedido } from '@/lib/validacionPedido';
import { revalidatePath } from 'next/cache';

const formatoCLP = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });

export async function POST(req: NextRequest) {
  try {
    let body: unknown;
    try { body = await req.json(); } catch {
      return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
    }
    const validacion = validarPedido(body);
    if ('error' in validacion) return NextResponse.json({ error: validacion.error }, { status: 400 });
    const { items, nombre, whatsapp, email } = validacion;
    if (!process.env.DATABASE_URL) return NextResponse.json({ error: 'Las reservas no están disponibles temporalmente. Contáctanos por WhatsApp.' }, { status: 503 });
    const pedido = await crearPedido(items, nombre, whatsapp, email);
    if (!pedido) {
      return NextResponse.json({ error: 'No se pudo crear el pedido' }, { status: 500 });
    }

    const lineas = pedido.items.map((i) => `• ${i.qty}x ${i.nombre} — ${formatoCLP.format(i.precio * i.qty)}`);
    const saludo = pedido.cliente_nombre
      ? `Hola! Soy ${pedido.cliente_nombre}, quisiera reservar este pedido para retiro en tienda:`
      : 'Hola! Quisiera reservar este pedido para retiro en tienda:';
    const mensaje = [saludo, '', ...lineas, '', `Total: ${formatoCLP.format(pedido.total)}`].join('\n');
    const waUrl = `https://wa.me/${tienda.whatsappNumber}?text=${encodeURIComponent(mensaje)}`;

    const estadoUrl = `${tienda.siteUrl}/pedido/${pedido.id}?token=${pedido.tracking_token}`;
    revalidatePath('/', 'layout');

    await enviarEmailPedidoCreado(pedido, estadoUrl).catch((e) => console.error('[email]pedido-creado:', e));

    return NextResponse.json({
      pedidoId: pedido.id,
      whatsappUrl: waUrl,
      estadoUrl,
      mensaje,
      expiracionMs: PEDIDO_EXPIRACION_MS
    });
  } catch (e: unknown) {
    console.error('[API Error] pedido:', e);
    const message = e instanceof Error ? e.message : 'Error interno del servidor';
    const status = message.includes('Stock insuficiente') || message.includes('no encontrado') ? 409 : 500;
    return NextResponse.json({ error: status === 409 ? message : 'No pudimos reservar el pedido. Inténtalo nuevamente o contáctanos por WhatsApp.' }, { status });
  }
}