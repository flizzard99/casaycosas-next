'use client';

import { useCart } from '@/context/CartContext';

const formatoCLP = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });

export default function CartDrawer() {
  const { items, isOpen, close, updateQty, removeItem, total, clear } = useCart();
  const numeroWhatsapp = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '';

  function enviarPorWhatsapp() {
    if (!items.length) return;
    const lineas = items.map((i) => `• ${i.qty}x ${i.name} — ${formatoCLP.format(i.price * i.qty)}`);
    const mensaje = [`Hola! Quisiera hacer este pedido:`, '', ...lineas, '', `Total: ${formatoCLP.format(total)}`].join(
      '\n'
    );
    const url = `https://wa.me/${numeroWhatsapp}?text=${encodeURIComponent(mensaje)}`;
    window.open(url, '_blank');
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={close} />
      <div className="relative w-full max-w-sm bg-white h-full flex flex-col shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-verde-noche/10">
          <h2 className="font-display text-lg text-verde-noche">Tu carrito</h2>
          <button onClick={close} className="text-verde-noche/60 hover:text-verde-noche text-xl leading-none">
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {items.length === 0 && <p className="text-sm text-verde-noche/60">Tu carrito está vacío.</p>}
          {items.map((item) => (
            <div key={item.id} className="flex gap-3 items-center">
              <div className="w-14 h-14 rounded bg-crema flex-shrink-0 overflow-hidden">
                {item.image_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-verde-noche truncate">{item.name}</p>
                <p className="text-xs text-verde">{formatoCLP.format(item.price)}</p>
                <div className="flex items-center gap-2 mt-1">
                  <button
                    onClick={() => updateQty(item.id, item.qty - 1)}
                    className="w-6 h-6 rounded border border-verde-noche/20 text-sm"
                  >
                    −
                  </button>
                  <span className="text-sm w-5 text-center">{item.qty}</span>
                  <button
                    onClick={() => updateQty(item.id, item.qty + 1)}
                    className="w-6 h-6 rounded border border-verde-noche/20 text-sm"
                  >
                    +
                  </button>
                  <button onClick={() => removeItem(item.id)} className="ml-auto text-xs text-red-500 hover:underline">
                    Quitar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="px-5 py-4 border-t border-verde-noche/10">
          <div className="flex justify-between text-sm mb-3">
            <span className="text-verde-noche/70">Total</span>
            <span className="font-semibold text-verde-noche">{formatoCLP.format(total)}</span>
          </div>
          <button
            onClick={enviarPorWhatsapp}
            disabled={!items.length}
            className="w-full bg-verde text-white text-sm font-semibold py-3 rounded-md hover:bg-verde-oscuro disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            Coordinar pedido por WhatsApp
          </button>
          {items.length > 0 && (
            <button onClick={clear} className="w-full text-xs text-verde-noche/50 hover:text-verde-noche mt-2">
              Vaciar carrito
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
