'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState, type CSSProperties, type MouseEvent } from 'react';
import { useRouter } from 'next/navigation';
import { ENLACES_LEGALES } from '@/lib/legal';
import { tienda } from '@/lib/config';

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
    imagen: '/oveja-logo-hd.webp',
    alt: 'Oveja del logo de Casa y Cosas'
  }
] as const;

type SeccionId = typeof SECCIONES[number]['id'];

export default function HomeSectionSelector() {
  const router = useRouter();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const menuRef = useRef<HTMLDialogElement>(null);
  const [activa, setActiva] = useState<SeccionId>('matera');
  const [entrando, setEntrando] = useState<SeccionId | null>(null);
  const [menuAbierto, setMenuAbierto] = useState(false);
  const seleccionada = SECCIONES.find(({ id }) => id === entrando);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  useEffect(() => {
    const menu = menuRef.current;
    if (!menu) return;
    if (menuAbierto && !menu.open) menu.showModal();
    if (!menuAbierto && menu.open) menu.close();
  }, [menuAbierto]);

  function entrar(event: MouseEvent<HTMLAnchorElement>, seccion: typeof SECCIONES[number]) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || entrando) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    event.preventDefault();
    setActiva(seccion.id);
    setEntrando(seccion.id);
    timer.current = setTimeout(() => router.push(seccion.href), 680);
  }

  function cerrarDesdeFondo(event: MouseEvent<HTMLDialogElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) {
      setMenuAbierto(false);
    }
  }

  return (
    <main className="home-selector" data-active={activa} data-entering={entrando ?? undefined}>
      <div className="home-selector-glow" aria-hidden="true" />
      <header className="home-selector-header">
        <div className="home-selector-brand">
          <Image src="/oveja-logo-hd.webp" alt="" width={52} height={52} unoptimized priority />
          <span>Casa y Cosas</span>
        </div>
        <div className="home-selector-intro">
          <p>Encuentra tu espacio</p>
          <h1>Elige tu sección</h1>
        </div>
        <nav className="home-mini-navigation" aria-label="Navegación principal">
          <Link href="/seguimiento">Seguimiento</Link>
          <a href={tienda.whatsappUrl} target="_blank" rel="noopener noreferrer">Ayuda</a>
          <button type="button" className="home-menu-toggle" aria-label={menuAbierto ? 'Cerrar menú de información' : 'Abrir menú de información'}
            aria-expanded={menuAbierto} aria-controls="home-information-menu" onClick={() => setMenuAbierto((abierto) => !abierto)}>
            <span aria-hidden="true"><i /><i /><i /></span>
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

      <dialog ref={menuRef} id="home-information-menu" className="home-information-menu" aria-labelledby="home-menu-title"
        onClose={() => setMenuAbierto(false)} onClick={cerrarDesdeFondo}>
        <div className="home-menu-heading">
          <div>
            <span>Casa y Cosas</span>
            <h2 id="home-menu-title">Información de la tienda</h2>
          </div>
          <button type="button" onClick={() => setMenuAbierto(false)} aria-label="Cerrar menú">×</button>
        </div>
        <nav aria-label="Políticas de la tienda">
          {ENLACES_LEGALES.map(({ href, label }) => (
            <Link key={href} href={href} onClick={() => setMenuAbierto(false)}>
              {label}<b aria-hidden="true">↗</b>
            </Link>
          ))}
        </nav>
        <div className="home-menu-support">
          <Link href="/seguimiento" onClick={() => setMenuAbierto(false)}>Seguir mi pedido</Link>
          <a href={tienda.whatsappUrl} target="_blank" rel="noopener noreferrer">Contactar por WhatsApp</a>
        </div>
      </dialog>

      {seleccionada && (
        <div className={`home-zoom-layer home-zoom-${seleccionada.id}`} aria-live="polite" aria-label={`Abriendo ${seleccionada.titulo}`}>
          <Image src={seleccionada.imagen} alt={seleccionada.alt} width={1254} height={1254} unoptimized priority />
          <span>{seleccionada.titulo}</span>
        </div>
      )}
    </main>
  );
}
