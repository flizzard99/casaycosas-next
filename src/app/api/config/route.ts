export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getConfig, saveConfig } from '@/lib/db';
import { verifySessionToken, SESSION_COOKIE_NAME } from '@/lib/auth';

export async function GET() {
  try {
    const config = await getConfig();
    return NextResponse.json(config);
  } catch (e: any) {
    console.error('[config GET] error:', e?.message || e);
    return NextResponse.json({ error: e?.message || 'Error desconocido' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  console.log('[config PUT] request received');
  try {
    const token = cookies().get(SESSION_COOKIE_NAME)?.value;
    if (!verifySessionToken(token)) {
      console.log('[config PUT] unauthorized');
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const raw = await req.text();
    console.log('[config PUT] raw body:', raw);
    let body: any;
    try {
      body = JSON.parse(raw);
    } catch {
      console.error('[config PUT] failed to parse JSON');
      return NextResponse.json({ error: 'Cuerpo de la petición no es JSON válido' }, { status: 400 });
    }

    if (body.featured) {
      const ids = body.featured.productIds;
      if (!Array.isArray(ids) || ids.length !== 4 || !ids.every((id: any) => Number.isFinite(id))) {
        console.error('[config PUT] featured validation failed:', ids);
        return NextResponse.json({ error: 'Debes seleccionar exactamente 4 productos destacados' }, { status: 400 });
      }
      if (new Set(ids).size !== 4) {
        console.error('[config PUT] featured not unique:', ids);
        return NextResponse.json({ error: 'Los 4 productos destacados deben ser distintos' }, { status: 400 });
      }
      body.featured.title = (body.featured.title || 'Productos más vendidos').slice(0, 80);
    }

    console.log('[config PUT] calling getConfig...');
    const current = await getConfig();
    console.log('[config PUT] current config loaded');
    const config = {
      categoryOrder: Array.isArray(body.categoryOrder) ? body.categoryOrder : current.categoryOrder,
      featured: body.featured || current.featured
    };
    console.log('[config PUT] calling saveConfig...');
    await saveConfig(config);
    console.log('[config PUT] saved successfully');
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error('[config PUT] error:', e?.message, e?.stack);
    return NextResponse.json({ error: e?.message || 'Error desconocido en el servidor' }, { status: 500 });
  }
}