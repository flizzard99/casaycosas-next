export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { subirImagen } from '@/lib/imageStorage';
import { verifySessionToken, SESSION_COOKIE_NAME } from '@/lib/auth';
import { verifyCsrf } from '@/lib/csrf';
import { MAX_UPLOAD_DIRECT_BYTES } from '@/lib/uploadLimits';
import { checkAdminRateLimit } from '@/lib/adminRateLimit';

export async function POST(req: NextRequest) {
  if (!checkAdminRateLimit(req)) return NextResponse.json({ error: 'Demasiadas solicitudes' }, { status: 429 });
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!verifySessionToken(token) || !verifyCsrf(req)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  try {
    const body = await req.json();
    const { image } = body || {};
    if (typeof image !== 'string' || !image.startsWith('data:image/')) {
      return NextResponse.json({ error: 'Falta la imagen o el formato es inválido' }, { status: 400 });
    }
    const mimeRaw = image.split(',')[0]?.match(/data:(image\/[\w.+-]+)/i)?.[1]?.toLowerCase();
    const PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif', 'image/heic', 'image/heif', 'image/heic-sequence', 'image/heif-sequence'];
    if (!mimeRaw || !PERMITIDOS.includes(mimeRaw)) {
      return NextResponse.json({ error: 'Formato no permitido. Solo JPG, PNG, WebP, GIF, AVIF y HEIC.' }, { status: 400 });
    }
    const base64Data = image.split(',')[1];
    if (!base64Data) {
      return NextResponse.json({ error: 'Formato data URL inválido' }, { status: 400 });
    }
    const buffer = Buffer.from(base64Data, 'base64');
    if (buffer.length > MAX_UPLOAD_DIRECT_BYTES) {
      return NextResponse.json({ error: 'La imagen supera el tamaño máximo permitido (4 MB) para este formato. Usa JPG, PNG o WebP para imágenes más grandes.' }, { status: 413 });
    }
    const url = await subirImagen(image);
    return NextResponse.json({ url });
  } catch (e: unknown) {
    console.error('[API Error] upload:', e);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}