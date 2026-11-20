'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { adminFetch } from '@/lib/adminFetch';
import { CAMPOS_TRANSFERENCIA, type DatosTransferencia } from '@/lib/checkout';
import AdminIcon from './AdminIcon';
import CampoRut from './CampoRut';

const cuentaVacia: DatosTransferencia = { titular: '', rut: '', banco: '', tipoCuenta: '', numeroCuenta: '', correo: '' };
const claseCampo = 'min-h-10 min-w-0 rounded-lg border border-verde-noche/20 px-2 font-normal';

export default function TransferenciaEditor() {
  const [datos, setDatos] = useState<DatosTransferencia>();
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/config/transferencia', { signal: controller.signal, cache: 'no-store' })
      .then(async (r) => {
        if (!r.ok) throw new Error();
        const config = await r.json();
        setDatos(config.datos ?? cuentaVacia);
      })
      .catch(() => { if (!controller.signal.aborted) setError('No se pudo cargar la cuenta de cobro.'); })
      .finally(() => { if (!controller.signal.aborted) setCargando(false); });
    return () => controller.abort();
  }, []);

  function editar(clave: keyof DatosTransferencia, valor: string) {
    setDatos((prev) => prev && { ...prev, [clave]: valor });
    setAviso('');
  }

  async function guardar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setAviso('');
    setGuardando(true);
    try {
      const res = await adminFetch('/api/config/transferencia', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(datos)
      });
      const resultado = await res.json();
      if (!res.ok) throw new Error(resultado.error);
      setDatos(resultado.datos);
      setAviso('Cuenta guardada. La transferencia está disponible para pedidos nuevos.');
    } catch (fallo) {
      setError(fallo instanceof Error && fallo.message !== 'Failed to fetch' ? fallo.message : 'No se pudo guardar la cuenta de cobro.');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="mt-3">
      {cargando && <p role="status" className="text-sm">Cargando datos de cobro…</p>}
      {datos && (
        <form onSubmit={guardar}>
          <fieldset disabled={guardando} className="grid gap-3 md:grid-cols-2">
            {CAMPOS_TRANSFERENCIA.map(({ clave, etiqueta, maxLength }) => (
              <label key={clave} className="grid min-w-0 gap-1 text-sm font-medium">
                {etiqueta}{clave === 'correo' && ' (opcional)'}
                {clave === 'rut' ? (
                  <CampoRut required className={claseCampo} value={datos.rut} onValueChange={(valor) => editar(clave, valor)} />
                ) : (
                  <input required={clave !== 'correo'} type={clave === 'correo' ? 'email' : 'text'}
                    inputMode={clave === 'numeroCuenta' ? 'numeric' : undefined} maxLength={maxLength}
                    className={claseCampo} value={datos[clave] ?? ''} onChange={(event) => editar(clave, event.target.value)} />
                )}
              </label>
            ))}
            <button type="submit" className="inline-flex min-h-10 items-center justify-center gap-2 justify-self-start rounded-lg bg-verde-oscuro px-3 text-sm font-semibold text-white disabled:opacity-50">
              <AdminIcon name="guardar" /> {guardando ? 'Guardando…' : 'Guardar cuenta'}
            </button>
          </fieldset>
        </form>
      )}
      {error && <p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}
      {aviso && <p role="status" className="mt-2 text-sm text-verde-oscuro">{aviso}</p>}
    </div>
  );
}
