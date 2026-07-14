/**
 * Cloudflare Worker — proxy de imágenes de Supabase Storage
 *
 * Poné esto en un Worker de Cloudflare (gratis, 100k req/día).
 * Binding: images.casaycosas.cl → este worker.
 *
 * 1. Creá una cuenta en cloudflare.com (gratis)
 * 2. Andá a Workers & Pages → Create Worker
 * 3. Pegá este código
 * 4. En Settings → Triggers → Custom Domains, agregá images.casaycosas.cl
 * 5. En DigitalPlat, creá un CNAME: images → casaycosas-next.pages.dev (o el dominio del worker)
 */

const SUPABASE_ORIGIN = 'https://TU-PROJECT-REF.supabase.co';

export default {
  async fetch(request) {
    const url = new URL(request.url);

    const targetUrl = `${SUPABASE_ORIGIN}${url.pathname}${url.search}`;

    const response = await fetch(targetUrl, {
      method: request.method,
      headers: request.headers,
    });

    if (!response.ok) {
      return new Response('Not Found', { status: 404 });
    }

    const headers = new Headers(response.headers);
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    headers.set('CDN-Cache-Control', 'public, max-age=31536000');

    return new Response(response.body, {
      status: response.status,
      headers,
    });
  },
};
