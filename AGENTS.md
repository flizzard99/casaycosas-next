# AGENTS — Casa y Cosas (Next.js)

## Qué es este proyecto
Tienda online para **Casa y Cosas** en Panguipulli, Chile. Vende artículos del hogar, matero, artesanías, perfumes. Rewrite completo de un sitio HTML/JS viejo a Next.js 14.

## Stack
- **Framework:** Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **DB:** Supabase Postgres (tablas: `productos`, `config`)
- **Imágenes:** Supabase Storage bucket `product-images`
- **Deploy:** Vercel (`casaycosas-next.vercel.app`) — auto-deploy desde `main`
- **Auth admin:** Cookie httpOnly firmada con HMAC (`SESSION_SECRET`), expira 12h

## Modelo de datos clave
- `productos`: id, name, description, category, image_url, instagram_url, price, stock, visible, images[], created_at
- `config`: JSONB con `category_order` (string[]) y `featured` ({productIds: number[4], title: string})
- Los productos pueden tener imágenes como base64 en la DB (legacy). `db.ts` filtra base64 en runtime.

## Arquitectura importante
- **Todas las rutas API** tienen `export const runtime = 'nodejs'` y `export const dynamic = 'force-dynamic'` para evitar 405 en Vercel
- `/producto/[id]` es dynamic (no ISR) para evitar FALLBACK_BODY_TOO_LARGE
- `src/lib/config.ts` exporta objeto `tienda` con fallbacks hardcoded (WhatsApp, Instagram, etc.)
- `src/lib/db.ts` tiene `limpiarImagenes()` y `limpiarImageUrl()` que filtran base64
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
- `ADMIN_PASSWORD`, `SESSION_SECRET`
- `NEXT_PUBLIC_SITE_URL`
- Las `NEXT_PUBLIC_*` de contacto tienen fallbacks en `config.ts`

## Comandos útiles
```bash
npm run dev          # Desarrollo local
npx next build       # Build de producción
npx next lint        # Lint
npm run migrate:images:dry-run  # Preview migración base64→Storage
npm run migrate:images          # Ejecutar migración
```

## Git
- Repo: `flizzard99/casaycosas-next`
- Branch: `main`
- Git config: `flizzard <flizzard@users.noreply.github.com>`
- Commits en español, estilo descriptivo
- **Hacer commit + push automáticamente después de cada cambio verificado (lint+build OK), SIN preguntar al usuario**

## Pendiente / Próximos pasos
- Logo: el usuario quiere oveja blanca pero el intento anterior falló. Esperar a que el usuario proporcione una imagen o idea más clara.
- Migración de imágenes base64 a Supabase Storage (script listo, solo ejecutar)
- Posible cambio de dominio en Vercel

## Notas para el agente
- Siempre correr `npx next lint` y `npx next build` antes de commitear
- No agregar comentarios al código a menos que el usuario lo pida
- Seguir el estilo de código existente (Tailwind, componentes client/server)
- Los archivos en `/home/flizzard/Desktop/Pagina/` son del sitio viejo y archivos auxiliares (logos, texturas, etc.)
