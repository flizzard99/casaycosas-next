import { redirect } from 'next/navigation';
import type { NextRequest } from 'next/server';
import { rutaSeguimiento } from '@/lib/checkout';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: valor } = await params;
  const id = Number(valor);
  if (!/^\d+$/.test(valor) || id < 1 || id > 2147483647) return new Response(null, { status: 404 });
  const referencias = req.nextUrl.searchParams.getAll('ref');
  const destino = new URL(rutaSeguimiento(id, referencias.length === 1 ? referencias[0] : undefined), req.nextUrl.origin);
  for (const clave of ['payment_id', 'collection_id', 'status', 'collection_status', 'mp_result']) {
    const valores = req.nextUrl.searchParams.getAll(clave);
    if (valores.length === 1) destino.searchParams.set(clave, valores[0]);
  }
  redirect(destino.pathname + destino.search);
}
