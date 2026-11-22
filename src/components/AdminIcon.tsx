const paths = {
  diseno: 'M4 4h16v16H4zM4 16l5-5 4 4 3-3 4 4M15 8h.01',
  productos: 'M3 7h18v13H3zM3 7l3-4h12l3 4M9 11h6',
  pedidos: 'M6 6h3m6 0h3v15H6V6m3-3h6v5H9zM9 13h6m-6 4h6',
  categorias: 'M3 4h8l10 10-7 7L3 10V4zM7 8h.01',
  destacados: 'm12 3 2.8 5.7 6.2.9-4.5 4.4 1 6.2-5.5-2.9-5.5 2.9 1-6.2L3 9.6l6.2-.9L12 3z',
  salir: 'M10 4H4v16h6m4-12 4 4-4 4m-6-4h13',
  externo: 'M13 4h7v7m0-7-9 9m7 0v7H4V6h7',
  mas: 'M12 5v14M5 12h14',
  menos: 'M5 12h14',
  editar: 'm15 5 4 4M4 20l1-5L16 4a2.8 2.8 0 0 1 4 4L9 19l-5 1z',
  papelera: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v5m4-5v5',
  visible: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zM15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0z',
  oculto: 'M3 3l18 18M9.6 5.3A10.8 10.8 0 0 1 12 5c6.5 0 10 7 10 7a14 14 0 0 1-2.7 3.5M6.1 6.6A15 15 0 0 0 2 12s3.5 7 10 7c1.6 0 3-.4 4.3-1',
  izquierda: 'm15 6-6 6 6 6',
  derecha: 'm9 6 6 6-6 6',
  arriba: 'M12 20V4m-6 6 6-6 6 6',
  abajo: 'M12 4v16m-6-6 6 6 6-6',
  cerrar: 'm6 6 12 12M18 6 6 18',
  guardar: 'M4 4h13l3 3v13H4zM8 4v6h8V4M8 20v-6h8v6',
  check: 'm5 12 4 4L19 6',
  recargar: 'M20 7v5h-5m5 0a8 8 0 1 0-2 5',
  subir: 'M12 16V4m-5 5 5-5 5 5M4 16v4h16v-4',
  encuadrar: 'M9 4H4v5m11-5h5v5M4 15v5h5m11-5v5h-5M9 9h6v6H9z',
  recortar: 'M6 3v15h15M3 6h15v15',
  zoom: 'M16 10a6 6 0 1 1-12 0 6 6 0 0 1 12 0zm-1.6 4.4L21 21M7 10h6m-3-3v6',
  candado: 'M5 11h14v10H5zM8 11V7a4 4 0 0 1 8 0v4m-4 4v2',
  despacho: 'M2 5h13v12H8m-4 0H2V5m13 4h4l3 4v4h-2m-4 0h-1M8 18a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm12 0a2 2 0 1 1-4 0 2 2 0 0 1 4 0z',
  campana: 'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M9.5 21h5',
} as const;

export default function AdminIcon({ name, className = 'size-[18px]' }: {
  name: keyof typeof paths;
  className?: string;
}) {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={`shrink-0 ${className}`}>
      <path d={paths[name]} />
    </svg>
  );
}
