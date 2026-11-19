'use client';

import AdminIcon from './AdminIcon';
import { useState } from 'react';

export default function AdminLogin({ onSuccess }: { onSuccess: () => void }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  const [mostrarPass, setMostrarPass] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setCargando(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'No se pudo iniciar sesión');
        return;
      }
      onSuccess();
    } catch {
      setError('Error de conexión. Intenta de nuevo.');
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="min-h-screen bg-crema flex items-center justify-center px-6">
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-8 w-full max-w-sm">
        <h1 className="font-display text-2xl text-verde-noche mb-1">Panel de administración</h1>
        <p className="text-sm text-verde-noche/60 mb-6">Casa y Cosas</p>
        <label htmlFor="admin-password" className="block text-sm font-medium text-verde-noche mb-1.5">Contraseña</label>
        <div className="relative mb-4">
          <input
            id="admin-password"
            name="password"
            autoComplete="current-password"
            required
            aria-invalid={!!error}
            aria-describedby={error ? 'admin-login-error' : undefined}
            type={mostrarPass ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-2.5 pr-12 rounded-md border border-verde-noche/20 focus:outline-none focus:ring-2 focus:ring-verde"
            autoFocus
          />
          <button
            type="button"
            onClick={() => setMostrarPass((v) => !v)}
            className="absolute right-1 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-lg hover:bg-crema/60"
            aria-label={mostrarPass ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          >
            <AdminIcon name={mostrarPass ? 'oculto' : 'visible'} className="size-5" />
          </button>
        </div>
        {error && <p id="admin-login-error" role="alert" className="text-sm text-red-600 mb-4">{error}</p>}
        <button
          type="submit"
          disabled={cargando}
          className="inline-flex w-full items-center justify-center gap-2 bg-verde-oscuro text-white font-semibold py-2.5 rounded-md hover:bg-verde-oscuro disabled:opacity-60"
        >
          <AdminIcon name="candado" /> {cargando ? 'Ingresando…' : 'Ingresar'}
        </button>
      </form>
    </div>
  );
}
