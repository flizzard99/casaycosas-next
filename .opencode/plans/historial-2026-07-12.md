# Historial — 12 julio 2026
Estado: P0+P1 seguridad completos, UX mejorado, build funcional

## Seguridad (P0 + P1 completos)
- **Rate-limit login**: Upstash Redis (5 intentos/15min/IP). Fix double-count bug en `checkRateLimit` (era read-only, `registerFailedAttempt` es el único writer).
- **CSRF tokens**: Ahora expiran 12h (payload tiene `exp`), generados con `crypto.randomBytes(16)` en vez de `Math.random()`.
- **Timing-safe comparison**: `csrf.ts` usa `timingSafeEqual` en vez de `===`.
- **Admin rate-limit**: `src/lib/adminRateLimit.ts` — in-memory Map, 60 req/min, aplicado a las 9 rutas de mutación admin.
- **Max 20 imágenes** por producto en `images/route.ts`.
- **`parseIdOrBadRequest()`** helper en `db.ts`, usado en todas las rutas `[id]`.
- **Error responses sanitizados**: todos los catch retornan `"Error interno del servidor"` sin exponer detalles del error.
- **`saveConfig` transaccional**: BEGIN/COMMIT/ROLLBACK.
- **Upload**: 4MB binary check unificado en `src/lib/uploadLimits.ts`.
- **Phone JSON-LD arreglado**: `+5656...` → `+56...` (doble código país corregido).

## TypeScript strict mode
- `tsconfig.json` → `strict: true`, 22 `any` eliminados en 12 archivos (`catch (e: unknown)`, `Record<string, unknown>`, type assertions).

## Schema DB
- Columna `updated_at TIMESTAMPTZ` + trigger `update_updated_at()` en productos.
- `set_updated_at` trigger registrado en `db.ts` para que se ejecute al insertar.
- Sitemap usa `updated_at` con fallback a `created_at`.

## SEO / Metadata
- `layout.tsx`: favicon → `/oveja-logo.png`, OG/Twitter → `/og-image.png`.
- JSON-LD Store completo (geo coords, hours L-S 10:00-20:00 hardcoded, sameAs, phone).
- `generateMetadata` con `cache()` reutiliza query en `producto/[id]`.
- `public/manifest.json` PWA + Apple icon explícito en metadata.

## Performance
- AdminDashboard + ProductDetailClient → `dynamic(() => import(...), { ssr: false })`.
- Hero `<img>` → `<Image priority fill>` (next/image, eliminó eslint-disable).
- `compiler.removeConsole` en producción (next.config.js).
- **`generateStaticParams` removido** de `producto/[id]` y `catalogo/[categoria]` — ISR on-demand (evita timeout + DB contention con 312 productos).
- **Dominios de imágenes externos** agregados a `images.remotePatterns` + CSP `img-src` (9 dominios incluyendo TiendaNube CDN `acdn-us.mitiendanube.com`).

## UX / UI
- **P2-1**: Feedback "✓ Agregado" en ProductCard + ProductDetailClient (se oculta a los 1.5s).
- **P2-2**: CartDrawer scroll-lock (`document.body.style.overflow = 'hidden'` al abrir, se restaura al cerrar).
- **P2-3**: CartDrawer slide-in animation (`translate-x` + backdrop fade, `duration-300 ease-out`).
- **P2-4**: Todos los `<a href="/...">` internos migrados a `<Link>` (Header, Footer, FeaturedGrid, CartDrawer, catalogo pages).
- **P2-5**: Skeletons de carga (`loading.tsx`) para `/catalogo/[categoria]` y `/producto/[id]`.
- **P2-6**: Hero CTA button "Ver catálogo" → `/catalogo`.
- **P2-7**: ProductCarousel touch swipe (delta > 50px) + keyboard arrows (← →) + `aria-roledescription="carrusel"`.
- **P2-9**: Footer expandido con categorías/redes — LUEGO REVERTIDO al diseño original con "Desarrollado por Jerson Hernández".
- **`:focus-visible`** con outline verde (`#588157`) en `globals.css`.
- **Admin table**: `overflow-x-auto` wrapper para scroll horizontal.

## Archivos nuevos
- `src/lib/adminRateLimit.ts` — rate limiter in-memory para admin
- `src/lib/uploadLimits.ts` — constante `MAX_UPLOAD_BYTES`
- `public/manifest.json` — PWA manifest
- `src/app/catalogo/[categoria]/loading.tsx` — skeleton
- `src/app/producto/[id]/loading.tsx` — skeleton

## Pendiente
- **Legal**: `/terminos` y `/privacidad` — esperando RUT y email. Plan en `.opencode/plans/plan-legal-pendiente.md`
- **Upstash en Vercel**: `UPSTASH_REDIS_REST_URL` y `UPSTASH_REDIS_REST_TOKEN` como env vars de Vercel (en `.env.local` local funciona)
- **Horarios**: `openingHoursSpecification` hardcodeado L-S 10:00-20:00 — confirmar con el usuario
- **Logo**: usuario quiere oveja blanca pero intento anterior falló. Esperar imagen o idea más clara.
