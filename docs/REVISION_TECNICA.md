# Revisión técnica — Casa y Cosas

Fecha: 14 de noviembre de 2026.

## Resultado y alcance

La aplicación compila y funciona localmente en su modo sin base de datos. No es posible
certificar todavía la tienda con productos reales: el entorno no contiene `DATABASE_URL`,
credenciales de administración ni R2. No se accedió ni modificó la base de producción.
La comprobación del sitio Vercel fue bloqueada por la política de red del entorno
(CONNECT 403), lo que no prueba que Vercel esté caído. Se guardaron los dominios necesarios
en el borrador de configuración; todavía deben aplicarse desde los ajustes.

## Problemas corregidos

- Next.js 14.2.5 y dependencias vulnerables: migración a Next.js 16.4.6 y React 19,
  APIs asíncronas, ESLint actualizado y lockfile renovado. `npm audit` ya no reporta
  vulnerabilidades conocidas. El override de minimatch actualiza la dependencia del parser.
- El build dependía de descargar Google Fonts: fuentes locales con Fontsource.
- El catálogo ocultaba errores de conexión como una búsqueda sin resultados:
  ahora muestra un aviso y un acceso a WhatsApp. Las categorías no convierten un
  fallo de conexión en un falso producto inexistente.
- Los pedidos vencidos cambiaban de estado sin devolver existencias: devolución atómica
  e idempotente, con pruebas de reserva, rollback, expiración, confirmación y cancelación.
- Cantidades fraccionarias, IDs truncados, productos repetidos u ocultos y datos de
  contacto inválidos: validación del servidor y agrupación de cantidades. El total
  no puede desbordar la columna INTEGER. Precio y stock de administración se validan.
- Seguimiento público enumerable: clave aleatoria de 256 bits, páginas sin indexación,
  política sin referrer y API que omite email, WhatsApp y clave de seguimiento.
  El QR ahora contiene el enlace completo. Al procesar un pedido heredado se crea su clave.
- Carritos guardados corruptos podían romper el render: normalización, límites de stock,
  sincronización entre pestañas y recuperación segura.
- El carrito cerrado seguía dejando controles en el DOM: se desmonta; al cerrar se devuelve
  el foco. Se evita abrir WhatsApp automáticamente después de la reserva.
- Comprar ahora omitía la reserva de stock: ahora pasa por el carrito y el checkout.
- Fotos inválidas o fallidas: componente con respaldo; el encuadre se respeta en la galería.
- Se restaura render del detalle de producto en servidor, se evita duplicar el nombre de
  la tienda en el título y se escapa el contenido de datos estructurados y emails.
- Navegación al catálogo siempre disponible, menú móvil con estado accesible, búsqueda
  etiquetada, controles de cantidad etiquetados, foco, movimiento reducido, mejor contraste
  y mensajes de error claros. Se conserva el logo y la identidad visual existente.
- Errores y advertencias del servidor se mantienen visibles en producción.

## Evidencia

- `npm ci --cache /workspace/.npm`: instalación reproducible con lockfile.
- `npm run lint` y compilación de producción: correctos, incluida comprobación TypeScript.
- `npm test`: cinco pruebas aprobadas; lógica de pedidos ejecutada en Postgres embebido
  (PGlite), aislado de Supabase.
- `npm run test:e2e`: seis pruebas aprobadas con Chromium, tres flujos en escritorio y móvil:
  navegación y login, carrito y reserva sin servicio, almacenamiento corrupto y privacidad.
- `npm audit` y `npm audit --omit=dev`: cero vulnerabilidades conocidas en la revisión.
- Revisión visual de capturas móvil y escritorio; comprobación de ausencia de desborde horizontal.

Las pruebas de navegador usan un servidor aislado sin credenciales. No verifican carga
de productos reales, subida a R2, autenticación con credenciales reales ni entrega de email.
El modo sin DB registra el fallo esperado en los logs. Next.js puede devolver HTTP 200
con UI 404 cuando ya inició streaming; se comprueban UI, noindex y el 400 de la API.

## Configuración pendiente

Configura valores reales en los ajustes seguros del entorno y en Vercel. No los pegues
al chat ni los agregues al repositorio.

| Variable | Origen |
|---|---|
| DATABASE_URL | Supabase → proyecto → Connect → cadena del pooler con contraseña real |
| ADMIN_PASSWORD | Contraseña fuerte elegida para administrar la tienda |
| SESSION_SECRET | Clave aleatoria generada con `openssl rand -base64 32` |
| R2_ACCOUNT_ID | Cloudflare → R2 → detalles de la cuenta |
| R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY | Cloudflare → R2 → credenciales API S3 del bucket |
| R2_BUCKET_NAME | Nombre del bucket; esperado `casaycosas-images` |
| R2_PUBLIC_URL | Dominio público activo; esperado `https://images.casaycosas.qzz.io` |

Revisa primero Vercel → proyecto → Settings → Environment Variables: puede contener
la configuración existente. Para Node en entornos IPv4, usa la conexión de pooler apropiada
de Supabase y TLS según sus instrucciones; no desactives la verificación TLS.
Autoriza el host real del servicio cuando se conozca y comprueba la conexión antes de darlo
por operativo. Añadir dominios HTTPS no garantiza conectividad al protocolo Postgres.

R2 necesita CORS que permita las solicitudes PUT desde el dominio real de la tienda
para la subida directa. Es necesaria una prueba real de subida, lectura y permisos antes
de considerarlo validado. Resend requiere API key y remitente verificado para enviar emails.
Upstash permite limitar intentos de acceso entre instancias; sin sus variables el login
mantiene el comportamiento heredado sin rate limit distribuido.

## Antes de producción y mejoras posteriores

1. Probar contra una base de staging con copia controlada del esquema: categorías,
   productos, fotos, login, CRUD y ciclo completo de un pedido.
2. Los enlaces antiguos sin token ya no muestran datos privados. Los pedidos permanecen
   en administración. Conservar los enlaces completos de las reservas nuevas.
3. Revisar por separado el stock de pedidos ya expirados antes de la corrección;
   no devolverlo masivamente sin reconciliarlo, para evitar duplicar unidades.
4. Revisar el esquema automático con el rol real de la DB. Recomendación posterior:
   migraciones versionadas, rol de aplicación con privilegios mínimos y copias de seguridad.
5. Configurar Upstash para limitar accesos y ampliar protección distribuida del endpoint
   público de reservas; definir requisitos de contacto si deben evitarse reservas anónimas.
6. Activar comprobaciones de CI y monitorización de errores, disponibilidad e integraciones.
   Medir rendimiento y accesibilidad con productos e imágenes reales antes de prometer métricas.

Se guardaron `install_script`, `start_skill`, requisitos de variables y dominios de red
como borrador. Guardar el borrador no aplica credenciales, no publica el entorno ni despliega
la web. Revisar/guardar los ajustes y publicar el entorno son pasos del usuario.
