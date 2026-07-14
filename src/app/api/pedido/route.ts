export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { crearPedido } from '@/lib/db';
import { tienda } from '@/lib/config';

const formatoCLP = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { items, nombre, whatsapp } = body || {};
    if (!Array.isArray(items) || !items.length) {
      return NextResponse.json({ error: 'El carrito está vacío' }, { status: 400 });
    }
    const itemsValidos = items
      .filter((i: { id: number; qty: number }) => Number.isFinite(i.id) && Number.isFinite(i.qty) && i.qty > 0)
      .map((i: { id: number; qty: number }) => ({ id: Math.floor(i.id), qty: Math.floor(i.qty) }));
    if (!itemsValidos.length) {
      return NextResponse.json({ error: 'items debe tener al menos un producto válido' }, { status: 400 });
    }

    const pedido = await crearPedido(itemsValidos, (nombre || '').slice(0, 100), (whatsapp || '').slice(0, 20));
    if (!pedido) {
      return NextResponse.json({ error: 'No se pudo crear el pedido' }, { status: 500 });
    }

    const lineas = pedido.items.map((i) => `• ${i.qty}x ${i.nombre} — ${formatoCLP.format(i.precio * i.qty)}`);
    const saludo = pedido.cliente_nombre
      ? `Hola! Soy ${pedido.cliente_nombre}, quisiera reservar este pedido para retiro en tienda:`
      : 'Hola! Quisiera reservar este pedido para retiro en tienda:';
    const mensaje = [saludo, '', ...lineas, '', `Total: ${formatoCLP.format(pedido.total)}`].join('\n');
    const waUrl = `https://wa.me/${tienda.whatsappNumber}?text=${encodeURIComponent(mensaje)}`;

    return NextResponse.json({ pedidoId: pedido.id, whatsappUrl: waUrl, mensaje });
  } catch (e: unknown) {
    console.error('[API Error] pedido:', e);
    const message = e instanceof Error ? e.message : 'Error interno del servidor';
    const status = message.includes('Stock insuficiente') ? 409 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}