import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE_NAME, verifySessionToken } from '@/lib/auth';
import { verifyCsrf } from '@/lib/csrf';
import { checkAdminRateLimit } from '@/lib/adminRateLimit';
import { enviarEmailPrueba, estadoConfiguracionCorreo } from '@/lib/email';
import { estadoConfiguracionMercadoPago } from '@/lib/mercadoPago';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function autorizado(req: NextRequest) {
  return verifySessionToken(req.cookies.get(SESSION_COOKIE_NAME)?.value);
}

export async function GET(req: NextRequest) {
  if (!autorizado(req)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  return NextResponse.json({
    correo: estadoConfiguracionCorreo(),
    mercadoPago: estadoConfiguracionMercadoPago(),
    sitio: process.env.NEXT_PUBLIC_SITE_URL || null
  }, { headers: { 'Cache-Control': 'private, no-store' } });
}

export async function POST(req: NextRequest) {
  if (!checkAdminRateLimit(req, 5, 10 * 60_000)) {
    return NextResponse.json({ error: 'Demasiadas pruebas. Espera unos minutos.' }, { status: 429 });
  }
  if (!autorizado(req) || !verifyCsrf(req)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const body = await req.json().catch(() => null);
  const destino = typeof body?.email === 'string' ? body.email.trim() : '';
  const resultado = await enviarEmailPrueba(destino);
  return resultado.ok
    ? NextResponse.json({ ok: true, id: resultado.id })
    : NextResponse.json(
      { error: resultado.detalle, code: resultado.codigo },
      { status: resultado.codigo === 'EMAIL_DESTINO_INVALIDO' ? 400 : 502 }
    );
}
