'use client';

import { useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { claveCarrito, useCart } from '@/context/CartContext';
import { REGIONES_CHILE } from '@/lib/geografiaChile';
import { ENVIO_CHILE, normalizarRut, type MetodoPago } from '@/lib/checkout';
import CampoRut from './CampoRut';

const clp = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' });
const campos = [
  { name: 'nombre', label: 'Nombre y Apellido', autoComplete: 'name', maxLength: 100 },
  { name: 'rut', label: 'RUT', autoComplete: 'off', maxLength: 16 },
  { name: 'email', label: 'Correo electrónico', autoComplete: 'email', maxLength: 200, type: 'email' },
  { name: 'telefono', label: 'Teléfono de contacto', autoComplete: 'tel', maxLength: 20, type: 'tel' }
];
const claseCampo = 'shop-control min-h-11 w-full min-w-0 rounded-lg border px-3 text-base';

export default function CheckoutClient({ tarjeta, transferencia }: { tarjeta: boolean; transferencia: boolean }) {
  const { items, total: subtotal, hydrated, removeItem } = useCart();
  const total = subtotal + ENVIO_CHILE.precio;
  const intento = useRef<{ clave: string; referencia: string } | null>(null);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState('');
  const [metodoPago, setMetodoPago] = useState<MetodoPago>(tarjeta ? 'tarjeta' : 'transferencia');
  const [rut, setRut] = useState('');
  const [region, setRegion] = useState('');
  const [comuna, setComuna] = useState('');
  const comunas = REGIONES_CHILE.find(({ nombre }) => nombre === region)?.comunas ?? [];

  async function continuar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (procesando || !items.length || subtotal < 1) return;
    const datos = Object.fromEntries(new FormData(event.currentTarget));
    const rut = normalizarRut(datos.rut);
    if (!rut) {
      setError('Ingresa un RUT chileno válido.');
      event.currentTarget.querySelector<HTMLInputElement>('input[name=rut]')?.focus();
      return;
    }
    const productos = items.map(({ id, qty, varianteId }) => ({ id, qty, varianteId }));
    const aceptaTerminos = datos.aceptaTerminos === 'on';
    const clave = JSON.stringify({ datos: { ...datos, rut, aceptaTerminos }, metodoPago, productos, total });
    const referencia = intento.current?.clave === clave ? intento.current.referencia : crypto.randomUUID();
    intento.current = { clave, referencia };
    setProcesando(true);
    setError('');
    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...datos, rut, aceptaTerminos, metodoPago, referencia, total, items: productos })
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
        <legend className="px-2 font-semibold">Datos de despacho</legend>
        {campos.map(({ name, label, autoComplete, maxLength, type }) => (
          <label className="min-w-0" key={name}>
            <span className="mb-1 block text-sm font-medium">{label}</span>
            {name === 'rut' ? (
              <CampoRut name="rut" value={rut} onValueChange={setRut} required className={claseCampo} />
            ) : (
              <input name={name} type={type || 'text'} autoComplete={autoComplete} maxLength={maxLength} required className={claseCampo} />
            )}
          </label>
        ))}
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
        </label>
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
          <div className="flex justify-between gap-3"><dt>Envío · {ENVIO_CHILE.servicio}</dt><dd>{clp.format(ENVIO_CHILE.precio)}</dd></div>
          <div className="flex justify-between gap-3 text-base font-semibold"><dt>Total a pagar</dt><dd>{clp.format(total)}</dd></div>
        </dl>
        <p className="mt-2 text-xs shop-muted">Tarifa fija a todo Chile. El envío se paga junto con el pedido.</p>
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
          <input name="aceptaTerminos" type="checkbox" required className="shop-checkbox mt-0.5 size-4 shrink-0" />
          <span>He leído y acepto los <Link href="/terminos-y-condiciones" target="_blank" className="font-semibold underline">términos y condiciones</Link>, la <Link href="/privacidad" target="_blank" className="font-semibold underline">política de privacidad</Link> y las políticas de <Link href="/despachos" target="_blank" className="font-semibold underline">despacho</Link> y <Link href="/cambios-devoluciones" target="_blank" className="font-semibold underline">cambios y garantía</Link>.</span>
        </label>
        {error && <p className="mb-3 text-sm shop-danger" role="alert">{error}</p>}
        <button type="submit" disabled={procesando || subtotal < 1} className="shop-button min-h-12 w-full">
          {metodoPago === 'tarjeta' ? (procesando ? 'Abriendo Mercado Pago…' : 'Continuar a Mercado Pago') :
            (procesando ? 'Registrando pedido…' : 'Finalizar pedido por transferencia')}
        </button>
      </section>
    </form>
  );
}
