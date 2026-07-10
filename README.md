# Casa y Cosas — Panguipulli (v2, Next.js)

Reescritura completa del sitio en **Next.js 14 (App Router) + TypeScript + Tailwind CSS**,
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

## 2. Instalación y desarrollo local

Requiere Node.js 18 o superior.

```bash
npm install
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

## 6. Próximos pasos sugeridos (opcionales)

- Cambiar `ADMIN_PASSWORD` por un sistema multiusuario si más de una persona administra la
  tienda.
- Agregar registro de auditoría (quién cambió qué) si lo necesitas más adelante.
- Optimizar imágenes servidas desde URLs externas (bigcommerce, etc.) migrándolas a Supabase
  Storage con el tiempo.
