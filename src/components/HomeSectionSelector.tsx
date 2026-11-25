'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState, type CSSProperties, type MouseEvent } from 'react';
import { useRouter } from 'next/navigation';
import { ENLACES_LEGALES } from '@/lib/legal';
import { tienda } from '@/lib/config';
import { useCart } from '@/context/CartContext';

const SECCIONES = [
  {
    id: 'matera',
    titulo: 'Matera',
    descripcion: 'El ritual, los sabores y los accesorios para compartir un buen mate.',
    href: '/matera',
    imagen: '/oveja-matera-hd.webp',
    alt: 'Oveja de Casa y Cosas tomando mate'
  },
  {
    id: 'cristiana',
    titulo: 'Cristiana',
    descripcion: 'Biblias, restauraciones y detalles para acompañar tu camino de fe.',
    href: '/cristiana',
    imagen: '/oveja-lectora-hd.webp',
    alt: 'Oveja de Casa y Cosas leyendo un libro'
  },
  {
    id: 'casa',
    titulo: 'Casa y Cosas',
    descripcion: 'Detalles especiales para regalar, disfrutar y hacer hogar.',
    href: '/remate',
    imagen: '/oveja-casa-y-cosas.webp',
    alt: 'Oveja de Casa y Cosas con artículos para el hogar y regalos'
  }
] as const;

type SeccionId = typeof SECCIONES[number]['id'];

export default function HomeSectionSelector() {
  const router = useRouter();
  const { count, open: abrirCarrito } = useCart();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [activa, setActiva] = useState<SeccionId | null>(null);
  const [entrando, setEntrando] = useState<SeccionId | null>(null);
  const seleccionada = SECCIONES.find(({ id }) => id === entrando);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  function entrar(event: MouseEvent<HTMLAnchorElement>, seccion: typeof SECCIONES[number]) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || entrando) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    event.preventDefault();
    setActiva(seccion.id);
    setEntrando(seccion.id);
    timer.current = setTimeout(() => router.push(seccion.href), 680);
  }

  return (
    <main className="home-selector" data-active={activa ?? undefined} data-entering={entrando ?? undefined}>
      <div className="home-selector-glow" aria-hidden="true" />
      <header className="home-selector-header">
        <div className="home-selector-brand">
          <Image src="/oveja-logo-hd.webp" alt="" width={52} height={52} unoptimized priority />
          <span>Casa y Cosas</span>
        </div>
        <div className="home-selector-intro">
          <p>Encuentra tu espacio</p>
          <h1>ELIGE TU SECCIÓN</h1>
        </div>
        <nav className="home-mini-navigation" aria-label="Navegación principal">
          <button type="button" className="home-cart-button" onClick={abrirCarrito}
            aria-label={count ? `Abrir carrito, ${count} productos` : 'Abrir carrito'} aria-haspopup="dialog">
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
              <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" strokeLinejoin="round" />
              <path d="M3 6h18M16 10a4 4 0 0 1-8 0" strokeLinecap="round" />
            </svg>
            {count > 0 && <span>{count > 99 ? '99+' : count}</span>}
          </button>
        </nav>
      </header>

      <section className="home-section-list" aria-label="Secciones de la tienda">
        {SECCIONES.map((seccion, index) => (
          <Link
            key={seccion.id}
            href={seccion.href}
            prefetch={false}
            className="home-section-card"
            data-section={seccion.id}
            aria-label={`Explorar sección ${seccion.titulo}`}
            style={{ '--section-index': index } as CSSProperties}
            onPointerEnter={() => setActiva(seccion.id)}
            onFocus={() => setActiva(seccion.id)}
            onClick={(event) => entrar(event, seccion)}
          >
            <span className="home-section-art" aria-hidden="true">
              <span className="home-section-orbit" />
              <Image src={seccion.imagen} alt="" width={1254} height={1254} loading="eager"
                unoptimized className="home-section-sheep" />
            </span>
            <span className="home-section-copy">
              <span className="home-section-title">{seccion.titulo}</span>
              <span className="home-section-description">{seccion.descripcion}</span>
              <span className="home-section-link">Explorar <span aria-hidden="true">↗</span></span>
            </span>
          </Link>
        ))}
      </section>

      <p className="home-selector-hint"><span aria-hidden="true" /> Pasa el cursor o selecciona una sección</p>

      <footer className="home-legal-footer">
        <nav aria-label="Políticas de la tienda">
          {ENLACES_LEGALES.map(({ href, label }) => (
            <Link key={href} href={href}>{label}</Link>
          ))}
        </nav>
        <nav className="home-footer-support" aria-label="Ayuda">
          <Link href="/seguimiento">Seguimiento</Link>
          <a href={tienda.whatsappUrl} target="_blank" rel="noopener noreferrer">Ayuda por WhatsApp</a>
        </nav>
      </footer>

      {seleccionada && (
        <div className={`home-zoom-layer home-zoom-${seleccionada.id}`} aria-live="polite" aria-label={`Abriendo ${seleccionada.titulo}`}>
          <Image src={seleccionada.imagen} alt={seleccionada.alt} width={1254} height={1254} unoptimized priority />
          <span>{seleccionada.titulo}</span>
        </div>
      )}
    </main>
  );
}
