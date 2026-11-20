import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { checkAdminRateLimit } from '@/lib/adminRateLimit';
import { SESSION_COOKIE_NAME, verifySessionToken } from '@/lib/auth';
import { verifyCsrf } from '@/lib/csrf';
import { guardarImagen } from '@/lib/imageStorage';
import { R2_PUBLIC_URL } from '@/lib/r2';
import { MAX_UPLOAD_DIRECT_BYTES } from '@/lib/uploadLimits';

export const runtime = 'nodejs';

const formatos = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
const formatosDetectados = ['jpeg', 'png', 'webp', 'heif'];

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
  const urlValida = URL.canParse(R2_PUBLIC_URL) && new URL(R2_PUBLIC_URL).protocol === 'https:';
  if (!urlValida || !process.env.R2_ACCOUNT_ID || !process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY) {
    return NextResponse.json({ error: 'El almacenamiento de imágenes no está configurado en Vercel.' }, { status: 503 });
  }

  const cuerpo = await req.arrayBuffer().catch(() => null);
  if (!cuerpo?.byteLength) return NextResponse.json({ error: 'No llegó ningún archivo.' }, { status: 400 });
  if (cuerpo.byteLength > MAX_UPLOAD_DIRECT_BYTES) {
    return NextResponse.json({ error: 'La imagen supera los 4 MB después de prepararla.' }, { status: 413 });
  }

  let buffer: Buffer;
  try {
    const imagen = sharp(Buffer.from(cuerpo), { limitInputPixels: 60_000_000 });
    const datos = await imagen.metadata();
    if (!datos.format || !formatosDetectados.includes(datos.format) ||
        (datos.format === 'heif' && datos.compression !== 'av1')) {
      return NextResponse.json({ error: 'Usa una imagen JPG, PNG, WebP o AVIF.' }, { status: 415 });
    }
    buffer = await imagen.rotate().resize({ width: 2200, height: 2200, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 88 }).toBuffer();
  } catch {
    return NextResponse.json({ error: 'No pudimos leer la imagen. Revisa que el archivo esté en buen estado.' }, { status: 400 });
  }

  try {
    const url = await guardarImagen({ buffer, mime: 'image/webp', ext: 'webp' });
    return NextResponse.json({ url });
  } catch {
    return NextResponse.json({ error: 'El almacenamiento no pudo guardar la imagen. Vuelve a intentarlo.' }, { status: 502 });
  }
}
