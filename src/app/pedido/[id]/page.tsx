export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { getPedidoByIdPublic, parseIdOrBadRequest } from '@/lib/db';
import PedidoEstadoClient from '@/components/PedidoEstadoClient';
import { notFound } from 'next/navigation';

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ token?: string }> };

export const metadata = {
  title: 'Seguimiento de pedido',
  robots: { index: false, follow: false }
};

export default async function PedidoPage({ params, searchParams }: Props) {
  const id = parseIdOrBadRequest((await params).id);
  if (id === null) notFound();
  const query = await searchParams;
  const token = typeof query.token === 'string' ? query.token : '';
  const pedido = await getPedidoByIdPublic(id, token);
  if (!pedido) notFound();
  return <PedidoEstadoClient pedidoInicial={{ ...pedido, cliente_email: '', cliente_whatsapp: '', tracking_token: '' }} token={token} />;
}
