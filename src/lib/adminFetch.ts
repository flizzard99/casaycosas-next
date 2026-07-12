function getCsrfToken(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/(?:^|;\s*)cyc_admin_csrf=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export async function adminFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers || {});
  const method = (init.method || 'GET').toUpperCase();
  if (method !== 'GET' && method !== 'HEAD') {
    const token = getCsrfToken();
    if (token) headers.set('x-csrf-token', token);
  }
  return fetch(input, { ...init, headers });
}