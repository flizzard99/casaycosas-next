import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { checkAdminRateLimit } from '@/lib/adminRateLimit';
import { SESSION_COOKIE_NAME, verifySessionToken } from '@/lib/auth';
import { verifyCsrf } from '@/lib/csrf';
import { saveDisenoSeccion } from '@/lib/db';
import { LINEAS, type Linea } from '@/lib/lineas';
import type { DisenoSeccion } from '@/lib/types';

export const runtime = 'nodejs';

function imagenPermitida(valor: string) {
  try {
    const imagen = new URL(valor);
    const origenR2 = new URL(process.env.R2_PUBLIC_URL || 'https://images.casaycosas.qzz.io');
    return imagen.protocol === 'https:' && imagen.origin === origenR2.origin && imagen.pathname.startsWith('/product-images/');
  } catch {
    return false;
  }
}

export async function PUT(req: NextRequest) {
  if (!checkAdminRateLimit(req)) return NextResponse.json({ error: 'Demasiadas solicitudes' }, { status: 429 });
  if (!verifySessionToken(req.cookies.get(SESSION_COOKIE_NAME)?.value) || !verifyCsrf(req)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body || !Object.hasOwn(LINEAS, body.linea) || !body.diseno || typeof body.diseno !== 'object' || Array.isArray(body.diseno)) {
    return NextResponse.json({ error: 'Selecciona una sección válida.' }, { status: 400 });
  }

  const diseno: DisenoSeccion = {};
  for (const campo of ['imagen', 'fondo', 'titulo', 'descripcion'] as const) {
    const valor = body.diseno[campo];
    if (valor == null || valor === '') continue;
    const limite = campo === 'titulo' ? 90 : campo === 'descripcion' ? 240 : 500;
    if (typeof valor !== 'string' || valor.length > limite || ((campo === 'imagen' || campo === 'fondo') && !imagenPermitida(valor))) {
      return NextResponse.json({ error: 'Revisa la imagen o el texto de campaña.' }, { status: 400 });
    }
    diseno[campo] = valor.trim();
  }

  try {
    const linea = body.linea as Linea;
    await saveDisenoSeccion(linea, diseno);
    revalidatePath('/');
    revalidatePath(LINEAS[linea].href);
    return NextResponse.json(diseno);
  } catch (error) {
    console.error('[config/diseno]', error);
    return NextResponse.json({ error: 'No se pudo guardar el diseño.' }, { status: 500 });
  }
}
