import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getPedidoByIdPublic } from '@/lib/db';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import CartDrawer from '@/components/CartDrawer';
import PedidoEstadoClient from '@/components/PedidoEstadoClient';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Detalle del pedido',
  robots: { index: false, follow: false },
  referrer: 'no-referrer'
};

export default async function MiPedidoPage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ref?: string | string[] }>;
}) {
  const { id: valor } = await params;
  const id = Number(valor);
  if (!/^\d+$/.test(valor) || id < 1 || id > 2147483647) notFound();
  const { ref } = await searchParams;
  const referencia = typeof ref === 'string' ? ref : undefined;
  const pedido = await getPedidoByIdPublic(id, referencia);
  if (!pedido) notFound();

  return (
    <div className="shop flex flex-col">
      <Header />
      <PedidoEstadoClient key={pedido.id} pedidoInicial={pedido} referencia={referencia} />
      <Footer />
      <CartDrawer />
    </div>
  );
}
