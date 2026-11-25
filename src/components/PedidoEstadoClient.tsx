'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import type { PedidoPublico } from '@/lib/db';
import { tienda } from '@/lib/config';
import { useCart } from '@/context/CartContext';
import { CAMPOS_TRANSFERENCIA, ENVIO_CHILE, TRANSFERENCIA_RESERVA_HORAS } from '@/lib/checkout';
import { formatoCLP } from '@/lib/precios';

const fechaChile = new Intl.DateTimeFormat('es-CL', { dateStyle: 'long', timeStyle: 'short', timeZone: 'America/Santiago' });

const ESTADOS = {
  revision: { etiqueta: 'Pago en revisión', descripcion: 'Contacta a la tienda con el número de tu pedido.', color: 'bg-amber-100 text-amber-900' },
  pendiente: { etiqueta: 'Pedido pendiente', descripcion: 'La tienda está revisando tu pedido.', color: 'bg-amber-100 text-amber-900' },
  transferencia: { etiqueta: 'Pendiente de transferencia', descripcion: 'Confirmaremos el pago cuando recibamos la transferencia.', color: 'bg-amber-100 text-amber-900' },
  tarjeta: { etiqueta: 'Pago por confirmar', descripcion: 'Estamos esperando la confirmación de Mercado Pago. El estado se actualiza automáticamente.', color: 'bg-amber-100 text-amber-900' },
  pagado: { etiqueta: 'Pago confirmado', descripcion: 'Recibimos tu pago. Aquí podrás consultar el seguimiento cuando se registre el despacho.', color: 'shop-action-done' },
  confirmado: { etiqueta: 'Pedido confirmado', descripcion: 'La tienda confirmó tu pedido.', color: 'shop-action-done' },
  despachado: { etiqueta: 'Despachado', descripcion: 'Tu pedido está en camino.', color: 'shop-action-done' },
  cancelado: { etiqueta: 'Pedido cancelado', descripcion: 'Se liberó el stock de este pedido.', color: 'shop-image-surface' },
  expirado: { etiqueta: 'Pedido vencido', descripcion: 'Venció el plazo de pago y se liberó el stock.', color: 'shop-image-surface' }
};

function estadoPedido(pedido: PedidoPublico) {
  if (pedido.pago_estado === 'revision') return ESTADOS.revision;
  if (pedido.despachado_at) return ESTADOS.despachado;
  if (pedido.pago_estado === 'aprobado') return pedido.sin_envio
    ? { ...ESTADOS.pagado, descripcion: 'Recibimos tu pago. Coordina la entrega con la tienda por WhatsApp.' }
    : ESTADOS.pagado;
  if (pedido.estado === 'pendiente' && pedido.metodo_pago) return ESTADOS[pedido.metodo_pago];
  return ESTADOS[pedido.estado];
}

export default function PedidoEstadoClient({ pedidoInicial, referencia }: { pedidoInicial: PedidoPublico; referencia?: string }) {
  const [pedido, setPedido] = useState(pedidoInicial);
  const [ahora, setAhora] = useState<number | null>(null);
  const [noDisponible, setNoDisponible] = useState(false);
  const transferenciaPendiente = pedido.metodo_pago === 'transferencia' && pedido.estado === 'pendiente';

  const fetchEstado = useCallback(async (signal: AbortSignal) => {
    try {
      const respuesta = await fetch(`/api/pedido/${encodeURIComponent(pedidoInicial.codigo)}${referencia ? `?ref=${encodeURIComponent(referencia)}` : ''}`, {
        cache: 'no-store', signal
      });
      if (respuesta.status === 404) setNoDisponible(true);
      if (respuesta.ok) setPedido(await respuesta.json());
    } catch {
      return;
    }
  }, [pedidoInicial.codigo, referencia]);

  useEffect(() => {
    if (noDisponible || (pedido.estado !== 'pendiente' && (pedido.estado !== 'confirmado' || pedido.despachado_at))) return;
    const controller = new AbortController();
    const espera = pedido.estado === 'pendiente' && pedido.metodo_pago === 'tarjeta' ? 10000 : 20000;
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') void fetchEstado(controller.signal);
    }, espera);
    const reloj = transferenciaPendiente ? setInterval(() => setAhora(Date.now()), 1000) : undefined;
    return () => { controller.abort(); clearInterval(interval); clearInterval(reloj); };
  }, [noDisponible, pedido.estado, pedido.metodo_pago, pedido.despachado_at, transferenciaPendiente, fetchEstado]);

  const { items, hydrated, clear } = useCart();
  const compraRegistrada = transferenciaPendiente || pedido.pago_estado === 'aprobado';
  useEffect(() => {
    if (!hydrated || !compraRegistrada || !referencia || noDisponible) return;
    try {
      const pendiente = JSON.parse(sessionStorage.getItem('cyc-pago') || 'null');
      if (pendiente?.referencia !== referencia) return;
      const actual = items.map(({ id, qty, varianteId }) => ({ id, qty, varianteId }));
      if (JSON.stringify(actual) === JSON.stringify(pendiente.productos)) clear();
      sessionStorage.removeItem('cyc-pago');
    } catch {
      return;
    }
  }, [clear, compraRegistrada, hydrated, items, referencia, noDisponible]);

  const estado = estadoPedido(pedido);
  const medioPago = pedido.metodo_pago === 'tarjeta' ? 'Tarjeta · Mercado Pago' : pedido.metodo_pago === 'transferencia' ? 'Transferencia bancaria' : 'Coordinado con la tienda';
  const minutosRestantes = Math.max(0, Math.ceil((pedido.expiracionAt - (ahora ?? pedido.expiracionAt)) / 60000));
  const datosTransferencia = transferenciaPendiente && (ahora === null || minutosRestantes > 0) ? pedido.datos_transferencia : null;
  const mensaje = `Hola, escribo por el pedido ${pedido.codigo}.`;

  if (noDisponible) {
    return (
      <main id="contenido" tabIndex={-1} className="store-shell flex-1 py-12">
        <h1 className="shop-display mb-4 text-4xl">Pedido no disponible</h1>
        <Link href="/" className="shop-button">Volver a la tienda</Link>
      </main>
    );
  }

  return (
    <main id="contenido" tabIndex={-1} className="store-shell flex-1 py-8 sm:py-12">
      <Link href="/" className="shop-accent text-sm font-semibold underline underline-offset-4">Volver a la tienda</Link>
      <div className="mb-7 mt-4 flex flex-wrap items-end justify-between gap-4 sm:mb-9">
        <div>
          <h1 className="shop-display break-words text-3xl sm:text-5xl">Pedido {pedido.codigo}</h1>
          <time dateTime={new Date(pedido.created_at).toISOString()} className="mt-2 block text-sm shop-muted">{fechaChile.format(new Date(pedido.created_at))}</time>
        </div>
        <p role="status" className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold ${estado.color}`}>
          <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />{estado.etiqueta}
        </p>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,23rem)] lg:gap-6">
        <section className="order-2 min-w-0 rounded-2xl border shop-panel p-5 sm:p-6 lg:order-1" aria-labelledby="productos-pedido">
          <h2 id="productos-pedido" className="font-semibold">Productos del pedido</h2>
          <ul className="mt-3 divide-y divide-[var(--shop-line)]">
            {pedido.items.map((item, i) => (
              <li key={i} className="flex items-baseline justify-between gap-3 py-3 text-sm sm:text-base">
                <div className="flex min-w-0 items-baseline gap-3">
                  <span className="shrink-0 tabular-nums shop-muted">{item.qty} ×</span>
                  <span className="min-w-0 break-words">{item.nombre}</span>
                </div>
                <span className="shrink-0 tabular-nums">{formatoCLP.format(item.precio * item.qty)}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-3 space-y-2 border-t shop-divider pt-4 text-sm sm:ml-auto sm:max-w-xs">
            {pedido.costo_envio > 0 && (
              <>
                <div className="flex justify-between gap-3"><dt>Subtotal</dt><dd className="tabular-nums">{formatoCLP.format(pedido.total - pedido.costo_envio)}</dd></div>
                <div className="flex justify-between gap-3"><dt>Envío · {ENVIO_CHILE.servicio}</dt><dd className="tabular-nums">{formatoCLP.format(pedido.costo_envio)}</dd></div>
              </>
            )}
            <div className="flex justify-between gap-3 text-base font-semibold">
              <dt>Total del pedido</dt><dd className="tabular-nums shop-accent">{formatoCLP.format(pedido.total)}</dd>
            </div>
          </dl>
        </section>

        <div className="order-1 grid min-w-0 gap-4 lg:order-2">
          <section aria-labelledby="pago-despacho" className="rounded-2xl border shop-panel p-5">
            <h2 id="pago-despacho" className="font-semibold">Pago y despacho</h2>
            <p className="mt-2 text-sm shop-muted">{estado.descripcion}</p>
            <dl className="mt-4 grid gap-3 border-t shop-divider pt-4 text-sm">
              <div><dt className="font-semibold">Medio de pago</dt><dd className="shop-muted">{medioPago}</dd></div>
              {pedido.sin_envio && <div><dt className="font-semibold">Modalidad de entrega</dt><dd className="shop-muted">Sin envío</dd></div>}
              {pedido.destino_envio && <div><dt className="font-semibold">Destino</dt><dd className="shop-muted">{pedido.destino_envio.comuna}, {pedido.destino_envio.region}</dd></div>}
              {pedido.codigo_despacho && <div><dt className="font-semibold">Código de seguimiento</dt><dd className="break-words shop-muted">{pedido.codigo_despacho}</dd></div>}
            </dl>
            {pedido.pago_url && (
              <a href={pedido.pago_url} className="shop-button mt-4 w-full" rel="nofollow">Continuar pago en Mercado Pago</a>
            )}
          </section>

          {datosTransferencia && (
            <section aria-labelledby="datos-transferencia" className="rounded-2xl border shop-panel p-5">
              <h2 id="datos-transferencia" className="font-semibold">Datos para transferir</h2>
              <p className="mt-2 text-sm shop-muted">Transfiere <strong>{formatoCLP.format(pedido.total)}</strong> e indica <strong>{pedido.codigo}</strong> como referencia. La reserva dura {TRANSFERENCIA_RESERVA_HORAS} horas.</p>
              {ahora !== null && <p className="mt-2 text-sm font-semibold">Tiempo restante: {Math.floor(minutosRestantes / 60)} h {minutosRestantes % 60} min</p>}
              <dl className="mt-4 grid gap-3 border-t shop-divider pt-4 text-sm">
                {CAMPOS_TRANSFERENCIA.map(({ clave, etiqueta }) => datosTransferencia[clave] && (
                  <div key={clave}><dt className="font-semibold">{etiqueta}</dt><dd className="break-words shop-muted">{datosTransferencia[clave]}</dd></div>
                ))}
              </dl>
              {datosTransferencia.correo && (
                <a className="mt-4 inline-block text-sm font-semibold underline shop-accent"
                  href={`mailto:${datosTransferencia.correo}?subject=${encodeURIComponent(`Comprobante del pedido ${pedido.codigo}`)}`}>
                  Enviar comprobante por correo
                </a>
              )}
            </section>
          )}
          <a href={`https://wa.me/${tienda.whatsappNumber}?text=${encodeURIComponent(mensaje)}`}
            target="_blank" rel="noopener noreferrer" className="w-fit text-sm font-semibold underline underline-offset-4 shop-accent">
            Ayuda con este pedido
          </a>
        </div>
      </div>
    </main>
  );
}
