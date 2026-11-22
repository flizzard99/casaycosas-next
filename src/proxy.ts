import { NextRequest, NextResponse } from 'next/server';

export function proxy(request: NextRequest) {
  const host = request.headers.get('host')?.split(':')[0].toLowerCase();
  if (process.env.TIENDA_PUBLICADA === 'true' || (host !== 'casaycosas.cl' && host !== 'www.casaycosas.cl')) {
    return NextResponse.next();
  }

  const path = request.nextUrl.pathname;
  if (path === '/oveja-portada.webp' || path === '/api/pagos/mercadopago') {
    return NextResponse.next();
  }

  const headers = { 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex' };
  if (path.startsWith('/api/') || !['GET', 'HEAD'].includes(request.method)) {
    return NextResponse.json({ error: 'Tienda en construcción' }, { status: 503, headers });
  }

  const portada = request.nextUrl.clone();
  portada.pathname = '/construccion.html';
  portada.search = '';
  return NextResponse.rewrite(portada, { headers });
}
