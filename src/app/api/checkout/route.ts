import { esVarianteId } from '@/lib/validarInventario';
import { revalidatePath } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';
import { checkAdminRateLimit } from '@/lib/adminRateLimit';
import { crearPedido, getDatosTransferencia, obtenerEnlaceDePago } from '@/lib/db';
import { crearPreferencia, esReferenciaDeCompra, origenCheckout } from '@/lib/mercadoPago';
import { normalizarRut, rutaSeguimiento } from '@/lib/checkout';
import { origenTienda } from '@/lib/origenTienda';
import { revalidarCatalogo } from '@/lib/revalidarCatalogo';
import { validarDestinoChile } from '@/lib/geografiaChile';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function texto(valor: unknown, maximo: number) {
  return typeof valor === 'string' && valor.trim().length <= maximo ? valor.trim() : '';
}

export async function POST(req: NextRequest) {
  const origenSolicitud = req.headers.get('origin');
  if (origenSolicitud && origenSolicitud !== req.nextUrl.origin && origenSolicitud !== origenTienda()) {
    return NextResponse.json({ error: 'Solicitud no válida.' }, { status: 403 });
  }
  if (!req.headers.get('content-type')?.startsWith('application/json')) {
    return NextResponse.json({ error: 'Formato de solicitud inválido.' }, { status: 415 });
  }
  if (!checkAdminRateLimit(req, 15)) return NextResponse.json({ error: 'Demasiados intentos. Vuelve a intentar en un minuto.' }, { status: 429 });
  const body = await req.json().catch(() => null);
  const metodo = body?.metodoPago;
  if (metodo !== 'tarjeta' && metodo !== 'transferencia') {
    return NextResponse.json({ error: 'Selecciona cómo quieres pagar.' }, { status: 400 });
  }
  const origen = metodo === 'tarjeta' ? origenCheckout() : null;
  if (metodo === 'tarjeta' && !origen) {
    return NextResponse.json({ error: 'El pago con tarjeta todavía no está disponible.' }, { status: 503 });
  }
  const nombre = texto(body?.nombre, 100);
  const email = texto(body?.email, 200);
  const telefono = texto(body?.telefono, 20);
  const destino = validarDestinoChile(texto(body?.region, 100), texto(body?.comuna, 100));
  const direccion = texto(body?.direccion, 250);
  const rut = normalizarRut(body?.rut);
  const nota = texto(body?.nota, 500);

  if (!esReferenciaDeCompra(body?.referencia) || !nombre || !/^\S+@[^\s@]+\.[^\s@]+$/.test(email) ||
      !/^\+?[0-9 ()-]{8,19}$/.test(telefono) || !direccion) {
    return NextResponse.json({ error: 'Revisa los datos de contacto y despacho.' }, { status: 400 });
  }
  if (!destino) {
    return NextResponse.json({ error: 'Selecciona una comuna que pertenezca a la región de despacho.' }, { status: 400 });
  }
  if (!rut) return NextResponse.json({ error: 'Ingresa un RUT chileno válido.' }, { status: 400 });
  if (body?.nota !== undefined && (typeof body.nota !== 'string' || body.nota.trim().length > 500)) {
    return NextResponse.json({ error: 'La nota admite hasta 500 caracteres.' }, { status: 400 });
  }
  const items = body.items;
  if (!Array.isArray(items) || !items.length || items.length > 50 ||
      items.some((item) => !Number.isInteger(item?.id) || item.id < 1 || item.id > 2147483647 ||
        !Number.isInteger(item?.qty) || item.qty < 1 || item.qty > 999 ||
        (item.varianteId !== undefined && !esVarianteId(item.varianteId))) ||
      new Set(items.map((item) => `${item.id}:${item.varianteId ?? ''}`)).size !== items.length ||
      !Number.isInteger(body.total) || body.total < 1 || body.total > 2147483647) {
    return NextResponse.json({ error: 'Revisa los productos del carrito.' }, { status: 400 });
  }

  const referencia = body.referencia;
  try {
    const transferencia = metodo === 'transferencia' ? await getDatosTransferencia() : null;
    if (metodo === 'transferencia' && !transferencia) {
      return NextResponse.json({ error: 'El pago por transferencia todavía no está disponible.' }, { status: 503 });
    }
    const datosPago = transferencia ? { metodo: 'transferencia' as const, transferencia } : { metodo: 'tarjeta' as const, transferencia: null };
    const pedido = await crearPedido(items, nombre, telefono, email, {
      ...datosPago, referencia, rut, despacho: { ...destino, direccion, ...(nota && { nota }) }, totalEsperado: body.total
    });
    for (const id of new Set(pedido.items.map((item) => item.producto_id))) revalidatePath(`/producto/${id}`);
    revalidarCatalogo();
    const seguimiento = rutaSeguimiento(pedido.id, referencia);
    const url = origen ? await obtenerEnlaceDePago(pedido, referencia, () => crearPreferencia(pedido, referencia, origen)) : null;
    return NextResponse.json({ url, seguimiento }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    const detalle = error instanceof Error ? error.message : '';
    if (/^(Stock insuficiente|Producto \d+ no encontrado|El precio de los productos cambió|La sesión de pago corresponde|Total de compra inválido|Selecciona una variante|El pedido fue eliminado)/.test(detalle)) {
      return NextResponse.json({ error: detalle }, { status: 409 });
    }
    console.error('[checkout]', error);
    return NextResponse.json({ error: 'No pudimos continuar con el pedido. Puedes volver a intentarlo.' }, { status: 502 });
  }
}
