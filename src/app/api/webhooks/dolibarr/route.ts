import { NextRequest, NextResponse } from 'next/server';
import { fetchProductoStock } from '@/lib/dolibarr';
import { getProductoByDolibarrRef, actualizarStockDirecto } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type WebhookPayload = {
  triggercode: string;
  object: {
    product_id: number;
    qty: number;
    type: number;
    label?: string;
  };
};

export async function POST(req: NextRequest) {
  const secret = process.env.DOLIBARR_WEBHOOK_SECRET;
  if (!secret) {
    console.error('[webhook:dolibarr] DOLIBARR_WEBHOOK_SECRET no configurado');
    return NextResponse.json({ error: 'Webhook no configurado' }, { status: 500 });
  }

  const urlSecret = req.nextUrl.searchParams.get('secret');
  if (urlSecret !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: WebhookPayload;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (body.triggercode !== 'STOCK_MOVEMENT') {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const { product_id } = body.object;
  if (!product_id) {
    return NextResponse.json({ error: 'Missing product_id' }, { status: 400 });
  }

  try {
    const doliProduct = await fetchProductoStock(product_id);
    if (!doliProduct) {
      console.warn(`[webhook:dolibarr] Producto Dolibarr ${product_id} no encontrado`);
      return NextResponse.json({ error: 'Product not found in Dolibarr' }, { status: 404 });
    }

    const ref = doliProduct.ref_ext || doliProduct.ref;
    if (!ref) {
      console.warn(`[webhook:dolibarr] Producto Dolibarr ${product_id} sin ref/ref_ext`);
      return NextResponse.json({ error: 'No ref to map' }, { status: 400 });
    }

    const producto = await getProductoByDolibarrRef(ref);
    if (!producto) {
      console.warn(`[webhook:dolibarr] Producto con dolibarr_ref="${ref}" no encontrado en la web`);
      return NextResponse.json({ ok: true, mapped: false, ref });
    }

    await actualizarStockDirecto(producto.id, doliProduct.stock_reel);

    console.info(`[webhook:dolibarr] Stock actualizado: producto ${producto.id} ("${producto.name}") → ${doliProduct.stock_reel}`);
    return NextResponse.json({ ok: true, productoId: producto.id, stock: doliProduct.stock_reel });
  } catch (e) {
    console.error('[webhook:dolibarr] Error procesando webhook:', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
