'use client';

import { useState, type FormEvent } from 'react';
import { tienda } from '@/lib/config';

export default function SeguimientoForm() {
  const [codigo, setCodigo] = useState('');
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState('');

  async function consultar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (procesando) return;
    const datos = new FormData(event.currentTarget);
    setProcesando(true);
    setError('');
    try {
      const response = await fetch('/api/seguimiento', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codigo, email: datos.get('email') })
      });
      const resultado = await response.json().catch(() => null);
      if (!response.ok || typeof resultado?.url !== 'string') {
        setError(resultado?.error || 'No pudimos consultar el pedido.');
        return;
      }
      window.location.assign(resultado.url);
    } catch {
      setError('No pudimos conectar con la tienda. Intenta nuevamente.');
    } finally {
      setProcesando(false);
    }
  }

  return (
    <form onSubmit={consultar} className="shop-panel mx-auto grid max-w-lg gap-5 rounded-2xl border p-5 sm:p-7">
      <label>
        <span className="mb-1 block text-sm font-semibold">Código del pedido</span>
        <input name="codigo" value={codigo} onChange={(event) => setCodigo(event.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 24))}
          autoComplete="off" spellCheck={false} required placeholder="Ej. AB213C"
          className="shop-control min-h-12 w-full rounded-lg border px-3 text-base uppercase tracking-[0.18em]" />
      </label>
      <label>
        <span className="mb-1 block text-sm font-semibold">Correo usado en la compra</span>
        <input name="email" type="email" autoComplete="email" maxLength={200} required placeholder="correo@ejemplo.cl"
          className="shop-control min-h-12 w-full rounded-lg border px-3 text-base" />
      </label>
      {error && <p role="alert" className="shop-danger text-sm">{error}</p>}
      <button type="submit" disabled={procesando || codigo.length < 6} className="shop-button min-h-12 disabled:opacity-60">
        {procesando ? 'Buscando pedido…' : 'Consultar pedido'}
      </button>
      <p className="shop-muted text-xs">Por seguridad pedimos el correo asociado al pedido. No necesitas crear una cuenta.</p>
      <p className="shop-muted text-xs">Si necesitas ayuda con un pedido, incluso si es antiguo y no tiene correo asociado, <a className="underline" href={tienda.whatsappUrl} target="_blank" rel="noopener noreferrer">escríbenos por WhatsApp</a>. Ten a mano el código si lo tienes.</p>
    </form>
  );
}
