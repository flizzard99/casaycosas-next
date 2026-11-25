import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { COMPRA_EXPIRACION_MINUTOS, type Pedido } from './db';
import { ENVIO_CHILE, rutaSeguimiento } from './checkout';
import { origenTienda } from './origenTienda';

const REFERENCIA = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;

export class MercadoPagoError extends Error {
  constructor(public codigo: string, public mensajePublico: string, detalle?: string) {
    super(detalle || mensajePublico);
    this.name = 'MercadoPagoError';
  }
}

export function estadoConfiguracionMercadoPago() {
  const token = process.env.MP_ACCESS_TOKEN?.trim() ?? '';
  const webhook = process.env.MP_WEBHOOK_SECRET?.trim() ?? '';
  const sandbox = process.env.MP_SANDBOX === 'true';
  if (!token || !webhook) return { configurado: false, codigo: 'MP_CREDENCIALES_AUSENTES', sandbox };
  if (token.startsWith('TEST-') !== sandbox) return { configurado: false, codigo: 'MP_MODO_INCORRECTO', sandbox };
  return { configurado: true, codigo: 'OK', sandbox };
}

export function esReferenciaDeCompra(valor: unknown): valor is string {
  return typeof valor === 'string' && REFERENCIA.test(valor);
}

export function origenCheckout(origenSolicitud?: string) {
  if (!process.env.MP_ACCESS_TOKEN || !process.env.MP_WEBHOOK_SECRET) return null;
  if (process.env.VERCEL_ENV === 'preview' && process.env.MP_SANDBOX !== 'true') return null;
  if (origenSolicitud) {
    try {
      const url = new URL(origenSolicitud);
      if (url.protocol === 'https:' || (url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname))) return url.origin;
    } catch {
      return null;
    }
  }
  return origenTienda();
}

async function consultarMercadoPago(path: string, init?: RequestInit) {
  let res: Response;
  try {
    res = await fetch(`https://api.mercadopago.com${path}`, {
      ...init,
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
      headers: {
        Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    throw new MercadoPagoError('MP_NO_DISPONIBLE', 'Mercado Pago no respondió. Intenta nuevamente en unos minutos.', error instanceof Error ? error.message : undefined);
  }
  if (!res.ok) {
    const cuerpo = await res.text().catch(() => '');
    const detalle = `HTTP ${res.status}${cuerpo ? `: ${cuerpo.slice(0, 600)}` : ''}`;
    if (res.status === 401 || res.status === 403) {
      throw new MercadoPagoError('MP_CREDENCIALES_INVALIDAS', 'Las credenciales de Mercado Pago no son válidas o no tienen permisos.', detalle);
    }
    if (res.status === 400) {
      throw new MercadoPagoError('MP_PREFERENCIA_RECHAZADA', 'Mercado Pago rechazó la configuración del cobro. La tienda debe revisar sus credenciales y el modo de prueba.', detalle);
    }
    if (res.status === 429) {
      throw new MercadoPagoError('MP_LIMITE', 'Mercado Pago está recibiendo demasiadas solicitudes. Intenta nuevamente en unos minutos.', detalle);
    }
    throw new MercadoPagoError('MP_ERROR_EXTERNO', 'Mercado Pago no pudo iniciar el cobro. Intenta nuevamente más tarde.', detalle);
  }
  return res.json().catch(() => {
    throw new MercadoPagoError('MP_RESPUESTA_INVALIDA', 'Mercado Pago devolvió una respuesta inválida.', `Respuesta no JSON en ${path}`);
  });
}

export async function crearPreferencia(pedido: Pedido, referencia: string, origen: string) {
  const token = process.env.MP_ACCESS_TOKEN?.trim() ?? '';
  const sandbox = process.env.MP_SANDBOX === 'true';
  if (token.startsWith('TEST-') && !sandbox) {
    throw new MercadoPagoError('MP_MODO_INCORRECTO', 'Las credenciales son de prueba, pero MP_SANDBOX no está activado en Vercel.');
  }
  if (!token.startsWith('TEST-') && sandbox) {
    throw new MercadoPagoError('MP_MODO_INCORRECTO', 'MP_SANDBOX está activado, pero el Access Token no corresponde al modo de prueba.');
  }
  const seguimiento = origen + rutaSeguimiento(pedido.codigo_publico, referencia);
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
      back_urls: {
        success: `${seguimiento}&mp_result=success`,
        pending: `${seguimiento}&mp_result=pending`,
        failure: `${seguimiento}&mp_result=failure`
      },
      notification_url: `${origen}/api/pagos/mercadopago?source_news=webhooks`,
      auto_return: 'approved',
      expires: true,
      expiration_date_from: new Date(pedido.created_at).toISOString(),
      expiration_date_to: expiracion.toISOString(),
      payment_methods: {
        excluded_payment_types: ['ticket', 'bank_transfer'].map((id) => ({ id }))
      }
    })
  });

  let url: URL;
  try {
    url = new URL(sandbox ? resultado.sandbox_init_point : resultado.init_point);
  } catch {
    throw new MercadoPagoError('MP_ENLACE_INVALIDO', 'Mercado Pago no devolvió un enlace de pago válido. Revisa el modo de prueba configurado.');
  }
  if (url.protocol !== 'https:' || !/(^|\.)mercadopago\.(cl|com)$/.test(url.hostname)) {
    throw new MercadoPagoError('MP_ENLACE_INVALIDO', 'Mercado Pago devolvió un enlace de pago inválido.');
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
  if (!/^\d{1,30}$/.test(id)) return null;
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
