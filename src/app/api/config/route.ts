import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getConfig, saveConfig } from '@/lib/db';
import { verifySessionToken, SESSION_COOKIE_NAME } from '@/lib/auth';

export async function GET() {
  try {
    const config = await getConfig();
    return NextResponse.json(config);
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Error desconocido' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const token = cookies().get(SESSION_COOKIE_NAME)?.value;
  if (!verifySessionToken(token)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  try {
    const body = await req.json();

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
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Error desconocido' }, { status: 500 });
  }
}