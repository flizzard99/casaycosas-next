export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySessionToken, SESSION_COOKIE_NAME } from '@/lib/auth';
import { verifyCsrf } from '@/lib/csrf';
import { checkAdminRateLimit } from '@/lib/adminRateLimit';
import { MAX_UPLOAD_BYTES } from '@/lib/uploadLimits';
import { createSignedUploadUrl } from '@/lib/imageStorage';

export async function POST(req: NextRequest) {
  if (!checkAdminRateLimit(req)) return NextResponse.json({ error: 'Demasiadas solicitudes' }, { status: 429 });
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  if (!verifySessionToken(token) || !(await verifyCsrf(req))) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  try {
    const { contentType, size } = await req.json();
    if (typeof contentType !== 'string' || typeof size !== 'number') {
      return NextResponse.json({ error: 'Faltan contentType o size' }, { status: 400 });
    }
    if (size > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ error: 'La imagen supera el tamaño máximo (25 MB)' }, { status: 413 });
    }
    const { signedUrl, publicUrl } = await createSignedUploadUrl(contentType);
    return NextResponse.json({ signedUrl, publicUrl });
  } catch (e: unknown) {
    console.error('[API Error] upload/sign:', e);
    const message = e instanceof Error ? e.message : 'Error interno del servidor';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}