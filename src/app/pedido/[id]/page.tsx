export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { getPedidoByIdPublic, parseIdOrBadRequest } from '@/lib/db';
import PedidoEstadoClient from '@/components/PedidoEstadoClient';
import Link from 'next/link';

export const metadata = {
  title: 'Seguimiento de pedido',
  robots: { index: false, follow: false },
  referrer: 'no-referrer' as const
};

export default async function PedidoPage({ params, searchParams }: {
  params: { id: string };
  searchParams: { ref?: string };
}) {
  const id = parseIdOrBadRequest(params.id);
  if (id === null) return NotFound();
  const referencia = typeof searchParams.ref === 'string' ? searchParams.ref : undefined;
  const pedido = await getPedidoByIdPublic(id, referencia);
  if (!pedido) return NotFound();
  return <PedidoEstadoClient pedidoInicial={pedido} referencia={referencia} />;
}

function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-crema px-4">
      <div className="text-center max-w-sm">
        <h1 className="font-display text-2xl text-verde-noche mb-2">Pedido no encontrado</h1>
        <p className="text-sm text-verde-noche/60 mb-4">El número de pedido no existe o fue eliminado.</p>
        <Link href="/catalogo" className="inline-block bg-verde text-white text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-verde-oscuro">
          Ver catálogo
        </Link>
      </div>
    </div>
  );
}