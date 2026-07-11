export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { subirImagen } from '@/lib/supabaseStorage';
import { verifySessionToken, SESSION_COOKIE_NAME } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const token = cookies().get(SESSION_COOKIE_NAME)?.value;
  if (!verifySessionToken(token)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  try {
    const { image } = await req.json();
    if (!image) return NextResponse.json({ error: 'Falta la imagen' }, { status: 400 });
    const url = await subirImagen(image);
    return NextResponse.json({ url });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Error al subir la imagen' }, { status: 500 });
  }
}
