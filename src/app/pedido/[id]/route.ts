import { redirect } from 'next/navigation';
import type { NextRequest } from 'next/server';
import { rutaSeguimiento } from '@/lib/checkout';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: valor } = await params;
  const id = Number(valor);
  if (!/^\d+$/.test(valor) || id < 1 || id > 2147483647) return new Response(null, { status: 404 });
  const referencias = req.nextUrl.searchParams.getAll('ref');
  redirect(rutaSeguimiento(id, referencias.length === 1 ? referencias[0] : undefined));
}
