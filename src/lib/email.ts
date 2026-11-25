import type { Pedido } from './db';

type EmailArgs = { from: string; to: string; subject: string; html: string };
type ResendResponse = { data?: { id: string } | null; error?: { message?: string; name?: string; statusCode?: number } | null };
type EmailResult = { ok: true; id?: string } | { ok: false; codigo: string; detalle: string };

let resendClient: { emails: { send: (args: EmailArgs, options?: { idempotencyKey?: string }) => Promise<ResendResponse> } } | null = null;

function configuracionCorreo(): { key: string; from: string } | { error: EmailResult & { ok: false } } {
  const key = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM?.trim();
  if (!key) return { error: { ok: false, codigo: 'RESEND_API_KEY_AUSENTE', detalle: 'Falta RESEND_API_KEY.' } };
  if (!from || !/@[A-Z0-9.-]+\.[A-Z]{2,}>?$/i.test(from)) {
    return { error: { ok: false, codigo: 'RESEND_FROM_INVALIDO', detalle: 'Falta un remitente válido en RESEND_FROM.' } };
  }
  return { key, from };
}

export function estadoConfiguracionCorreo() {
  const configuracion = configuracionCorreo();
  return 'error' in configuracion
    ? { configurado: false, codigo: configuracion.error.codigo, detalle: configuracion.error.detalle }
    : { configurado: true, remitente: configuracion.from };
}

function getResend(key: string) {
  if (resendClient) return resendClient;
  const { Resend } = require('resend');
  resendClient = new Resend(key);
  return resendClient!;
}

const formatoCLP = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });

function escaparHtml(texto: string) {
  return texto.replace(/[&<>"']/g, (signo) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[signo]!);
}

function plantilla(titulo: string, contenido: string, pedido: Pedido, estadoUrl: string) {
  return `<div style="font-family:ui-sans-serif,system-ui,-apple-system,sans-serif;max-width:560px;margin:0 auto;color:#344E41;line-height:1.55">
    <h1 style="font-size:22px;color:#3A5A40">${titulo}</h1>
    ${contenido}
    <p style="margin:24px 0"><a href="${escaparHtml(estadoUrl)}" style="background:#3A5A40;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:600">Ver estado del pedido →</a></p>
    <p style="font-size:12px;color:#777;word-break:break-all">Si el botón no funciona: ${escaparHtml(estadoUrl)}</p>
    <hr style="border:none;border-top:1px solid #ddd;margin:22px 0">
    <p style="font-size:13px;color:#666">Pedido <strong>${escaparHtml(pedido.codigo_publico)}</strong> · Total ${formatoCLP.format(pedido.total)}</p>
    <p style="font-size:13px;color:#3A5A40">Casa y Cosas</p>
  </div>`;
}

async function enviar(args: Omit<EmailArgs, 'from'>, evento: string, idempotencyKey?: string): Promise<EmailResult> {
  const configuracion = configuracionCorreo();
  if ('error' in configuracion) {
    console.error(`[email] ${evento}: ${configuracion.error.codigo}`);
    return configuracion.error;
  }
  try {
    const respuesta = await getResend(configuracion.key).emails.send({ ...args, from: configuracion.from }, { idempotencyKey });
    if (respuesta.error) {
      const detalle = respuesta.error.message || respuesta.error.name || 'Resend rechazó el correo.';
      console.error(`[email] ${evento}: RESEND_RECHAZADO`, { status: respuesta.error.statusCode });
      return { ok: false, codigo: 'RESEND_RECHAZADO', detalle };
    }
    return { ok: true, id: respuesta.data?.id };
  } catch (error) {
    const detalle = error instanceof Error ? error.message : 'No fue posible conectar con Resend.';
    console.error(`[email] ${evento}: RESEND_NO_DISPONIBLE`);
    return { ok: false, codigo: 'RESEND_NO_DISPONIBLE', detalle };
  }
}

export async function enviarEmailPedidoCreado(pedido: Pedido, estadoUrl: string): Promise<EmailResult> {
  if (!pedido.cliente_email) return { ok: false, codigo: 'EMAIL_CLIENTE_AUSENTE', detalle: 'El pedido no tiene correo.' };
  const items = pedido.items.map((item) => `<li>${item.qty} × ${escaparHtml(item.nombre)} — ${formatoCLP.format(item.precio * item.qty)}</li>`).join('');
  const pago = pedido.metodo_pago === 'transferencia'
    ? '<p>Tu pedido quedó reservado y está pendiente de transferencia. En el enlace encontrarás los datos bancarios y el plazo para pagar.</p>'
    : '<p>Tu pedido quedó registrado. Completa el pago en Mercado Pago; desde el enlace también podrás retomar el pago si cerraste la ventana.</p>';
  const envio = pedido.sin_envio
    ? '<p>Elegiste un pedido sin envío. Coordina la entrega con la tienda por WhatsApp.</p>'
    : pedido.costo_envio ? `<p>Envío Blue Express: ${formatoCLP.format(pedido.costo_envio)} · incluido en el total.</p>` : '';
  const html = plantilla('Recibimos tu pedido', `${pago}<ul style="padding-left:20px">${items}</ul>${envio}`, pedido, estadoUrl);
  return enviar({ to: pedido.cliente_email, subject: `Recibimos tu pedido ${pedido.codigo_publico} · Casa y Cosas`, html }, 'pedido-creado', `pedido-${pedido.codigo_publico}-creado`);
}

export async function enviarEmailCambioEstado(pedido: Pedido, estadoUrl: string): Promise<EmailResult> {
  if (!pedido.cliente_email) return { ok: false, codigo: 'EMAIL_CLIENTE_AUSENTE', detalle: 'El pedido no tiene correo.' };
  const confirmado = pedido.estado === 'confirmado';
  const titulo = confirmado ? '¡Pago confirmado!' : 'Pedido cancelado';
  const contenido = confirmado
    ? '<p>Recibimos el pago. Prepararemos tu pedido y actualizaremos el seguimiento cuando sea despachado.</p>'
    : '<p>El pedido fue cancelado y sus productos volvieron al inventario.</p>';
  return enviar({
    to: pedido.cliente_email,
    subject: `${titulo} · Pedido ${pedido.codigo_publico}`,
    html: plantilla(titulo, contenido, pedido, estadoUrl)
  }, 'cambio-estado', `pedido-${pedido.codigo_publico}-${pedido.estado}`);
}

export async function enviarEmailPedidoDespachado(pedido: Pedido, estadoUrl: string): Promise<EmailResult> {
  if (!pedido.cliente_email) return { ok: false, codigo: 'EMAIL_CLIENTE_AUSENTE', detalle: 'El pedido no tiene correo.' };
  const codigo = pedido.codigo_despacho
    ? `<p>Código de seguimiento: <strong>${escaparHtml(pedido.codigo_despacho)}</strong></p>` : '';
  return enviar({
    to: pedido.cliente_email,
    subject: `Tu pedido ${pedido.codigo_publico} fue despachado`,
    html: plantilla('Tu pedido va en camino', `<p>El pedido fue entregado al transportista.</p>${codigo}`, pedido, estadoUrl)
  }, 'pedido-despachado', `pedido-${pedido.codigo_publico}-despachado`);
}

export async function enviarEmailPrueba(destino: string): Promise<EmailResult> {
  if (!/^\S+@[^\s@]+\.[^\s@]+$/.test(destino) || destino.length > 200) {
    return { ok: false, codigo: 'EMAIL_DESTINO_INVALIDO', detalle: 'Ingresa un correo de destino válido.' };
  }
  const html = `<div style="font-family:ui-sans-serif,system-ui,-apple-system,sans-serif;max-width:520px;margin:0 auto;color:#344E41">
    <h1 style="font-size:22px;color:#3A5A40">Correo configurado correctamente</h1>
    <p>Esta es una prueba del sistema de notificaciones de pedidos de Casa y Cosas.</p>
    <p style="font-size:13px;color:#666">Si recibiste este mensaje, Resend aceptó el remitente y pudo entregar la solicitud.</p>
  </div>`;
  return enviar({ to: destino, subject: 'Prueba de correo · Casa y Cosas', html }, 'prueba-admin');
}
