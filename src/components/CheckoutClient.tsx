'use client';

import { useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useCart } from '@/context/CartContext';

const clp = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' });
const campos = [
  { name: 'nombre', label: 'Nombre y apellido', autoComplete: 'name', maxLength: 100 },
  { name: 'email', label: 'Correo electrónico', autoComplete: 'email', maxLength: 200, type: 'email' },
  { name: 'telefono', label: 'Teléfono de contacto', autoComplete: 'tel', maxLength: 20, type: 'tel' },
  { name: 'region', label: 'Región', autoComplete: 'address-level1', maxLength: 100 },
  { name: 'comuna', label: 'Comuna', autoComplete: 'address-level2', maxLength: 100 },
  { name: 'direccion', label: 'Dirección, número y departamento si corresponde', autoComplete: 'street-address', maxLength: 250 }
];

export default function CheckoutClient() {
  const { items, total, hydrated, removeItem } = useCart();
  const intento = useRef<{ clave: string; referencia: string }>();
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState('');
  const [seguimiento, setSeguimiento] = useState('');

  async function continuar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (procesando || !items.length || total < 1 || seguimiento) return;
    const datos = Object.fromEntries(new FormData(event.currentTarget));
    const productos = items.map(({ id, qty }) => ({ id, qty }));
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
      <fieldset disabled={procesando || !!seguimiento} className="grid gap-4 shop-panel rounded-xl border p-5 sm:grid-cols-2">
        <legend className="px-2 font-semibold">Datos de despacho</legend>
        {campos.map(({ name, label, autoComplete, maxLength, type }) => (
          <label className={name === 'direccion' ? 'sm:col-span-2' : ''} key={name}>
            <span className="mb-1 block text-sm font-medium">{label}</span>
            <input name={name} type={type || 'text'} autoComplete={autoComplete} maxLength={maxLength} required
              className="min-h-11 w-full shop-control rounded-lg border px-3 text-base" />
          </label>
        ))}
      </fieldset>

      <section aria-labelledby="resumen-compra" className="shop-panel rounded-xl border p-5">
        <h2 id="resumen-compra" className="font-semibold">Resumen de tu compra</h2>
        <ul className="my-4 space-y-2 text-sm">
          {items.map((item) => (
            <li key={item.id} className="flex justify-between gap-3">
              <div>
                <span>{item.qty} × {item.name}</span>
                <button type="button" onClick={() => removeItem(item.id)} disabled={procesando || !!seguimiento}
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
        {error && <p className="mb-3 text-sm text-red-700" role="alert">{error}</p>}
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
