import { NextRequest, NextResponse } from 'next/server';
import { checkAdminRateLimit } from '@/lib/adminRateLimit';
import { SESSION_COOKIE_NAME, verifySessionToken } from '@/lib/auth';
import { verifyCsrf } from '@/lib/csrf';
import { subirArchivoImagen } from '@/lib/imageStorage';
import { almacenamientoImagenesConfigurado } from '@/lib/r2';
import { MAX_UPLOAD_DIRECT_BYTES } from '@/lib/uploadLimits';

export const runtime = 'nodejs';

const formatos = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];

export async function POST(req: NextRequest) {
  if (!checkAdminRateLimit(req)) return NextResponse.json({ error: 'Demasiadas solicitudes. Espera un momento y vuelve a probar.' }, { status: 429 });
  if (!verifySessionToken(req.cookies.get(SESSION_COOKIE_NAME)?.value) || !verifyCsrf(req)) {
    return NextResponse.json({ error: 'Inicia sesión de nuevo para subir la imagen.' }, { status: 401 });
  }

  const tipo = req.headers.get('content-type') ?? '';
  if (!formatos.includes(tipo)) {
    return NextResponse.json({ error: 'Usa una imagen JPG, PNG, WebP o AVIF.' }, { status: 415 });
  }

  const longitud = Number(req.headers.get('content-length'));
  if (longitud > MAX_UPLOAD_DIRECT_BYTES) {
    return NextResponse.json({ error: 'La imagen supera los 4 MB después de prepararla.' }, { status: 413 });
  }
  if (!almacenamientoImagenesConfigurado()) {
    return NextResponse.json({ error: 'El almacenamiento de imágenes no está configurado en Vercel.' }, { status: 503 });
  }

  const cuerpo = await req.arrayBuffer().catch(() => null);
  if (!cuerpo?.byteLength) return NextResponse.json({ error: 'No llegó ningún archivo.' }, { status: 400 });
  if (cuerpo.byteLength > MAX_UPLOAD_DIRECT_BYTES) {
    return NextResponse.json({ error: 'La imagen supera los 4 MB después de prepararla.' }, { status: 413 });
  }

  try {
    const url = await subirArchivoImagen(tipo, Buffer.from(cuerpo));
    return NextResponse.json({ url });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('No pudimos leer')) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'El almacenamiento no pudo guardar la imagen. Vuelve a intentarlo.' }, { status: 502 });
  }
}
