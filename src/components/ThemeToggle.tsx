'use client';

import { useSyncExternalStore } from 'react';

const PREFERENCIA = '(prefers-color-scheme: dark)';
const CLAVE = 'cyc-tema';
const EVENTO = 'cyc-cambio-tema';

function esOscuro() {
  const preferencia = document.documentElement.dataset.tiendaTema;
  return preferencia ? preferencia === 'oscuro' : window.matchMedia(PREFERENCIA).matches;
}

function observar(cambio: () => void) {
  const media = window.matchMedia(PREFERENCIA);
  function sincronizarPestana(event: StorageEvent) {
    if (event.key !== CLAVE && event.key !== null) return;
    const raiz = document.documentElement;
    if (event.newValue === 'claro' || event.newValue === 'oscuro') raiz.dataset.tiendaTema = event.newValue;
    else delete raiz.dataset.tiendaTema;
    cambio();
  }

  media.addEventListener('change', cambio);
  window.addEventListener(EVENTO, cambio);
  window.addEventListener('storage', sincronizarPestana);
  return () => {
    media.removeEventListener('change', cambio);
    window.removeEventListener(EVENTO, cambio);
    window.removeEventListener('storage', sincronizarPestana);
  };
}

function cambiarTema() {
  const tema = esOscuro() ? 'claro' : 'oscuro';
  document.documentElement.dataset.tiendaTema = tema;
  try {
    localStorage.setItem(CLAVE, tema);
  } catch {
    // La elección sigue activa en la página si no hay almacenamiento.
  }
  window.dispatchEvent(new Event(EVENTO));
}

export default function ThemeToggle() {
  const oscuro = useSyncExternalStore(observar, esOscuro, () => false);
  const destino = oscuro ? 'Claro' : 'Oscuro';

  return (
    <button type="button" className="shop-icon-button shop-theme-toggle" onClick={cambiarTema}
      role="switch" aria-label="Modo oscuro" aria-checked={oscuro}
      title={`Cambiar a modo ${destino.toLowerCase()}`}>
      <svg aria-hidden="true" focusable="false" width="21" height="21" viewBox="0 0 24 24"
        fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        {oscuro ? (
          <path d="M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.4 1.4m11.2 11.2L19 19M5 19l1.4-1.4M17.6 6.4 19 5" />
        ) : (
          <path d="M20.6 15A9 9 0 1 1 9 3.4 7.5 7.5 0 0 0 20.6 15Z" />
        )}
      </svg>
      <span aria-hidden="true" className="shop-theme-label">{destino}</span>
    </button>
  );
}
