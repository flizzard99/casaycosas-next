'use client';

import { useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { claveCarrito, useCart } from '@/context/CartContext';
import { REGIONES_CHILE } from '@/lib/geografiaChile';

const clp = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' });
const campos = [
  { name: 'nombre', label: 'Nombre y apellido', autoComplete: 'name', maxLength: 100 },
  { name: 'email', label: 'Correo electrónico', autoComplete: 'email', maxLength: 200, type: 'email' },
  { name: 'telefono', label: 'Teléfono de contacto', autoComplete: 'tel', maxLength: 20, type: 'tel' }
];
const claseCampo = 'shop-control min-h-11 w-full min-w-0 rounded-lg border px-3 text-base';

export default function CheckoutClient() {
  const { items, total, hydrated, removeItem } = useCart();
  const intento = useRef<{ clave: string; referencia: string } | null>(null);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState('');
  const [seguimiento, setSeguimiento] = useState('');
  const [region, setRegion] = useState('');
  const [comuna, setComuna] = useState('');
  const comunas = REGIONES_CHILE.find(({ nombre }) => nombre === region)?.comunas ?? [];

  async function continuar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (procesando || !items.length || total < 1 || seguimiento) return;
    const datos = Object.fromEntries(new FormData(event.currentTarget));
    const productos = items.map(({ id, qty, varianteId }) => ({ id, qty, varianteId }));
    const clave = JSON.stringify({ datos, productos, total });
    const referencia = intento.current?.clave === clave ? intento.current.referencia : crypto.randomUUID();
    intento.current = { clave, referencia };
    setProcesando(true);
    setError('');
    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...datos, referencia, total, items: productos })
      });
      const resultado = await response.json();
      if (!response.ok) {
        setError(resultado.error || 'No se pudo iniciar el pago.');
        return;
      }
      if (!resultado.url) {
        setSeguimiento(resultado.seguimiento);
        return;
      }
      try {
        sessionStorage.setItem('cyc-pago', JSON.stringify({ referencia, productos }));
      } catch {
        // El flujo de pago funciona si el navegador bloquea el almacenamiento.
      }
      window.location.assign(resultado.url);
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
      <fieldset disabled={procesando || !!seguimiento} className="grid min-w-0 gap-4 shop-panel rounded-xl border p-5 sm:grid-cols-2">
        <legend className="px-2 font-semibold">Datos de despacho</legend>
        {campos.map(({ name, label, autoComplete, maxLength, type }) => (
          <label className={name === 'nombre' ? 'sm:col-span-2' : 'min-w-0'} key={name}>
            <span className="mb-1 block text-sm font-medium">{label}</span>
            <input name={name} type={type || 'text'} autoComplete={autoComplete} maxLength={maxLength} required
              className={claseCampo} />
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
          <span className="mb-1 block text-sm font-medium">Dirección, número y departamento si corresponde</span>
          <input name="direccion" autoComplete="street-address" maxLength={250} required className={claseCampo} />
        </label>
      </fieldset>

      <section aria-labelledby="resumen-compra" className="shop-panel rounded-xl border p-5">
        <h2 id="resumen-compra" className="font-semibold">Resumen de tu compra</h2>
        <ul className="my-4 space-y-2 text-sm">
          {items.map((item) => (
            <li key={claveCarrito(item)} className="flex justify-between gap-3">
              <div>
                <span>{item.qty} × {item.name}</span>
                <button type="button" onClick={() => removeItem(item.id, item.varianteId)} disabled={procesando || !!seguimiento}
                  aria-label={`Quitar ${item.name} del carrito`} className="shop-muted mt-1 block min-h-8 text-xs underline disabled:opacity-50">
                  Quitar
                </button>
              </div>
              <span className="shrink-0">{clp.format(item.price * item.qty)}</span>
            </li>
          ))}
        </ul>
        <div className="flex justify-between gap-3 shop-divider border-t pt-3 font-semibold">
          <span>Total en Mercado Pago</span><span>{clp.format(total)}</span>
        </div>
        <p className="my-4 shop-image-surface rounded-lg p-3 text-sm leading-relaxed">
          <strong>Envío por pagar.</strong> El costo del despacho se paga al transportista cuando recibas tu pedido. No está incluido en este total.
        </p>
        {error && <p className="mb-3 text-sm shop-danger" role="alert">{error}</p>}
        {seguimiento ? (
          <Link href={seguimiento} className="inline-flex min-h-11 items-center font-semibold underline">Ver estado del pedido</Link>
        ) : (
          <button type="submit" disabled={procesando || total < 1} className="shop-button min-h-12 w-full">
            {procesando ? 'Abriendo Mercado Pago…' : 'Continuar a Mercado Pago'}
          </button>
        )}
      </section>
    </form>
  );
}
