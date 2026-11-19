'use client';

import { useEffect, useState } from 'react';

export default function ThemeToggle() {
  const [oscuro, setOscuro] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    function sincronizar() {
      const tema = document.documentElement.dataset.tiendaTema;
      setOscuro(tema === 'oscuro' || (!tema && media.matches));
    }
    sincronizar();
    media.addEventListener('change', sincronizar);
    return () => media.removeEventListener('change', sincronizar);
  }, []);

  function cambiarTema() {
    const tema = oscuro ? 'claro' : 'oscuro';
    document.documentElement.dataset.tiendaTema = tema;
    setOscuro(!oscuro);
    try { localStorage.setItem('cyc-tema', tema); } catch {}
  }

  return (
    <button type="button" className="shop-icon-button shop-theme-toggle" onClick={cambiarTema}
      aria-label="Modo oscuro" aria-pressed={oscuro} title={oscuro ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}>
      <span className="shop-theme-symbol" aria-hidden="true">{oscuro ? '☀' : '☾'}</span>
      <span className="hidden lg:inline">{oscuro ? 'Claro' : 'Oscuro'}</span>
    </button>
  );
}
