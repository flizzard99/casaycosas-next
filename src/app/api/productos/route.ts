export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getProductosPublicos, getProductosAdmin, createProducto } from '@/lib/db';
import { verifySessionToken, SESSION_COOKIE_NAME } from '@/lib/auth';
import { verifyCsrf } from '@/lib/csrf';
import { checkAdminRateLimit } from '@/lib/adminRateLimit';

function isAdminRequest(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  return verifySessionToken(token);
}

function validarProducto(body: Record<string, unknown>): string[] {
  const errores: string[] = [];
  if (!body.name || !(body.name as string).trim()) errores.push('El nombre es obligatorio');
  if (!body.category || !(body.category as string).trim()) errores.push('La categoría es obligatoria');
  if (body.name && (body.name as string).length > 200) errores.push('El nombre no puede superar 200 caracteres');
  if (body.description && (body.description as string).length > 2000) errores.push('La descripción no puede superar 2000 caracteres');
  return errores;
}

export async function GET(req: NextRequest) {
  try {
    const admin = isAdminRequest(req);
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
  if (!isAdminRequest(req) || !verifyCsrf(req)) {
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
