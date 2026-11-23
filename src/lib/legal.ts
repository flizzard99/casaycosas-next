export const VERSION_LEGAL = '2026-11-23';
export const FECHA_LEGAL = '23 de noviembre de 2026';

export const DATOS_VENDEDOR = {
  nombreFantasia: 'Casa y Cosas',
  razonSocial: 'Comercializadora Nexus Solutions SpA',
  rut: '78.267.639-3',
  domicilio: 'Panguipulli, Región de Los Ríos, Chile',
  email: 'comercializadoranexussolutions@gmail.com'
} as const;

export const ENLACES_LEGALES = [
  { href: '/terminos-y-condiciones', label: 'Términos y condiciones' },
  { href: '/privacidad', label: 'Privacidad' },
  { href: '/despachos', label: 'Despachos' },
  { href: '/cambios-devoluciones', label: 'Cambios, retracto y garantía' }
] as const;
