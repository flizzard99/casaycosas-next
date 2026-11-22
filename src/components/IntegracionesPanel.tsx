'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { adminFetch } from '@/lib/adminFetch';

type Estado = {
  correo: { configurado: boolean; codigo?: string; detalle?: string; remitente?: string };
  mercadoPago: { configurado: boolean; codigo: string; sandbox: boolean };
  sitio: string | null;
};

export default function IntegracionesPanel() {
  const [estado, setEstado] = useState<Estado>();
  const [resultado, setResultado] = useState<{ texto: string; error?: boolean }>();
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    adminFetch('/api/integraciones', { signal: controller.signal }).then(async (response) => {
      if (response.ok) setEstado(await response.json());
    }).catch(() => undefined);
    return () => controller.abort();
  }, []);

  async function probar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = String(new FormData(event.currentTarget).get('email') || '');
    setEnviando(true);
    setResultado(undefined);
    try {
      const response = await adminFetch('/api/integraciones', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email })
      });
      const data = await response.json().catch(() => null);
      setResultado(response.ok
        ? { texto: 'Resend aceptó el correo de prueba. Revisa también spam.' }
        : { texto: `${data?.code ? `${data.code}: ` : ''}${data?.error || 'La prueba falló.'}`, error: true });
    } catch {
      setResultado({ texto: 'No pudimos ejecutar la prueba.', error: true });
    } finally {
      setEnviando(false);
    }
  }

  return (
    <details className="mb-4 rounded-xl border border-verde-noche/15 bg-white p-4">
      <summary className="cursor-pointer text-sm font-semibold">Estado de pagos y correos</summary>
      <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <div className="rounded-lg border border-verde-noche/10 p-3">
          <p className="font-semibold">Mercado Pago</p>
          <p className={estado?.mercadoPago.configurado ? 'text-verde-oscuro' : 'text-red-700'}>
            {estado ? (estado.mercadoPago.configurado ? `Variables coherentes · modo ${estado.mercadoPago.sandbox ? 'prueba' : 'producción'}` : estado.mercadoPago.codigo) : 'Comprobando…'}
          </p>
        </div>
        <div className="rounded-lg border border-verde-noche/10 p-3">
          <p className="font-semibold">Correo transaccional</p>
          <p className={estado?.correo.configurado ? 'text-verde-oscuro' : 'text-red-700'}>
            {estado ? (estado.correo.configurado ? `Configurado · ${estado.correo.remitente}` : `${estado.correo.codigo}: ${estado.correo.detalle}`) : 'Comprobando…'}
          </p>
        </div>
      </div>
      <form onSubmit={probar} className="mt-4 flex flex-wrap items-end gap-2">
        <label className="min-w-56 flex-1 text-sm">Enviar prueba a
          <input name="email" type="email" required maxLength={200} className="mt-1 block min-h-10 w-full rounded-lg border border-verde-noche/20 px-3" />
        </label>
        <button type="submit" disabled={enviando} className="min-h-10 rounded-lg bg-verde-oscuro px-3 text-sm font-semibold text-white disabled:opacity-50">
          {enviando ? 'Enviando…' : 'Probar correo'}
        </button>
      </form>
      {resultado && <p role="status" className={`mt-3 text-sm ${resultado.error ? 'text-red-700' : 'text-verde-oscuro'}`}>{resultado.texto}</p>}
      {estado?.sitio && <p className="mt-3 break-all text-xs text-verde-noche/60">URL configurada: {estado.sitio}</p>}
    </details>
  );
}
