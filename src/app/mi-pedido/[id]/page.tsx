import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getPedidoPublico } from '@/lib/db';
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
  const codigo = decodeURIComponent(valor).toUpperCase();
  const { ref } = await searchParams;
  const referencia = typeof ref === 'string' ? ref : undefined;
  const pedido = await getPedidoPublico(codigo, referencia);
  if (!pedido) notFound();

  return (
    <div className="shop flex flex-col">
      <Header />
      <PedidoEstadoClient key={pedido.codigo} pedidoInicial={pedido} referencia={referencia} />
      <Footer />
      <CartDrawer />
    </div>
  );
}
