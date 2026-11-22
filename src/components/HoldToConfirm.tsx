'use client';

import { useEffect, useId, useRef, useState, type ButtonHTMLAttributes, type KeyboardEvent, type PointerEvent } from 'react';
import AdminIcon from './AdminIcon';

type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'onClick'> & {
  label: string;
  confirmedLabel?: string;
  duration?: number;
  onConfirm: () => void;
};

export default function HoldToConfirm({
  label,
  confirmedLabel = 'Confirmado',
  duration = 1500,
  onConfirm,
  disabled,
  className = '',
  ...props
}: Props) {
  const hintId = useId();
  const fillRef = useRef<HTMLSpanElement>(null);
  const animationRef = useRef<Animation | undefined>(undefined);
  const resetRef = useRef<number | undefined>(undefined);
  const holdingRef = useRef(false);
  const originRef = useRef({ x: 0, y: 0 });
  const [holding, setHolding] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  function resetFill() {
    if (fillRef.current) fillRef.current.style.clipPath = 'inset(0 100% 0 0)';
  }

  function cancelHold() {
    if (!holdingRef.current) return;
    holdingRef.current = false;
    setHolding(false);
    const fill = fillRef.current;
    const animation = animationRef.current;
    if (!fill || !animation) return;
    const current = getComputedStyle(fill).clipPath;
    animation.cancel();
    animationRef.current = fill.animate(
      [{ clipPath: current }, { clipPath: 'inset(0 100% 0 0)' }],
      { duration: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 220, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'forwards' }
    );
    animationRef.current.onfinish = resetFill;
  }

  function completeHold() {
    if (!holdingRef.current) return;
    holdingRef.current = false;
    setHolding(false);
    setConfirmed(true);
    if (fillRef.current) fillRef.current.style.clipPath = 'inset(0 0 0 0)';
    if ('vibrate' in navigator) navigator.vibrate(30);
    onConfirm();
    resetRef.current = window.setTimeout(() => {
      setConfirmed(false);
      resetFill();
    }, 1400);
  }

  function startHold() {
    if (disabled || confirmed || holdingRef.current || !fillRef.current) return;
    window.clearTimeout(resetRef.current);
    animationRef.current?.cancel();
    resetFill();
    holdingRef.current = true;
    setHolding(true);
    animationRef.current = fillRef.current.animate(
      [{ clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0 0 0)' }],
      { duration, easing: 'linear', fill: 'forwards' }
    );
    animationRef.current.onfinish = completeHold;
  }

  function pointerDown(event: PointerEvent<HTMLButtonElement>) {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    event.preventDefault();
    originRef.current = { x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
    startHold();
  }

  function pointerMove(event: PointerEvent<HTMLButtonElement>) {
    if (!holdingRef.current) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const fuera = event.clientX < rect.left - 24 || event.clientX > rect.right + 24 ||
      event.clientY < rect.top - 24 || event.clientY > rect.bottom + 24;
    const desplazamiento = Math.hypot(event.clientX - originRef.current.x, event.clientY - originRef.current.y);
    if (fuera && desplazamiento > 24) cancelHold();
  }

  function keyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if ((event.key === ' ' || event.key === 'Enter') && !event.repeat) {
      event.preventDefault();
      startHold();
    }
  }

  function keyUp(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      cancelHold();
    }
  }

  useEffect(() => () => {
    window.clearTimeout(resetRef.current);
    animationRef.current?.cancel();
  }, []);

  const contenido = (
    <span className="inline-flex items-center justify-center gap-2 px-3">
      <AdminIcon name={confirmed ? 'check' : 'papelera'} />
      {confirmed ? confirmedLabel : label}
    </span>
  );

  return (
    <button
      {...props}
      type="button"
      disabled={disabled}
      aria-describedby={hintId}
      aria-label={props['aria-label'] ?? label}
      aria-disabled={confirmed || disabled}
      onClick={(event) => event.preventDefault()}
      onPointerDown={pointerDown}
      onPointerMove={pointerMove}
      onPointerUp={cancelHold}
      onPointerCancel={cancelHold}
      onLostPointerCapture={cancelHold}
      onKeyDown={keyDown}
      onKeyUp={keyUp}
      onBlur={cancelHold}
      onContextMenu={(event) => { if (holding) event.preventDefault(); }}
      className={`relative isolate inline-grid min-h-11 overflow-hidden rounded-lg border border-red-300 bg-white text-sm font-semibold text-red-800 shadow-sm transition-[transform,box-shadow] select-none touch-manipulation hover:border-red-400 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transform-none motion-reduce:transition-none ${holding ? 'scale-[0.98]' : ''} ${className}`}
    >
      <span className="col-start-1 row-start-1 inline-flex items-center justify-center">{contenido}</span>
      <span ref={fillRef} aria-hidden="true" className="absolute inset-0 z-10 grid bg-red-700 text-white"
        style={{ clipPath: 'inset(0 100% 0 0)' }}>
        {contenido}
      </span>
      <span id={hintId} className="sr-only">
        Mantén presionado durante {(duration / 1000).toLocaleString('es-CL')} segundos. Con teclado, mantén Espacio o Enter.
      </span>
      <span role="status" className="sr-only">{confirmed ? confirmedLabel : ''}</span>
    </button>
  );
}
