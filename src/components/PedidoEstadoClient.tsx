'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import type { PedidoPublico } from '@/lib/db';
import { tienda } from '@/lib/config';
import { useCart } from '@/context/CartContext';
import { CAMPOS_TRANSFERENCIA, ENVIO_CHILE, TRANSFERENCIA_RESERVA_HORAS } from '@/lib/checkout';

const formatoCLP = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });

const ESTADO_CONFIG: Record<PedidoPublico['estado'], { label: string; bg: string; emoji: string; desc: string }> = {
  pendiente: { label: 'Pendiente', bg: 'bg-amber-100 text-amber-700 border-amber-200', emoji: '⏳', desc: 'La tienda está revisando tu pedido.' },
  confirmado: { label: 'Confirmado', bg: 'bg-verde/15 text-verde-oscuro border-verde/30', emoji: '✅', desc: 'Tu pedido fue confirmado. Puedes contactarnos para coordinar la entrega.' },
  cancelado: { label: 'Cancelado', bg: 'bg-red-100 text-red-700 border-red-200', emoji: '❌', desc: 'El pedido fue cancelado y el stock restaurado.' },
  expirado: { label: 'Expirado', bg: 'bg-gray-100 text-gray-600 border-gray-200', emoji: '⌛', desc: 'Venció el plazo de pago y se liberó el stock.' },
};

const POLL_MS = 20000;

type Props = { pedidoInicial: PedidoPublico; referencia?: string };

export default function PedidoEstadoClient({ pedidoInicial, referencia }: Props) {
  const [pedido, setPedido] = useState(pedidoInicial);
  const [now, setNow] = useState<number | null>(null);

  const fetchEstado = useCallback(async () => {
    try {
      const res = await fetch(`/api/pedido/${pedidoInicial.id}${referencia ? `?ref=${encodeURIComponent(referencia)}` : ''}`, { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      setPedido(data);
    } catch {
      // network error, ignoramos
    }
  }, [pedidoInicial.id, referencia]);

  useEffect(() => {
    if (pedido.estado !== 'pendiente' && (pedido.estado !== 'confirmado' || pedido.despachado_at)) return;
    const interval = setInterval(fetchEstado, POLL_MS);
    const tick = pedido.estado === 'pendiente' ? setInterval(() => setNow(Date.now()), 1000) : undefined;
    return () => { clearInterval(interval); clearInterval(tick); };
  }, [pedido.estado, pedido.despachado_at, fetchEstado]);

  const { items, hydrated, clear } = useCart();
  const transferenciaPendiente = pedido.metodo_pago === 'transferencia' && pedido.estado === 'pendiente';
  const compraRegistrada = transferenciaPendiente || pedido.pago_estado === 'aprobado';
  useEffect(() => {
    if (!hydrated || !compraRegistrada || !referencia) return;
    try {
      const pendiente = JSON.parse(sessionStorage.getItem('cyc-pago') || 'null');
      if (pendiente?.referencia !== referencia) return;
      const actual = items.map(({ id, qty, varianteId }) => ({ id, qty, varianteId }));
      if (JSON.stringify(actual) === JSON.stringify(pendiente.productos)) clear();
      sessionStorage.removeItem('cyc-pago');
    } catch {
      return;
    }
  }, [clear, compraRegistrada, hydrated, items, referencia]);

  const cfg = ESTADO_CONFIG[pedido.estado];
  const expMs = pedido.expiracionAt;
  const restaMs = Math.max(0, expMs - (now ?? expMs));
  const restaH = Math.floor(restaMs / 3600000);
  const restaM = Math.floor((restaMs % 3600000) / 60000);
  const restaS = Math.floor((restaMs % 60000) / 1000);
  const datosTransferencia = transferenciaPendiente && (now === null || restaMs > 0) ? pedido.datos_transferencia : null;
  const mensaje = `Hola, escribo por el pedido #${pedido.id}.`;

  return (
    <div className="min-h-screen bg-crema flex flex-col">
      <header className="bg-white border-b border-verde-noche/10 px-4 py-3">
        <Link href="/" className="inline-flex items-center gap-2 text-verde-noche hover:text-verde-oscuro">
          <span className="text-lg">🌿</span>
          <span className="font-display text-sm">Casa y Cosas</span>
        </Link>
      </header>

      <main className="flex-1 flex items-start sm:items-center justify-center px-4 py-6 sm:py-10">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-verde-noche/5 overflow-hidden">
          <div className="px-6 py-5 border-b border-verde-noche/5">
            <p className="text-xs text-verde-noche/50 uppercase tracking-wide">Pedido</p>
            <h1 className="font-display text-3xl text-verde-noche">#{pedido.id}</h1>
            <p className="text-xs text-verde-noche/50 mt-1">
              {new Date(pedido.created_at).toLocaleString('es-CL', { dateStyle: 'long', timeStyle: 'short', timeZone: 'America/Santiago' })}
            </p>
          </div>

          <div className="px-6 py-4">
            <div className={`rounded-xl border px-4 py-3 mb-4 ${cfg.bg}`}>
              <p className="font-semibold text-sm flex items-center gap-2">
                <span className="text-lg">{cfg.emoji}</span> {pedido.pago_estado === 'revision' ? 'Pago en revisión' : pedido.despachado_at ? 'Despachado' : transferenciaPendiente ? 'Pendiente de transferencia' : cfg.label}
              </p>
              <p className="text-xs mt-1 opacity-80">
                {pedido.pago_estado === 'revision' ? 'Tu pago requiere revisión. Escríbenos con el número de pedido.' :
                  pedido.despachado_at ? 'Tu pedido está en camino.' :
                  pedido.pago_estado === 'aprobado' ? (pedido.costo_envio ? 'Pago recibido. El envío ya está incluido.' : 'Pago de productos aprobado. El despacho se paga al recibir.') :
                  transferenciaPendiente ? 'Tu pedido está registrado. Confirmaremos el pago cuando recibamos la transferencia.' :
                  pedido.pago_estado === 'pendiente' && pedido.estado === 'pendiente' ? 'Estamos esperando la confirmación de Mercado Pago.' : cfg.desc}
              </p>
              {pedido.codigo_despacho && <p className="mt-2 text-sm font-semibold">Seguimiento del despacho: {pedido.codigo_despacho}</p>}
            </div>

            {pedido.estado === 'pendiente' && (
              <div className="text-center mb-4">
                <p className="text-xs text-verde-noche/50 uppercase tracking-wide mb-1">Expira en</p>
                <p className="font-display text-xl text-verde-noche tabular-nums">
                  {now === null ? '…' : `${restaH ? `${restaH}h ` : ''}${restaM.toString().padStart(2, '0')}m ${restaS.toString().padStart(2, '0')}s`}
                </p>
              </div>
            )}

            <div className="mb-5">
              <p className="text-xs text-verde-noche/50 uppercase tracking-wide mb-2">Productos</p>
              <div className="space-y-1.5">
                {pedido.items.map((item, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-verde-noche">{item.qty}× {item.nombre}</span>
                    <span className="text-verde-noche/70">{formatoCLP.format(item.precio * item.qty)}</span>
                  </div>
                ))}
              </div>
              {pedido.costo_envio > 0 && (
                <div className="mt-2 flex justify-between gap-3 text-sm text-verde-noche">
                  <span>Envío · {ENVIO_CHILE.servicio}</span><span>{formatoCLP.format(pedido.costo_envio)}</span>
                </div>
              )}
              <div className="flex justify-between pt-2 mt-2 border-t border-verde-noche/10">
                <span className="font-semibold text-verde-noche">Total</span>
                <span className="font-semibold text-verde">{formatoCLP.format(pedido.total)}</span>
              </div>
            </div>

            {datosTransferencia && (
              <section aria-labelledby="datos-transferencia" className="mb-5 rounded-xl border border-verde-noche/10 bg-crema/40 p-4">
                <h2 id="datos-transferencia" className="font-semibold text-verde-noche">Datos para transferir</h2>
                <p className="mt-1 text-sm text-verde-noche/80">Transfiere <strong>{formatoCLP.format(pedido.total)}</strong> e indica <strong>Pedido #{pedido.id}</strong> como referencia. La reserva dura {TRANSFERENCIA_RESERVA_HORAS} horas.</p>
                <dl className="mt-3 grid gap-2 text-sm">
                  {CAMPOS_TRANSFERENCIA.map(({ clave, etiqueta }) => datosTransferencia[clave] && (
                    <div key={clave}><dt className="font-semibold">{etiqueta}</dt><dd className="break-words">{datosTransferencia[clave]}</dd></div>
                  ))}
                </dl>
                {datosTransferencia.correo && (
                  <a className="mt-3 inline-block text-sm font-semibold underline" href={`mailto:${datosTransferencia.correo}?subject=${encodeURIComponent(`Comprobante del pedido #${pedido.id}`)}`}>
                    Enviar comprobante por correo
                  </a>
                )}
              </section>
            )}

            {(pedido.estado === 'pendiente' || pedido.estado === 'confirmado' || pedido.pago_estado === 'revision') && (
              <a
                href={`https://wa.me/${tienda.whatsappNumber}?text=${encodeURIComponent(mensaje)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full block text-center bg-verde text-white text-sm font-semibold py-3 rounded-lg hover:bg-verde-oscuro mb-2"
              >
                Contactar por WhatsApp
              </a>
            )}

            {(pedido.estado === 'expirado' || pedido.estado === 'cancelado') && (
              <Link
                href="/"
                className="w-full block text-center bg-verde text-white text-sm font-semibold py-3 rounded-lg hover:bg-verde-oscuro"
              >
                Volver a las colecciones
              </Link>
            )}
          </div>
        </div>
      </main>

      <footer className="text-center py-3 text-xs text-verde-noche/40">
        Casa y Cosas
      </footer>
    </div>
  );
}
