# Casa y Cosas — Panguipulli (v2, Next.js)

Reescritura completa del sitio en **Next.js 16 (App Router) + TypeScript + Tailwind CSS**,
manteniendo la misma base de datos Postgres/Supabase que ya usa el sitio actual
(no se pierde ningún producto ni configuración).

## Qué cambió respecto al sitio anterior

- El HTML/JS monolítico de 132 KB se separó en componentes de React mantenibles.
- La autenticación del admin ya no reutiliza la contraseña como token: ahora usa una
  cookie de sesión firmada (HMAC), `httpOnly` y con expiración de 12 horas.
- Se agregó protección básica contra fuerza bruta en el login (máx. 8 intentos / 10 min por IP).
- El carrito, el control de stock, la gestión de imágenes múltiples, el orden de categorías
  y el catálogo de WhatsApp/Instagram/Facebook/TikTok se mantienen, con mejor UI.
- Nuevo diseño ("Verano de lago", paleta verde) aplicado en el sitio público.

## Estructura del proyecto

```
src/
  app/
    page.tsx              → sitio público
    admin/page.tsx         → panel de administración (login + dashboard)
    api/                   → endpoints (productos, stock, imágenes, config, auth)
  components/              → componentes de UI (Header, Hero, ProductCard, AdminDashboard, etc.)
  context/CartContext.tsx  → estado global del carrito (persistido en localStorage)
  lib/
    db.ts                  → todas las consultas a Postgres
    auth.ts                → sesión firmada del admin
    supabaseStorage.ts      → subida de imágenes a Supabase Storage
public/
  direccion.png            → mismo mapa/ubicación que el sitio actual
```

## 1. Variables de entorno

Copia `.env.example` a `.env.local` y completa con tus datos reales:

```bash
cp .env.example .env.local
```

- `DATABASE_URL`: la misma cadena de conexión de Postgres que ya usas en Supabase (Project
  Settings → Database → Connection string).
- `SUPABASE_URL` / `SUPABASE_SERVICE_KEY`: los mismos que ya tienes configurados hoy
  (Project Settings → API).
- `ADMIN_PASSWORD`: la contraseña con la que entras al panel `/admin`.
- `SESSION_SECRET`: un texto largo y aleatorio (puedes generarlo con
  `openssl rand -base64 32`). Sirve para firmar la sesión del admin — **no la compartas**.
- Las variables `NEXT_PUBLIC_*`: datos de contacto de la tienda (WhatsApp, Instagram,
  Facebook, TikTok, dirección y link de Google Maps).

### Tabla de referencia (para Vercel → Settings → Environment Variables)

| Variable | Descripción | Obligatoria | Valor de ejemplo |
|---|---|---|---|
| `DATABASE_URL` | Cadena de conexión Postgres (Supabase) | ✅ Sí | `postgresql://usuario:password@host:5432/postgres` |
| `SUPABASE_URL` | URL del proyecto Supabase (subir imágenes) | ✅ Sí\* | `https://tu-proyecto.supabase.co` |
| `SUPABASE_SERVICE_KEY` | Service role key de Supabase | ✅ Sí\* | `eyJhbGciOiJIUzI1NiIs...` |
| `ADMIN_PASSWORD` | Contraseña del panel `/admin` | ✅ Sí | `elige-una-contrasena-segura` |
| `SESSION_SECRET` | Clave HMAC para firmar sesión admin | ✅ Sí | `openssl rand -base64 32` |
| `NEXT_PUBLIC_SITE_URL` | URL pública del sitio (OpenGraph/metadata) | Recomendada | `https://casaycosas-next.vercel.app` |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | Número WhatsApp (sin + ni espacios) | Opcional† | `56992139709` |
| `NEXT_PUBLIC_WHATSAPP_CATALOG_URL` | URL catálogo WhatsApp Business | Opcional† | `https://wa.me/c/56992139709` |
| `NEXT_PUBLIC_INSTAGRAM_URL` | URL del perfil de Instagram | Opcional† | `https://www.instagram.com/casaycosas.panguipulli/` |
| `NEXT_PUBLIC_FACEBOOK_URL` | URL del perfil de Facebook | Opcional† | `https://www.facebook.com/people/Tienda-Casa-y-Cosas-Panguipulli/61582181283916/` |
| `NEXT_PUBLIC_TIKTOK_URL` | URL del perfil de TikTok | Opcional† | `https://www.tiktok.com/@tiendacasaycosas` |
| `NEXT_PUBLIC_MAPS_URL` | URL de Google Maps de la tienda | Opcional† | `https://maps.app.goo.gl/t4b9KeWEd7U4MDPc6` |
| `NEXT_PUBLIC_STORE_ADDRESS` | Dirección física de la tienda | Opcional† | `Martínez de Rosas 498, Local C, Panguipulli` |

> \* Solo obligatorias si el admin sube imágenes de productos. Sin ellas, el panel funciona
> pero la subida de imágenes fallará.
>
> † Las variables `NEXT_PUBLIC_*` tienen **valores de respaldo** hardcoded en
> `src/lib/config.ts` con los datos reales de la tienda. Si no las configuras, el sitio
> funciona con esos valores. Las configuras solo si quieres **cambiarlos**.

## 2. Instalación y desarrollo local

Requiere Node.js 22 o superior (validado con Node.js 24).

```bash
npm ci
npm run dev
```

Abre `http://localhost:3000` para el sitio público y `http://localhost:3000/admin` para el
panel de administración.

## 3. Subir el proyecto a GitHub

Desde la carpeta del proyecto:

```bash
git init
git add .
git commit -m "Reescritura del sitio en Next.js"
git branch -M main
```

Luego crea el repositorio en GitHub (vía la web, en https://github.com/new — nómbralo por
ejemplo `casaycosas-next`, **no lo inicialices** con README) y conéctalo:

```bash
git remote add origin https://github.com/TU-USUARIO/casaycosas-next.git
git push -u origin main
```

## 4. Desplegar en Vercel

1. Entra a https://vercel.com/new e importa el repositorio recién creado.
2. En "Environment Variables", agrega las mismas variables de tu `.env.local`
   (`DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `ADMIN_PASSWORD`,
   `SESSION_SECRET`, y las `NEXT_PUBLIC_*`).
3. Deploy. Al terminar, tendrás una URL nueva (puedes luego apuntar tu dominio actual a este
   proyecto desde Vercel sin perder nada).

## 5. Notas sobre los datos existentes

No es necesario migrar productos: este proyecto usa las mismas tablas `productos` y
`config` que tu sitio actual en Supabase. Al conectar el mismo `DATABASE_URL`, verás tus
312 productos tal cual están hoy.

## 6. Migración de imágenes base64 (importante)

Los productos heredados del sitio antiguo pueden tener imágenes guardadas como **data URLs
base64** directamente en la columna `images` o `image_url` de la base de datos. Esto hace que
las páginas del catálogo pesen varios MB y rompe el ISR en Vercel.

Hay un script que las migra automáticamente a Supabase Storage y reemplaza los base64 por URLs
públicas:

```bash
# 1. Previsualizar qué se migraría (sin tocar la DB)
npm run migrate:images:dry-run

# 2. Ejecutar la migración real
npm run migrate:images
```

El script requiere `.env.local` con `DATABASE_URL`, `SUPABASE_URL` y `SUPABASE_SERVICE_KEY`.

> Aunque no migres las imágenes, la app filtra automáticamente los base64 en runtime
> (`src/lib/db.ts`), así que el sitio no se rompe — pero las imágenes base64 no se mostrarán.
> Ejecuta la migración para que todas las fotos queden visibles vía Supabase Storage.

## 7. Próximos pasos sugeridos (opcionales)

- Cambiar `ADMIN_PASSWORD` por un sistema multiusuario si más de una persona administra la
  tienda.
- Agregar registro de auditoría (quién cambió qué) si lo necesitas más adelante.
- Optimizar imágenes servidas desde URLs externas (bigcommerce, etc.) migrándolas a Supabase
  Storage con el tiempo.


## Validación y entorno en la nube

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
```

`npm test` utiliza Postgres embebido (PGlite) en memoria; no modifica Supabase.
Las pruebas de navegador ejecutan su propio servidor de desarrollo en el puerto 3100,
sin credenciales de base de datos ni administración. Comprueban el modo sin conexión,
la navegación y el carrito en escritorio y móvil. Requieren Chromium disponible en
`/usr/bin/chromium`, o indicar `CHROMIUM_PATH` con la ruta del navegador instalado.
Para probar la aplicación con productos reales configura `DATABASE_URL` y verifica
inicio, catálogo, categorías, detalle y una reserva controlada en una base de pruebas.
No ejecutes pruebas que creen pedidos contra la base de producción.

Las fuentes Anton y Work Sans se sirven desde paquetes locales: la compilación ya no
requiere conectarse a Google Fonts. Next.js 16 utiliza APIs asíncronas para cookies
y parámetros de ruta; usa `npm run lint`, porque `next lint` fue eliminado.

El catálogo muestra un aviso y el contacto de WhatsApp si no puede conectarse a Postgres;
esto no significa que la conexión esté configurada. Para administrar necesitas también
`ADMIN_PASSWORD` y `SESSION_SECRET`. La subida de imágenes utiliza R2 y necesita
`R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME` y
`R2_PUBLIC_URL`; Supabase Storage se conserva para los scripts de migración heredados.
Configura los valores sensibles en los ajustes seguros del entorno y de Vercel.
No copies los valores de ejemplo como si fueran credenciales reales.

Los nuevos enlaces de seguimiento incluyen una clave privada (`?token=...`). Guarda
el enlace completo. Los enlaces antiguos sin clave dejan de mostrar datos de clientes;
los pedidos permanecen disponibles para el administrador. La nueva columna
`pedidos.tracking_token` se agrega automáticamente al inicializar el esquema.
Los pedidos que ya figuraban como expirados antes de esta corrección no se recalculan:
su stock debe revisarse por separado para evitar devolver unidades dos veces.

El rate limit distribuido del login requiere Upstash. Los correos requieren Resend y
un remitente verificado. Sin estas integraciones no se validan envío de emails ni
protección distribuida contra intentos de acceso.
