/** @type {import('next').NextConfig} */
const securityHeaders = [
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Frame-Options', value: 'DENY' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()'
  },
  {
    key: 'Content-Security-Policy',
    value:
      [
        "default-src 'self'",
        "img-src 'self' https://*.supabase.co https://images.casaycosas.qzz.io https://acdn-us.mitiendanube.com https://cdn.sd.com.py https://cdn11.bigcommerce.com https://fimgs.net https://mates.cl https://tangofoodsusa.com https://www.google.com https://www.mundobiblia.com https://www.schwarzenbach.ch data: blob:",
        "script-src 'self' 'unsafe-inline'",
        "style-src 'self' 'unsafe-inline'",
        "font-src 'self' data:",
        "connect-src 'self' https://*.supabase.co https://images.casaycosas.qzz.io https://*.vercel-analytics.com wss://*.supabase.co",
        "frame-ancestors 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "object-src 'none'"
      ].join('; ')
  }
];

const nextConfig = {
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 86400,
    remotePatterns: [
      { protocol: 'https', hostname: '**.supabase.co' },
      { protocol: 'https', hostname: 'images.casaycosas.qzz.io' },
      { protocol: 'https', hostname: 'cdn11.bigcommerce.com' },
      { protocol: 'https', hostname: 'acdn-us.mitiendanube.com' },
      { protocol: 'https', hostname: 'cdn.sd.com.py' },
      { protocol: 'https', hostname: 'fimgs.net' },
      { protocol: 'https', hostname: 'mates.cl' },
      { protocol: 'https', hostname: 'tangofoodsusa.com' },
      { protocol: 'https', hostname: 'www.google.com' },
      { protocol: 'https', hostname: 'www.mundobiblia.com' },
      { protocol: 'https', hostname: 'www.schwarzenbach.ch' }
    ]
  },
  poweredByHeader: false,
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production'
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders
      }
    ];
  }
};

module.exports = nextConfig;