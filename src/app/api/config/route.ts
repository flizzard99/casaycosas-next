export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { getConfig, saveConfig } from '@/lib/db';
import { verifySessionToken, SESSION_COOKIE_NAME } from '@/lib/auth';
import { verifyCsrf } from '@/lib/csrf';

export async function GET() {
  try {
    const config = await getConfig();
    return NextResponse.json(config);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Error desconocido' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const token = cookies().get(SESSION_COOKIE_NAME)?.value;
    if (!verifySessionToken(token) || !verifyCsrf(req)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const raw = await req.text();
    let body: any;
    try {
      body = JSON.parse(raw);
    } catch {
      return NextResponse.json({ error: 'Cuerpo de la petición no es JSON válido' }, { status: 400 });
    }

    if (body.featured) {
      const ids = body.featured.productIds;
      if (!Array.isArray(ids) || ids.length !== 4 || !ids.every((id: any) => Number.isFinite(id))) {
        return NextResponse.json({ error: 'Debes seleccionar exactamente 4 productos destacados' }, { status: 400 });
      }
      if (new Set(ids).size !== 4) {
        return NextResponse.json({ error: 'Los 4 productos destacados deben ser distintos' }, { status: 400 });
      }
      body.featured.title = (body.featured.title || 'Productos más vendidos').slice(0, 80);
    }

    const current = await getConfig();
    const config = {
      categoryOrder: Array.isArray(body.categoryOrder) ? body.categoryOrder : current.categoryOrder,
      featured: body.featured || current.featured
    };
    await saveConfig(config);
    revalidatePath('/', 'layout');
    revalidatePath('/catalogo');
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Error desconocido en el servidor' }, { status: 500 });
  }
}