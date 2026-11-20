import 'server-only';

export function origenTienda() {
  try {
    const url = new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://www.casaycosas.cl');
    return url.protocol === 'https:' ? url.origin : null;
  } catch {
    return null;
  }
}
