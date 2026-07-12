export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { getProductosPublicos, getProductosAdmin, createProducto } from '@/lib/db';
import { verifySessionToken, SESSION_COOKIE_NAME } from '@/lib/auth';
import { verifyCsrf } from '@/lib/csrf';

function isAdminRequest() {
  const token = cookies().get(SESSION_COOKIE_NAME)?.value;
  return verifySessionToken(token);
}

function validarProducto(body: any): string[] {
  const errores: string[] = [];
  if (!body.name || !body.name.trim()) errores.push('El nombre es obligatorio');
  if (!body.category || !body.category.trim()) errores.push('La categoría es obligatoria');
  if (body.name && body.name.length > 200) errores.push('El nombre no puede superar 200 caracteres');
  if (body.description && body.description.length > 2000) errores.push('La descripción no puede superar 2000 caracteres');
  return errores;
}

export async function GET() {
  try {
    const admin = isAdminRequest();
    const productos = admin ? await getProductosAdmin() : await getProductosPublicos();
    return NextResponse.json(productos, {
      headers: { 'Cache-Control': 'no-store' }
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Error desconocido' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!isAdminRequest() || !verifyCsrf(req)) {
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
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Error desconocido' }, { status: 500 });
  }
}
