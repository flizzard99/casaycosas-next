export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { subirArchivoImagen } from '@/lib/imageStorage';
import { verifySessionToken, SESSION_COOKIE_NAME } from '@/lib/auth';
import { verifyCsrf } from '@/lib/csrf';
import { MAX_UPLOAD_DIRECT_BYTES } from '@/lib/uploadLimits';
import { checkAdminRateLimit } from '@/lib/adminRateLimit';
import { almacenamientoImagenesConfigurado } from '@/lib/r2';

export async function POST(req: NextRequest) {
  if (!checkAdminRateLimit(req)) return NextResponse.json({ error: 'Demasiadas solicitudes' }, { status: 429 });
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!verifySessionToken(token) || !verifyCsrf(req)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  if (!almacenamientoImagenesConfigurado()) {
    return NextResponse.json({ error: 'El almacenamiento de imágenes no está configurado en Vercel.' }, { status: 503 });
  }
  try {
    const contentType = (req.headers.get('content-type') ?? '').split(';')[0].toLowerCase();
    const longitud = Number(req.headers.get('content-length'));
    if (Number.isFinite(longitud) && longitud > MAX_UPLOAD_DIRECT_BYTES) {
      return NextResponse.json({ error: 'La imagen supera los 4 MB después de prepararla.' }, { status: 413 });
    }
    const cuerpo = await req.arrayBuffer().catch(() => null);
    if (!cuerpo?.byteLength) return NextResponse.json({ error: 'No llegó ningún archivo.' }, { status: 400 });
    if (cuerpo.byteLength > MAX_UPLOAD_DIRECT_BYTES) {
      return NextResponse.json({ error: 'La imagen supera los 4 MB después de prepararla.' }, { status: 413 });
    }
    const url = await subirArchivoImagen(contentType, Buffer.from(cuerpo));
    return NextResponse.json({ url });
  } catch (e: unknown) {
    console.error('[API Error] upload:', e);
    const mensaje = e instanceof Error ? e.message : '';
    if (/^(Tipo de imagen|No pudimos leer|El archivo está vacío|La imagen supera)/.test(mensaje)) {
      return NextResponse.json({ error: mensaje }, { status: mensaje.includes('supera') ? 413 : 400 });
    }
    return NextResponse.json({ error: 'El almacenamiento no pudo guardar la imagen. Vuelve a intentarlo.' }, { status: 502 });
  }
}
