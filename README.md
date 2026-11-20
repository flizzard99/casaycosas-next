# Casa y Cosas (Next.js)

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
    imageStorage.ts        → subida de imágenes a Cloudflare R2
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
  Facebook y TikTok).

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

> \* Solo obligatorias si el admin sube imágenes de productos. Sin ellas, el panel funciona
> pero la subida de imágenes fallará.
>
> † Las variables `NEXT_PUBLIC_*` tienen **valores de respaldo** hardcoded en
> `src/lib/config.ts` con los datos reales de la tienda. Si no las configuras, el sitio
> funciona con esos valores. Las configuras solo si quieres **cambiarlos**.

## 2. Instalación y desarrollo local

Requiere Node.js 24 LTS. Vercel usa la misma versión indicada en `package.json`.

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


## Pago en línea con Mercado Pago Chile

El carrito dirige a «Finalizar compra». El pedido incluye los productos en CLP y un envío fijo de $4.000 por Blue Express a todo Chile. WhatsApp queda disponible para consultas.

1. Crea una aplicación de **Checkout Pro** en Mercado Pago Developers con la cuenta de la tienda.
2. Configura el evento **Pagos** en Webhooks con la URL `https://casaycosas-next.vercel.app/api/pagos/mercadopago`. Si usas otro dominio, actualiza esa URL y `NEXT_PUBLIC_SITE_URL` juntos.
3. Guarda el Access Token en `MP_ACCESS_TOKEN` y la firma secreta de Webhooks en `MP_WEBHOOK_SECRET`. Ambas son variables de servidor. El checkout se activa cuando ambas están configuradas.
4. Prueba primero con credenciales y comprador de prueba, `MP_SANDBOX=true`, una base de desarrollo y una URL HTTPS de ese entorno. En producción usa las credenciales de producción y deja `MP_SANDBOX=false`. Vuelve a desplegar después de cambiar variables.
5. En **Administración → Pedidos**, comprueba el cambio de pendiente a aprobado tras recibir el webhook. Al despachar, registra el código de seguimiento si el transportista lo facilita.

En una compra con tarjeta el stock se reserva durante 45 minutos. El enlace de Mercado Pago vence 5 minutos antes para dejar tiempo a las notificaciones. Si se aprueba un pago fuera de plazo o llega un cobro duplicado, el pedido queda en **Pagos por revisar**. Confirma la operación con Mercado Pago antes de despachar o reembolsar.

Activa la transferencia bancaria en **Administración → Pedidos → Cuenta para transferencias**. El cliente ve el monto y la cuenta en su enlace de pedido. El stock se reserva durante 48 horas. Tras verificar el abono, usa **Confirmar transferencia recibida** para habilitar el despacho.


## Colecciones públicas

La portada enlaza a `/matera` y `/cristiana`. El catálogo, las fichas públicas y las compras usan la misma clasificación en `src/lib/lineas.ts`. Los productos quedan en el inventario de administración con su categoría original.

Para incorporar un producto, en el panel asígnale una categoría de la colección, como `matera`, `mate`, `cristiana`, `Libreria Cristiana` o `papeleria`. Las categorías anteriores de oficina y los artículos identificables de `hogar` se incluyen en su colección. El tipo específico del producto se obtiene de su categoría y nombre.


### Remate

En **Administración → Productos**, usa **Mover a Remate** para asignar un producto a `/remate`. Un producto oculto conserva ese estado. Puedes ajustar su precio con **Editar** y usar **Quitar de Remate** para devolverlo a la clasificación normal. El filtro **En remate** muestra los productos asignados.


### Diseños, ofertas y colores

- En **Administración → Diseño**, elige Matera, Cristiana o Remate. Sube una imagen de sección o un fondo de campaña. El título y el texto son opcionales. **Guardar diseño** publica el cambio. Para volver al fondo original, usa **Restaurar diseño original** y guarda otra vez.
- En **Productos → Editar**, selecciona una categoría agrupada por sección. Completa **Precio oferta** para mostrar el precio normal tachado. Déjalo vacío cuando termine la oferta.
- Usa **Agregar color** para definir las variantes y su stock. El stock total se calcula con sus existencias. Los colores agotados se muestran deshabilitados y los pedidos conservan el color elegido.
