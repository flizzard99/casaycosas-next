export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { getProductosPublicos, getProductosAdmin, createProducto } from '@/lib/db';
import { verifySessionToken, SESSION_COOKIE_NAME } from '@/lib/auth';
import { verifyCsrf } from '@/lib/csrf';
import { checkAdminRateLimit } from '@/lib/adminRateLimit';
import { validarProducto } from '@/lib/validacionProducto';

async function isAdminRequest() {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  return verifySessionToken(token);
}

export async function GET() {
  try {
    const admin = await isAdminRequest();
    const productos = admin ? await getProductosAdmin() : await getProductosPublicos();
    return NextResponse.json(productos, {
      headers: { 'Cache-Control': 'no-store' }
    });
  } catch (e: unknown) {
    console.error('[API Error] productos GET:', e);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!checkAdminRateLimit(req)) return NextResponse.json({ error: 'Demasiadas solicitudes' }, { status: 429 });
  if (!(await isAdminRequest()) || !(await verifyCsrf(req))) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  try {
    const body = await req.json();
    const errores = validarProducto(body);
    if (errores.length) return NextResponse.json({ error: errores.join('. ') }, { status: 400 });

    const producto = await createProducto(body);
    revalidatePath('/', 'layout');
    revalidatePath('/catalogo');
    revalidatePath('/sitemap.xml');
    return NextResponse.json(producto, { status: 201 });
  } catch (e: unknown) {
    console.error('[API Error] productos POST:', e);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
