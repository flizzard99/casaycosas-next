'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import AdminLogin from '@/components/AdminLogin';

const AdminDashboard = dynamic(() => import('@/components/AdminDashboard'), { ssr: false });

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
    fetch('/api/auth/me').then((res) => res.json()).then((data) => setAutenticado(!!data.authenticated)).catch(() => setAutenticado(false));
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
