export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getConfig, getFeaturedProducts, saveConfig } from '@/lib/db';
import { verifySessionToken, SESSION_COOKIE_NAME } from '@/lib/auth';
import { verifyCsrf } from '@/lib/csrf';
import { checkAdminRateLimit } from '@/lib/adminRateLimit';
import { LINEAS, lineaProducto, type Linea } from '@/lib/lineas';
import { MAX_DESTACADOS, TITULO_DESTACADOS } from '@/lib/destacados';
import { revalidarCatalogo } from '@/lib/revalidarCatalogo';

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

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'Cuerpo de la petición no es JSON válido' }, { status: 400 });
    }

    const cambios: Parameters<typeof saveConfig>[0] = {};
    if (body.categoryOrder !== undefined) {
      if (!Array.isArray(body.categoryOrder) || body.categoryOrder.some((grupo: unknown) => typeof grupo !== 'string')) {
        return NextResponse.json({ error: 'Orden de categorías inválido.' }, { status: 400 });
      }
      cambios.categoryOrder = body.categoryOrder;
    }
    if (body.featured !== undefined) {
      const { linea, productIds, title } = body.featured ?? {};
      if (typeof linea !== 'string' || !Object.hasOwn(LINEAS, linea)) {
        return NextResponse.json({ error: 'Elige la sección para esta selección de más vendidos.' }, { status: 400 });
      }
      if (!Array.isArray(productIds) || productIds.length > MAX_DESTACADOS ||
          productIds.some((id: number) => !Number.isInteger(id) || id < 1 || id > 2147483647) || new Set(productIds).size !== productIds.length) {
        return NextResponse.json({ error: `Selecciona hasta ${MAX_DESTACADOS} productos distintos.` }, { status: 400 });
      }
      const productos = await getFeaturedProducts(productIds);
      if (productos.length !== productIds.length || productos.some((producto) => lineaProducto(producto) !== linea)) {
        return NextResponse.json({ error: 'Solo puedes destacar productos visibles de esta sección.' }, { status: 400 });
      }
      cambios.destacados = {
        linea: linea as Linea,
        config: { productIds, title: (typeof title === 'string' && title.trim().slice(0, 80)) || TITULO_DESTACADOS }
      };
    }

    if (!cambios.categoryOrder && !cambios.destacados) {
      return NextResponse.json({ error: 'No hay cambios de configuración para guardar.' }, { status: 400 });
    }
    await saveConfig(cambios);
    if (cambios.categoryOrder) revalidarCatalogo();
    else if (cambios.destacados) revalidatePath(LINEAS[cambios.destacados.linea].href);
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    console.error('[API Error] config PUT:', e);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
