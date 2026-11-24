'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState, type CSSProperties, type MouseEvent } from 'react';
import { useRouter } from 'next/navigation';

const SECCIONES = [
  {
    id: 'matera',
    numero: '01',
    titulo: 'Matera',
    descripcion: 'El ritual, los sabores y los accesorios para compartir un buen mate.',
    href: '/matera',
    imagen: '/oveja-matera.webp',
    alt: 'Oveja de Casa y Cosas tomando mate'
  },
  {
    id: 'cristiana',
    numero: '02',
    titulo: 'Cristiana',
    descripcion: 'Biblias, restauraciones y detalles para acompañar tu camino de fe.',
    href: '/cristiana',
    imagen: '/oveja-lectora.webp',
    alt: 'Oveja de Casa y Cosas leyendo un libro'
  },
  {
    id: 'casa',
    numero: '03',
    titulo: 'Casa y Cosas',
    descripcion: 'Detalles especiales para regalar, disfrutar y hacer hogar.',
    href: '/remate',
    imagen: '/oveja-logo.png',
    alt: 'Oveja del logo de Casa y Cosas'
  }
] as const;

type SeccionId = typeof SECCIONES[number]['id'];

export default function HomeSectionSelector() {
  const router = useRouter();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [activa, setActiva] = useState<SeccionId>('matera');
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
    <main className="home-selector" data-active={activa} data-entering={entrando ?? undefined}>
      <div className="home-selector-glow" aria-hidden="true" />
      <header className="home-selector-header">
        <div className="home-selector-brand">
          <Image src="/oveja-logo.png" alt="" width={42} height={44} unoptimized priority />
          <span>Casa y Cosas</span>
        </div>
        <div className="home-selector-intro">
          <p>Encuentra tu espacio</p>
          <h1>Elige tu sección</h1>
        </div>
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
            <span className="home-section-number" aria-hidden="true">{seccion.numero}</span>
            <span className="home-section-art" aria-hidden="true">
              <span className="home-section-orbit" />
              <Image src={seccion.imagen} alt="" width={360} height={360} priority={index === 0}
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

      {seleccionada && (
        <div className={`home-zoom-layer home-zoom-${seleccionada.id}`} aria-live="polite" aria-label={`Abriendo ${seleccionada.titulo}`}>
          <Image src={seleccionada.imagen} alt={seleccionada.alt} width={360} height={360} unoptimized />
          <span>{seleccionada.titulo}</span>
        </div>
      )}
    </main>
  );
}
