'use client';

import { useEffect, useState } from 'react';
import AdminLogin from '@/components/AdminLogin';
import AdminDashboard from '@/components/AdminDashboard';

export default function AdminPage() {
  const [autenticado, setAutenticado] = useState<boolean | null>(null);

  async function verificarSesion() {
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      setAutenticado(!!data.authenticated);
    } catch {
      setAutenticado(false);
    }
  }

  useEffect(() => {
    verificarSesion();
  }, []);

  if (autenticado === null) {
    return (
      <div className="min-h-screen bg-crema flex items-center justify-center">
        <p className="text-sm text-verde-noche/60">Cargando…</p>
      </div>
    );
  }

  if (!autenticado) {
    return <AdminLogin onSuccess={verificarSesion} />;
  }

  return <AdminDashboard onLogout={() => setAutenticado(false)} />;
}
