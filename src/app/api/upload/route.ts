export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { subirImagen } from '@/lib/supabaseStorage';
import { verifySessionToken, SESSION_COOKIE_NAME } from '@/lib/auth';
import { verifyCsrf } from '@/lib/csrf';

const MAX_DATA_URL_BYTES = 6 * 1024 * 1024;

export async function POST(req: NextRequest) {
  const token = cookies().get(SESSION_COOKIE_NAME)?.value;
  if (!verifySessionToken(token) || !verifyCsrf(req)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  try {
    const body = await req.json();
    const { image } = body || {};
    if (typeof image !== 'string' || !image.startsWith('data:image/')) {
      return NextResponse.json({ error: 'Falta la imagen o el formato es inválido' }, { status: 400 });
    }
    if (Buffer.byteLength(image) > MAX_DATA_URL_BYTES) {
      return NextResponse.json({ error: 'La imagen supera el tamaño máximo permitido (4.5 MB)' }, { status: 413 });
    }
    const url = await subirImagen(image);
    return NextResponse.json({ url });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Error al subir la imagen' }, { status: 500 });
  }
}