'use client';

import { useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { claveCarrito, useCart } from '@/context/CartContext';
import { REGIONES_CHILE } from '@/lib/geografiaChile';
import { ENVIO_CHILE, type MetodoPago } from '@/lib/checkout';
import { tienda } from '@/lib/config';

const clp = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' });
const campos = [
  { name: 'nombre', label: 'Nombre y Apellido', autoComplete: 'name', maxLength: 100 },
  { name: 'email', label: 'Correo electrónico', autoComplete: 'email', maxLength: 200, type: 'email' },
  { name: 'telefono', label: 'Teléfono de contacto', autoComplete: 'tel', maxLength: 20, type: 'tel' }
];
const claseCampo = 'shop-control min-h-11 w-full min-w-0 rounded-lg border px-3 text-base';

export default function CheckoutClient({ tarjeta, transferencia }: { tarjeta: boolean; transferencia: boolean }) {
  const { items, total: subtotal, hydrated, removeItem } = useCart();
  const intento = useRef<{ clave: string; referencia: string } | null>(null);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState('');
  const [metodoPago, setMetodoPago] = useState<MetodoPago>(tarjeta ? 'tarjeta' : 'transferencia');
  const [aceptaTerminos, setAceptaTerminos] = useState(false);
  const [conEnvio, setConEnvio] = useState(true);
  const [region, setRegion] = useState('');
  const [comuna, setComuna] = useState('');
  const comunas = REGIONES_CHILE.find(({ nombre }) => nombre === region)?.comunas ?? [];
  const costoEnvio = conEnvio ? ENVIO_CHILE.precio : 0;
  const total = subtotal + costoEnvio;

  async function continuar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (procesando || !items.length || subtotal < 1) return;
    const datos = Object.fromEntries(new FormData(event.currentTarget));
    const productos = items.map(({ id, qty, varianteId }) => ({ id, qty, varianteId }));
    const clave = JSON.stringify({ datos: { ...datos, aceptaTerminos }, conEnvio, metodoPago, productos, total });
    const referencia = intento.current?.clave === clave ? intento.current.referencia : crypto.randomUUID();
    intento.current = { clave, referencia };
    setProcesando(true);
    setError('');
    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...datos, aceptaTerminos, conEnvio, metodoPago, referencia, total, items: productos })
      });
      const resultado = await response.json();
      if (!response.ok) {
        setError(resultado.error || 'No se pudo iniciar el pago.');
        return;
      }
      try {
        sessionStorage.setItem('cyc-pago', JSON.stringify({ referencia, productos }));
      } catch {
        // El flujo de pago funciona si el navegador bloquea el almacenamiento.
      }
      window.location.assign(resultado.url || resultado.seguimiento);
    } catch {
      setError('No pudimos conectar con la tienda. Intenta nuevamente.');
    } finally {
      setProcesando(false);
    }
  }

  if (!hydrated) return <p role="status">Cargando carrito…</p>;
  if (!items.length) return <p>Tu carrito está vacío. <Link className="underline" href="/">Volver a las colecciones</Link></p>;

  return (
    <form onSubmit={continuar} className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <fieldset disabled={procesando} className="grid min-w-0 gap-4 shop-panel rounded-xl border p-5 sm:grid-cols-2">
        <legend className="px-2 font-semibold">Datos del pedido</legend>
        <p className="shop-muted text-sm sm:col-span-2">Usamos tus datos para el pago, los avisos del pedido y el despacho si lo eliges. Si necesitas factura, <Link href="/terminos-y-condiciones#factura" target="_blank" className="underline">consulta cómo solicitarla</Link>. Conoce tus derechos en la <Link href="/privacidad" target="_blank" className="underline">política de privacidad</Link>.</p>
        {campos.map(({ name, label, autoComplete, maxLength, type }) => (
          <label className="min-w-0" key={name}>
            <span className="mb-1 block text-sm font-medium">{label}</span>
            <input name={name} type={type || 'text'} autoComplete={autoComplete} maxLength={maxLength} required className={claseCampo} />
          </label>
        ))}
        <fieldset className="grid gap-2 sm:col-span-2 sm:grid-cols-2">
          <legend className="mb-2 text-sm font-semibold">Modalidad de entrega</legend>
          {[true, false].map((opcion) => (
            <label key={String(opcion)} className="shop-control flex min-h-12 items-center gap-2 rounded-lg border px-3 py-2 has-[:checked]:border-[var(--shop-accent)] has-[:checked]:bg-[var(--shop-subtle)]">
              <input type="radio" name="modalidad" value={opcion ? 'envio' : 'sin-envio'} checked={conEnvio === opcion}
                onChange={() => { setConEnvio(opcion); setError(''); }} className="shop-checkbox size-4 shrink-0" />
              <span className="text-sm font-semibold">{opcion ? 'Con envío' : 'Sin envío'}</span>
              <span className="shop-muted ml-auto text-xs">{clp.format(opcion ? ENVIO_CHILE.precio : 0)}</span>
            </label>
          ))}
        </fieldset>
        {!conEnvio && <p className="shop-muted text-sm sm:col-span-2">Coordina la entrega con la tienda por <a href={tienda.whatsappUrl} target="_blank" rel="noopener noreferrer" className="underline">WhatsApp</a>.</p>}
        <fieldset disabled={!conEnvio} hidden={!conEnvio} className={conEnvio ? 'grid min-w-0 gap-4 sm:col-span-2 sm:grid-cols-2' : 'hidden'}>
          <label className="min-w-0">
            <span className="mb-1 block text-sm font-medium">Región</span>
            <select name="region" required autoComplete="address-level1" className={`${claseCampo} truncate`}
              value={region} onChange={(event) => { setRegion(event.target.value); setComuna(''); }}>
              <option value="" disabled>Selecciona una región</option>
              {REGIONES_CHILE.map(({ nombre, nombreCorto }) => (
                <option key={nombre} value={nombre}>{nombreCorto ?? nombre}</option>
              ))}
            </select>
          </label>
          <label className="min-w-0">
            <span className="mb-1 block text-sm font-medium">Comuna</span>
            <select name="comuna" required autoComplete="address-level2" disabled={!region}
              value={comuna} onChange={(event) => setComuna(event.target.value)} className={`${claseCampo} disabled:opacity-60`}>
              <option value="" disabled>{region ? 'Selecciona una comuna' : 'Selecciona primero una región'}</option>
              {comunas.map((nombre) => <option key={nombre} value={nombre}>{nombre}</option>)}
            </select>
          </label>
          <label className="sm:col-span-2">
            <span className="mb-1 block text-sm font-medium">Dirección</span>
            <input name="direccion" autoComplete="street-address" maxLength={250} required className={claseCampo}
              placeholder="Calle, número y departamento si corresponde" />
          </label>
          <label className="sm:col-span-2">
            <span className="mb-1 block text-sm font-medium">Agregar nota <span className="shop-muted font-normal">(opcional)</span></span>
            <textarea name="nota" maxLength={500} rows={2} className={`${claseCampo} resize-y py-2`} />
            <span className="shop-muted text-xs">Incluye solo instrucciones de entrega. Evita datos sensibles, claves o información bancaria.</span>
          </label>
        </fieldset>
      </fieldset>

      <section aria-labelledby="resumen-compra" className="shop-panel rounded-xl border p-5">
        <h2 id="resumen-compra" className="font-semibold">Resumen de tu compra</h2>
        <ul className="my-4 space-y-2 text-sm">
          {items.map((item) => (
            <li key={claveCarrito(item)} className="flex justify-between gap-3">
              <div>
                <span>{item.qty} × {item.name}</span>
                <button type="button" onClick={() => removeItem(item.id, item.varianteId)} disabled={procesando}
                  aria-label={`Quitar ${item.name} del carrito`} className="shop-muted mt-1 block min-h-8 text-xs underline disabled:opacity-50">
                  Quitar
                </button>
              </div>
              <span className="shrink-0">{clp.format(item.price * item.qty)}</span>
            </li>
          ))}
        </ul>
        <dl className="space-y-2 shop-divider border-t pt-3 text-sm">
          <div className="flex justify-between gap-3"><dt>Subtotal</dt><dd>{clp.format(subtotal)}</dd></div>
          <div className="flex justify-between gap-3"><dt>{conEnvio ? `Envío · ${ENVIO_CHILE.servicio}` : 'Sin envío'}</dt><dd>{clp.format(costoEnvio)}</dd></div>
          <div className="flex justify-between gap-3 text-base font-semibold" aria-live="polite"><dt>Total a pagar</dt><dd>{clp.format(total)}</dd></div>
        </dl>
        {conEnvio && <p className="mt-2 text-xs shop-muted">Tarifa fija a todo Chile. El envío se paga junto con el pedido.</p>}
        <fieldset disabled={procesando} className="my-4 space-y-2">
          <legend className="mb-2 text-sm font-semibold">Medio de pago</legend>
          {([
            { metodo: 'tarjeta', titulo: 'Tarjeta', ayuda: 'Paga en Mercado Pago.', disponible: tarjeta },
            { metodo: 'transferencia', titulo: 'Transferencia', ayuda: 'Verás los datos bancarios al finalizar.', disponible: transferencia }
          ] as const).map(({ metodo, titulo, ayuda, disponible }) => (
            <label key={metodo} className="shop-control flex items-center gap-3 rounded-lg border px-3 py-2 has-[:checked]:border-[var(--shop-accent)] has-[:checked]:bg-[var(--shop-subtle)] has-[:disabled]:opacity-60">
              <input type="radio" name="metodoPago" value={metodo} checked={metodoPago === metodo} disabled={!disponible}
                onChange={() => { setMetodoPago(metodo); setError(''); }} className="shop-checkbox size-4 shrink-0" />
              <span className="grid gap-0.5"><span className="text-sm font-semibold">{titulo}</span>
                <span className="shop-muted text-xs">{disponible ? ayuda : 'Temporalmente no disponible.'}</span></span>
            </label>
          ))}
        </fieldset>
        <label className="mb-4 flex items-start gap-2 text-xs leading-5 shop-muted">
          <input name="aceptaTerminos" type="checkbox" required checked={aceptaTerminos}
            onChange={(event) => setAceptaTerminos(event.target.checked)} className="shop-checkbox mt-0.5 size-4 shrink-0" />
          <span>Acepto los <Link href="/terminos-y-condiciones" target="_blank" className="font-semibold underline">términos y condiciones</Link> y las políticas de <Link href="/despachos" target="_blank" className="font-semibold underline">despacho</Link> y <Link href="/cambios-devoluciones" target="_blank" className="font-semibold underline">cambios y garantía</Link>.</span>
        </label>
        {error && <p className="mb-3 text-sm shop-danger" role="alert">{error}</p>}
        <button type="submit" disabled={procesando || subtotal < 1 || !aceptaTerminos} className="shop-button min-h-12 w-full">
          {metodoPago === 'tarjeta' ? (procesando ? 'Abriendo Mercado Pago…' : 'Continuar a Mercado Pago') :
            (procesando ? 'Registrando pedido…' : 'Finalizar pedido por transferencia')}
        </button>
      </section>
    </form>
  );
}
