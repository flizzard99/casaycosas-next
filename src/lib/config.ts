/**
 * Configuración pública de la tienda centralizada.
 * Evita enlaces rotos (ej. `wa.me/undefined`) cuando una variable
 * de entorno NEXT_PUBLIC_* no está configurada en Vercel.
 */

const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '56992139709';

export const tienda = {
  whatsappNumber: WHATSAPP_NUMBER,
  whatsappUrl: `https://wa.me/${WHATSAPP_NUMBER}`,
  whatsappCatalogUrl:
    process.env.NEXT_PUBLIC_WHATSAPP_CATALOG_URL ||
    `https://wa.me/c/${WHATSAPP_NUMBER}`,
  instagramUrl:
    process.env.NEXT_PUBLIC_INSTAGRAM_URL ||
    'https://www.instagram.com/casaycosas.panguipulli/',
  facebookUrl:
    process.env.NEXT_PUBLIC_FACEBOOK_URL ||
    'https://www.facebook.com/people/Tienda-Casa-y-Cosas-Panguipulli/61582181283916/',
  tiktokUrl: process.env.NEXT_PUBLIC_TIKTOK_URL || 'https://www.tiktok.com/@tiendacasaycosas'
} as const;

export type Tienda = typeof tienda;
