export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getConfig, saveConfig } from '@/lib/db';
import { verifySessionToken, SESSION_COOKIE_NAME } from '@/lib/auth';
import { verifyCsrf } from '@/lib/csrf';
import { checkAdminRateLimit } from '@/lib/adminRateLimit';
import type { FeaturedConfig } from '@/lib/types';

export async function GET() {
  try {
    const config = await getConfig();
    return NextResponse.json(config);
  } catch (e: unknown) {
    console.error('[API Error] config GET:', e);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  if (!checkAdminRateLimit(req)) return NextResponse.json({ error: 'Demasiadas solicitudes' }, { status: 429 });
  try {
    const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!verifySessionToken(token) || !verifyCsrf(req)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const raw = await req.text();
    let body: Record<string, unknown>;
    try {
      body = JSON.parse(raw);
    } catch {
      return NextResponse.json({ error: 'Cuerpo de la petición no es JSON válido' }, { status: 400 });
    }

    if (body.featured) {
      const featured = body.featured as Record<string, unknown>;
      const ids = featured.productIds as unknown[];
      if (!Array.isArray(ids) || ids.length !== 4 || !ids.every((id) => Number.isFinite(id as number))) {
        return NextResponse.json({ error: 'Debes seleccionar exactamente 4 productos destacados' }, { status: 400 });
      }
      if (new Set(ids).size !== 4) {
        return NextResponse.json({ error: 'Los 4 productos destacados deben ser distintos' }, { status: 400 });
      }
      featured.title = ((featured.title as string) || 'Productos más vendidos').slice(0, 80);
    }

    const current = await getConfig();
    const config = {
      categoryOrder: Array.isArray(body.categoryOrder) ? body.categoryOrder as string[] : current.categoryOrder,
      featured: (body.featured as FeaturedConfig) || current.featured
    };
    await saveConfig(config);
    revalidatePath('/', 'layout');
    revalidatePath('/catalogo');
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    console.error('[API Error] config PUT:', e);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}