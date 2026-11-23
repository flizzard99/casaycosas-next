# AGENTS — Casa y Cosas (Next.js)

## Qué es este proyecto
Tienda online para **Casa y Cosas** en Panguipulli, Chile. Vende artículos del hogar, matero, artesanías, perfumes. Rewrite completo de un sitio HTML/JS viejo a Next.js 16.

## Stack
- **Framework:** Next.js 16 (App Router) + TypeScript + Tailwind CSS
- **DB:** Supabase Postgres (tablas: `productos`, `config`, `pedidos`, `pedido_items`)
- **Imágenes:** Cloudflare R2 bucket `casaycosas-images` — el navegador comprime las fotos grandes y las envía al mismo dominio; el servidor valida el contenido, normaliza a WebP con sharp y guarda en R2. Dominio: `images.casaycosas.qzz.io`.
- **Deploy:** Vercel (`casaycosas-next.vercel.app`) — auto-deploy desde `main`
- **Auth admin:** Cookie httpOnly firmada con HMAC (`SESSION_SECRET`), expira 12h. `SameSite=Strict` (anti-CSRF).
- **CSRF:** Cookie `cyc_admin_csrf` (HMAC-signed, no httpOnly para que JS la lea) + header `X-CSRF-Token`. `src/lib/csrf.ts` valida server-side; `src/lib/adminFetch.ts` adjunta client-side. Toda mutación admin (POST/PUT/PATCH/DELETE) valida session + CSRF.
- **Rate-limit login:** Upstash Redis (5 intentos / 15 min / IP). Sin env vars de Upstash → degrada a sin rate-limit (no rompe).
- **Security headers:** `next.config.js` define CSP, HSTS, X-Frame-Options DENY, nosniff, Referrer-Policy, Permissions-Policy.
- **`limpiarImagenes` solo filtra prefijo `data:`** (no más por longitud ≥500 — URLs Supabase con token firmado largas eran descartadas).

## Modelo de datos clave
- `productos`: id, name, description, category, subcategoria, image_url, instagram_url, price, precio_oferta, stock, visible, images[], created_at
- `config`: JSONB con `category_order` (string[]) y `featured` ({productIds: number[4], title: string})
- `pedidos`: id interno, codigo_publico aleatorio, cliente_nombre, cliente_whatsapp, total, estado (pendiente/confirmado/cancelado/expirado), created_at, confirmado_at
- `pedido_items`: pedido_id, producto_id, nombre, qty, precio
- Los productos pueden tener imágenes como base64 en la DB (legacy). `db.ts` filtra base64 en runtime.
- **Sistema de pedidos**: el carrito llama `POST /api/pedido` → crea pedido + decrementa stock atómicamente. Expiración lazy a 48h (restaura stock). Admin gestiona en vista Pedidos.
- **Seguimiento sin WhatsApp**: página pública `/mi-pedido/[codigo]` con código aleatorio, estado en vivo (polling 20s) y cuenta regresiva de expiración. Email opcional con Resend (`src/lib/email.ts`) — degrada a sin-email si `RESEND_API_KEY` no está. WhatsApp queda como botón opcional, no obligatorio.
- **Catálogo**: Matera y Cristiana tienen una categoría virtual `Ofertas`, calculada desde `precio_oferta`; Remate queda excluido. Las subcategorías se asignan por producto y los filtros solo aparecen cuando contienen productos. El catálogo usa paginación de 8 productos con estado en la URL.
- **Productos por color**: `productos.variantes` concentra color/talla y stock. La migración `fusion-colores-*-v1` conserva fichas antiguas con `fusionado_en`, las oculta y redirige sus consultas a la ficha principal; no procesa grupos con pedidos pendientes.
- **Políticas legales**: `/terminos-y-condiciones`, `/privacidad`, `/despachos` y `/cambios-devoluciones`. El checkout exige aceptación y guarda su versión en `pedidos.aceptacion_legal`.

## Arquitectura importante
- **Todas las rutas API** tienen `export const runtime = 'nodejs'` y `export const dynamic = 'force-dynamic'` para evitar 405 en Vercel
- `/producto/[id]` y `/catalogo/[categoria]` usan ISR (`revalidate = 60s`, `dynamicParams = true`) — pre-render estático en build + refresco incremental
- `getProductosPublicos` ordena `created_at DESC` (productos nuevos primero)
- El header del home usa `config.categoryOrder` (curado por admin), no orden de inserción
- `src/lib/config.ts` exporta objeto `tienda` con fallbacks hardcoded (WhatsApp, Instagram, etc.)
- `src/lib/db.ts` tiene `limpiarImagenes()` y `limpiarImageUrl()` que filtran base64
- `src/lib/r2.ts` configura el cliente S3-compatible para Cloudflare R2
- `src/lib/imageStorage.ts` valida, normaliza y sube imágenes a R2; `/api/upload` mantiene credenciales y validación fuera del navegador
- `ProductCard` auto-detecta ratio de imagen (`naturalHeight/naturalWidth > 1.3`) para elegir object-cover vs object-contain
- `CartContext` tiene campo `stock?: number` en CartItem para limitar cantidades

## Componentes principales
- `Header.tsx`: Logo, nav desktop con dropdown de categorías (onMouseEnter/Leave), carrito SVG siempre visible en mobile, hamburguesa
- `Hero.tsx`: Sección principal, fondo `bg-sage` (#A3B18A)
- `FeaturedGrid.tsx`: "Más vendidos" — textura `patron.png` edge-to-edge con `backgroundSize: 'cover'`
- `InfoLocalSection.tsx`: "Visítanos" — mapa + redes sociales, textura `patron.png` edge-to-edge
- `ProductCard.tsx`: Tarjeta con selector cantidad (− qty +) con tope de stock, shadow-md, border
- `ProductDetailClient.tsx`: Página de detalle con carousel, selector cantidad, info stock
- `CartDrawer.tsx`: Drawer lateral con + − por item (cap en stock), WhatsApp + Instagram
- `ProductCarousel.tsx`: Carrusel de imágenes en detalle de producto
- `FloatWhatsApp.tsx`: Botón flotante de WhatsApp
- `Footer.tsx`: Footer con ® discreto que lleva a `/admin`
- `AdminDashboard.tsx`: CRUD productos, orden categorías, selección destacados (exactamente 4)

## Paleta de colores (tailwind.config.js)
- verde: #588157
- sage: #A3B18A
- verde-oscuro: #3A5A40
- verde-noche: #344E41
- crema: #DAD7CD

## Archivos estáticos en public/
- `logo.png` — Logo actual (600x600 RGBA, oveja crema/beige sobre fondo transparente)
- `patron.png` — Textura (1506x904 RGBA) para secciones FeaturedGrid e InfoLocalSection
- `direccion.png` — Mapa de ubicación de la tienda

## Logo — historial
- Original: RGBA 600x600 con oveja crema/beige y fondo transparente
- Se intentó convertir a blanco puro pero quedó mal (se perdió definición)
- Se revirtió al original. El usuario quiere la oveja blanca pero aún no se logró bien.
- **No volver a intentar cambiar el logo sin preguntar primero**

## Variables de entorno
Ver `.env.example` y `README.md` para tabla completa. Las más importantes:
- `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`
- `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL`
- `ADMIN_PASSWORD`, `SESSION_SECRET`
- `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` (rate-limit login; optional pero recomendado)
- `RESEND_API_KEY`, `RESEND_FROM` (email de pedidos; el remitente debe pertenecer a un dominio verificado en Resend)
- Las `NEXT_PUBLIC_*` de contacto tienen fallbacks en `config.ts`
- `NEXT_PUBLIC_SITE_URL`
- Las `NEXT_PUBLIC_*` de contacto tienen fallbacks en `config.ts`

## Comandos útiles
```bash
npm run dev          # Desarrollo local
npm run build       # Build de producción
npm run lint        # Lint
npm run migrate:images:dry-run  # Preview migración base64→Storage
npm run migrate:images          # Ejecutar migración
npm run reset:stock:dry-run     # Preview reset stock ≥1 → 10
npm run reset:stock             # Ejecutar reset stock
npm run migrate:to-r2:dry-run   # Preview migración Supabase→R2
npm run migrate:to-r2           # Ejecutar migración a R2
```

## Git
- Repo: `flizzard99/casaycosas-next`
- Branch: `main`
- Git config: `flizzard99 <flizzard99@users.noreply.github.com>`
- Commits en español, estilo descriptivo
- **Hacer commit + push automáticamente después de cada cambio verificado (lint+build OK), SIN preguntar al usuario**

## Pendiente / Próximos pasos
- Logo: el usuario quiere oveja blanca pero el intento anterior falló. Esperar a que el usuario proporcione una imagen o idea más clara.
- Migración de imágenes base64 a Supabase Storage (script listo, solo ejecutar)
- Posible cambio de dominio en Vercel

## Notas para el agente
- Siempre correr `npm run lint` y `npm run build` antes de commitear
- No agregar comentarios al código a menos que el usuario lo pida
- Seguir el estilo de código existente (Tailwind, componentes client/server)
- Los archivos en `/home/flizzard/Desktop/Pagina/` son del sitio viejo y archivos auxiliares (logos, texturas, etc.)

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
