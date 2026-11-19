export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { lineaProducto } from '@/lib/lineas';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { getProductoById, updateProducto, deleteProducto, parseIdOrBadRequest } from '@/lib/db';
import { verifySessionToken, SESSION_COOKIE_NAME } from '@/lib/auth';
import { verifyCsrf } from '@/lib/csrf';
import { checkAdminRateLimit } from '@/lib/adminRateLimit';

function isAdminRequest() {
  const token = cookies().get(SESSION_COOKIE_NAME)?.value;
  return verifySessionToken(token);
}

function validarProducto(body: Record<string, unknown>): string[] {
  const errores: string[] = [];
  if (!body.name || !(body.name as string).trim()) errores.push('El nombre es obligatorio');
  if (!body.category || !(body.category as string).trim()) errores.push('La categoría es obligatoria');
  return errores;
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = parseIdOrBadRequest(params.id);
    if (id === null) return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    const producto = await getProductoById(id);
    if (!producto || ((!producto.visible || !lineaProducto(producto)) && !isAdminRequest())) {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
    }
    return NextResponse.json(producto, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (e: unknown) {
    console.error('[API Error] producto GET:', e);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  if (!checkAdminRateLimit(req)) return NextResponse.json({ error: 'Demasiadas solicitudes' }, { status: 429 });
  if (!isAdminRequest() || !verifyCsrf(req)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  try {
    const body = await req.json();
    const errores = validarProducto(body);
    if (errores.length) return NextResponse.json({ error: errores.join('. ') }, { status: 400 });

    const id = parseIdOrBadRequest(params.id);
    if (id === null) return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    const producto = await updateProducto(id, body);
    if (!producto) return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
    revalidatePath('/', 'layout');
    revalidatePath('/catalogo');
    revalidatePath(`/producto/${params.id}`, 'page');
    return NextResponse.json(producto);
  } catch (e: unknown) {
    console.error('[API Error] producto PUT:', e);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  if (!checkAdminRateLimit(req)) return NextResponse.json({ error: 'Demasiadas solicitudes' }, { status: 429 });
  if (!isAdminRequest() || !verifyCsrf(req)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  try {
    const id = parseIdOrBadRequest(params.id);
    if (id === null) return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    const ok = await deleteProducto(id);
    if (!ok) return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
    revalidatePath('/', 'layout');
    revalidatePath('/catalogo');
    revalidatePath(`/producto/${params.id}`, 'page');
    revalidatePath('/sitemap.xml');
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    console.error('[API Error] producto DELETE:', e);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
