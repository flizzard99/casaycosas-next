import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { getPedidoPublico } from '@/lib/db';
import { ORDER_ACCESS_COOKIE_NAME, verifyOrderAccessToken } from '@/lib/auth';
import { retornoMercadoPago } from '@/lib/checkout';
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
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id: valor } = await params;
  const codigo = decodeURIComponent(valor).toUpperCase();
  const parametros = await searchParams;
  const { ref } = parametros;
  const referencia = typeof ref === 'string' ? ref : undefined;
  const { regreso, pagoId } = retornoMercadoPago(parametros);
  const cookieStore = await cookies();
  const accesoAutorizado = verifyOrderAccessToken(cookieStore.get(ORDER_ACCESS_COOKIE_NAME)?.value, codigo);
  const pedido = await getPedidoPublico(codigo, referencia, accesoAutorizado);
  if (!pedido) notFound();

  return (
    <div className="shop flex flex-col">
      <Header />
      <PedidoEstadoClient key={pedido.codigo} pedidoInicial={pedido} referencia={referencia}
        retornoPago={pedido.metodo_pago === 'tarjeta' && regreso} pagoId={pagoId} />
      <Footer />
      <CartDrawer />
    </div>
  );
}
