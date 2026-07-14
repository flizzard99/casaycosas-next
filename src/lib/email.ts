import type { Pedido } from './db';
import { tienda } from './config';

let resendClient: { emails: { send: (args: EmailArgs) => Promise<unknown> } } | null = null;

type EmailArgs = {
  from: string;
  to: string;
  subject: string;
  html: string;
};

function getResend() {
  if (resendClient) return resendClient;
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  try {
    const { Resend } = require('resend');
    resendClient = new Resend(key);
    return resendClient;
  } catch {
    return null;
  }
}

function fromAddress(): string {
  return process.env.RESEND_FROM || 'onboarding@resend.dev';
}

const formatoCLP = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });

function itemsHtml(items: Pedido['items']): string {
  return items.map((i) => `<tr><td style="padding:4px 0">${i.qty}×</td><td style="padding:4px 8px">${i.nombre}</td><td style="padding:4px 0;text-align:right">${formatoCLP.format(i.precio * i.qty)}</td></tr>`).join('');
}

export async function enviarEmailPedidoCreado(pedido: Pedido, estadoUrl: string): Promise<void> {
  if (!pedido.cliente_email) return;
  const resend = getResend();
  if (!resend) { console.info('[email] RESEND_API_KEY no configurada, saltando email a', pedido.cliente_email); return; }
  const html = `
  <div style="font-family:ui-sans-serif,system-ui,-apple-system,sans-serif;max-width:480px;margin:0 auto;color:#344E41">
    <h1 style="font-size:20px;color:#3A5A40">¡Pedido reservado! 🌿</h1>
    <p>Hola${pedido.cliente_nombre ? ' ' + pedido.cliente_nombre : ''},</p>
    <p>Tu pedido <strong>#${pedido.id}</strong> fue reservado correctamente. Puedes seguir su estado en:</p>
    <p><a href="${estadoUrl}" style="background:#588157;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;display:inline-block">Ver estado de mi pedido →</a></p>
    <p style="color:#888;font-size:12px">O copia este enlace: ${estadoUrl}</p>
    <hr style="border:none;border-top:1px solid #eee;margin:20px 0">
    <table style="width:100%;font-size:14px;color:#344E41"><tbody>
      ${itemsHtml(pedido.items)}
      <tr><td colspan="2" style="padding-top:10px;font-weight:bold">Total</td><td style="padding-top:10px;text-align:right;font-weight:bold">${formatoCLP.format(pedido.total)}</td></tr>
    </tbody></table>
    <p style="font-size:12px;color:#888;margin-top:20px">El pedido expira automáticamente a las 48 horas, restaurando el stock. La confirmación final la realiza la tienda.</p>
    <p style="font-size:13px;color:#3A5A40;margin-top:24px">— Casa y Cosas · Panguipulli</p>
  </div>`;
  await resend.emails.send({ from: fromAddress(), to: pedido.cliente_email, subject: `Pedido #${pedido.id} reservado · Casa y Cosas`, html });
}

export async function enviarEmailCambioEstado(pedido: Pedido, estadoUrl: string): Promise<void> {
  if (!pedido.cliente_email) return;
  const resend = getResend();
  if (!resend) return;
  const titulo = pedido.estado === 'confirmado' ? '¡Pedido confirmado! ✅' : 'Tu pedido fue cancelado ❌';
  const desc = pedido.estado === 'confirmado'
    ? 'Tu pedido fue confirmado y está listo para ser retirado en tienda. Te esperamos!'
    : 'Tu pedido fue cancelado y el stock de los productos fue restaurado. Puedes volver a reservar cuando quieras.';
  const html = `
  <div style="font-family:ui-sans-serif,system-ui,-apple-system,sans-serif;max-width:480px;margin:0 auto;color:#344E41">
    <h1 style="font-size:20px;color:#3A5A40">${titulo}</h1>
    <p>${desc}</p>
    <p><a href="${estadoUrl}" style="background:#588157;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;display:inline-block">Ver estado de mi pedido →</a></p>
    <p style="font-size:13px;color:#888;word-break:break-all">Enlace directo: ${estadoUrl}</p>
    <hr style="border:none;border-top:1px solid #eee;margin:20px 0">
    <p style="font-size:12px;color:#888">Pedido #${pedido.id} · Total ${formatoCLP.format(pedido.total)}</p>
    <p style="font-size:13px;color:#3A5A40;margin-top:24px">— Casa y Cosas · Panguipulli</p>
  </div>`;
  try { await resend.emails.send({ from: fromAddress(), to: pedido.cliente_email, subject: `Pedido #${pedido.id} ${pedido.estado} · ${tienda.storeAddress}`, html }); } catch (e) { console.error('[email]cambio-estado:', e); }
}