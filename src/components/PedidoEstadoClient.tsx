'use client';

import { useEffect, useState, useCallback, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { QRCodeSVG } from 'qrcode.react';
import type { Pedido } from '@/lib/db';
import { tienda } from '@/lib/config';

const formatoCLP = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });

const ESTADO_CONFIG: Record<Pedido['estado'], { label: string; bg: string; emoji: string; desc: string }> = {
  pendiente: { label: 'Pendiente', bg: 'bg-amber-100 text-amber-700 border-amber-200', emoji: '⏳', desc: 'La tienda está revisando tu pedido.' },
  confirmado: { label: 'Confirmado', bg: 'bg-verde/15 text-verde-oscuro border-verde/30', emoji: '✅', desc: 'Tu pedido fue confirmado. Te esperamos en la tienda.' },
  cancelado: { label: 'Cancelado', bg: 'bg-red-100 text-red-700 border-red-200', emoji: '❌', desc: 'El pedido fue cancelado y el stock restaurado.' },
  expirado: { label: 'Expirado', bg: 'bg-gray-100 text-gray-600 border-gray-200', emoji: '⌛', desc: 'El pedido expiró (48h sin confirmación). El stock fue restaurado.' },
};

const POLL_MS = 20000;
let clockSnapshot = 0;
const serverClock = () => 0;
const getClockSnapshot = () => clockSnapshot;
function subscribeClock(listener: () => void) {
  clockSnapshot = Date.now();
  const interval = setInterval(() => { clockSnapshot = Date.now(); listener(); }, 1000);
  return () => clearInterval(interval);
}

type Props = { pedidoInicial: Pedido; token: string };

export default function PedidoEstadoClient({ pedidoInicial, token }: Props) {
  const [pedido, setPedido] = useState<Pedido & { expiracionAt?: number }>(pedidoInicial as Pedido & { expiracionAt?: number });
  const now = useSyncExternalStore(subscribeClock, getClockSnapshot, serverClock);
  const [qrGrande, setQrGrande] = useState(false);

  const fetchEstado = useCallback(async () => {
    try {
      const res = await fetch(`/api/pedido/${pedidoInicial.id}?token=${encodeURIComponent(token)}`, { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      setPedido(data);
    } catch {
      // network error, ignoramos
    }
  }, [pedidoInicial.id, token]);

  useEffect(() => {
    if (pedido.estado !== 'pendiente') return;
    const interval = setInterval(fetchEstado, POLL_MS);
    return () => clearInterval(interval);
  }, [pedido.estado, fetchEstado]);

  const cfg = ESTADO_CONFIG[pedido.estado];
  const createdMs = new Date(pedido.created_at).getTime();
  const expMs = pedido.expiracionAt ? new Date(pedido.expiracionAt).getTime() : createdMs + 48 * 3600 * 1000;
  const restaMs = Math.max(0, expMs - now);
  const restaH = Math.floor(restaMs / 3600000);
  const restaM = Math.floor((restaMs % 3600000) / 60000);
  const restaS = Math.floor((restaMs % 60000) / 1000);

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
                <span className="text-lg">{cfg.emoji}</span> {cfg.label}
              </p>
              <p className="text-xs mt-1 opacity-80">{cfg.desc}</p>
            </div>

            {pedido.estado === 'pendiente' && (
              <div className="text-center mb-4">
                <p className="text-xs text-verde-noche/50 uppercase tracking-wide mb-1">Expira en</p>
                <p className="font-display text-xl text-verde-noche tabular-nums">
                  {now === 0 ? 'Calculando…' : <>{restaH > 0 && <>{restaH}h </>}{restaM.toString().padStart(2, '0')}m {restaS.toString().padStart(2, '0')}s</>}
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
              <div className="flex justify-between pt-2 mt-2 border-t border-verde-noche/10">
                <span className="font-semibold text-verde-noche">Total</span>
                <span className="font-semibold text-verde">{formatoCLP.format(pedido.total)}</span>
              </div>
            </div>

            {(pedido.estado === 'pendiente' || pedido.estado === 'confirmado') && (
              <div className="flex flex-col items-center mb-4">
                <p className="text-xs text-verde-noche/50 uppercase tracking-wide mb-2">Muestra este QR en la tienda</p>
                <button
                  onClick={() => setQrGrande(true)}
                  className="p-3 bg-white rounded-xl border border-verde-noche/10 hover:bg-crema transition-colors"
                  aria-label="Ampliar QR"
                >
                  <QRCodeSVG value={`${tienda.siteUrl}/pedido/${pedido.id}?token=${encodeURIComponent(token)}`} size={128} bgColor="#ffffff" fgColor="#344E41" level="M" />
                </button>
                <p className="text-[10px] text-verde-noche/40 mt-1">Toca para ampliar</p>
              </div>
            )}

            {pedido.estado === 'pendiente' && (
              <a
                href={`https://wa.me/${tienda.whatsappNumber}?text=${encodeURIComponent(`Hola! Tengo el pedido #${pedido.id} reservado y quiero coordinar el retiro.`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full block text-center bg-verde text-white text-sm font-semibold py-3 rounded-lg hover:bg-verde-oscuro mb-2"
              >
                Contactar por WhatsApp
              </a>
            )}

            {(pedido.estado === 'expirado' || pedido.estado === 'cancelado') && (
              <Link
                href="/catalogo"
                className="w-full block text-center bg-verde text-white text-sm font-semibold py-3 rounded-lg hover:bg-verde-oscuro"
              >
                Volver al catálogo
              </Link>
            )}
          </div>
        </div>
      </main>

      {qrGrande && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center" onClick={() => setQrGrande(false)}>
          <div className="bg-white p-6 rounded-2xl text-center" onClick={(e) => e.stopPropagation()}>
            <p className="font-display text-2xl text-verde-noche mb-1">Pedido #{pedido.id}</p>
            <p className="text-xs text-verde-noche/50 mb-4">Muestra esto en la tienda</p>
            <QRCodeSVG value={`${tienda.siteUrl}/pedido/${pedido.id}?token=${encodeURIComponent(token)}`} size={280} bgColor="#ffffff" fgColor="#344E41" level="M" />
            <button
              onClick={() => setQrGrande(false)}
              className="mt-4 px-5 py-2 rounded-lg border border-verde-noche/20 text-sm font-semibold text-verde-noche hover:bg-crema"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      <footer className="text-center py-3 text-xs text-verde-noche/40">
        Casa y Cosas · Panguipulli · {tienda.storeAddress}
      </footer>
    </div>
  );
}