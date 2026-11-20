import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { COMPRA_EXPIRACION_MINUTOS, type Pedido } from './db';
import { ENVIO_CHILE, rutaSeguimiento } from './checkout';
import { origenTienda } from './origenTienda';

const REFERENCIA = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;

export function esReferenciaDeCompra(valor: unknown): valor is string {
  return typeof valor === 'string' && REFERENCIA.test(valor);
}

export function origenCheckout() {
  if (!process.env.MP_ACCESS_TOKEN || !process.env.MP_WEBHOOK_SECRET) return null;
  if (process.env.VERCEL_ENV === 'preview' && process.env.MP_SANDBOX !== 'true') return null;

  return origenTienda();
}

async function consultarMercadoPago(path: string, init?: RequestInit) {
  const res = await fetch(`https://api.mercadopago.com${path}`, {
    ...init,
    cache: 'no-store',
    signal: AbortSignal.timeout(8000),
    headers: {
      Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
      'Content-Type': 'application/json'
    }
  });
  if (!res.ok) throw new Error(`Mercado Pago respondió HTTP ${res.status}`);
  return res.json();
}

export async function crearPreferencia(pedido: Pedido, referencia: string, origen: string) {
  const seguimiento = origen + rutaSeguimiento(pedido.id, referencia);
  const expiracion = new Date(new Date(pedido.created_at).getTime() + (COMPRA_EXPIRACION_MINUTOS - 5) * 60000);
  if (expiracion.getTime() <= Date.now()) throw new Error('La sesión de pago ha expirado');

  const items = pedido.items.map((item) => ({
    id: item.variante_id ? `${item.producto_id}-${item.variante_id}` : String(item.producto_id),
    title: item.nombre,
    quantity: item.qty,
    unit_price: item.precio,
    currency_id: 'CLP'
  }));
  if (pedido.costo_envio) {
    items.push({ id: 'envio-blue-express', title: `Envío ${ENVIO_CHILE.servicio}`, quantity: 1, unit_price: pedido.costo_envio, currency_id: 'CLP' });
  }

  const resultado = await consultarMercadoPago('/checkout/preferences', {
    method: 'POST',
    body: JSON.stringify({
      items,
      external_reference: referencia,
      payer: { email: pedido.cliente_email },
      back_urls: { success: seguimiento, pending: seguimiento, failure: seguimiento },
      notification_url: `${origen}/api/pagos/mercadopago?source_news=webhooks`,
      auto_return: 'approved',
      expires: true,
      expiration_date_from: new Date(pedido.created_at).toISOString(),
      expiration_date_to: expiracion.toISOString(),
      payment_methods: {
        excluded_payment_types: ['ticket', 'bank_transfer', 'atm', 'account_money', 'digital_currency'].map((id) => ({ id }))
      }
    })
  });

  const url = new URL(process.env.MP_SANDBOX === 'true' ? resultado.sandbox_init_point : resultado.init_point);
  if (url.protocol !== 'https:' || !/(^|\.)mercadopago\.(cl|com)$/.test(url.hostname)) {
    throw new Error('Mercado Pago devolvió un enlace inválido');
  }
  return url.href;
}

export function verificarWebhookMercadoPago(req: Request, id: string) {
  const secreto = process.env.MP_WEBHOOK_SECRET;
  const requestId = req.headers.get('x-request-id');
  const firma = req.headers.get('x-signature');
  if (!secreto || !requestId || !firma) return false;

  const partes = new URLSearchParams(firma.replaceAll(',', '&').replaceAll(' ', ''));
  const ts = partes.get('ts') ?? '';
  const v1 = partes.get('v1') ?? '';
  if (!/^\d{10,13}$/.test(ts) || !/^[a-f0-9]{64}$/i.test(v1)) return false;

  const mensaje = `id:${id};request-id:${requestId};ts:${ts};`;
  const calculada = createHmac('sha256', secreto).update(mensaje).digest();
  return timingSafeEqual(calculada, Buffer.from(v1, 'hex'));
}

export async function verificarPagoMercadoPago(id: string) {
  const pago = await consultarMercadoPago(`/v1/payments/${id}`);
  const produccion = process.env.MP_SANDBOX !== 'true';
  if (String(pago.id) !== id || !esReferenciaDeCompra(pago.external_reference) || pago.live_mode !== produccion) {
    return null;
  }
  return {
    id,
    referencia: pago.external_reference as string,
    total: Number(pago.transaction_amount),
    moneda: String(pago.currency_id),
    estado: String(pago.status)
  };
}
