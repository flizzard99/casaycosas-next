# Plan P0+P1 — Seguridad (listo para ejecutar)
Fecha: 2026-07-12

## P0-0: Teléfono duplicado en JSON-LD
Archivo: src/app/layout.tsx:58
Cambiar: `+56${tienda.whatsappNumber}` → `+${tienda.whatsappNumber}`
(Note: whatsappNumber already starts with 56)

## P0-1: CSRF token con expiración
Archivo: src/lib/auth.ts
- createCsrfToken(): agregar campo `exp: Date.now() + SESSION_DURATION_MS` al payload
- verifyCsrfToken(): decodificar payload y verificar `payload.exp > Date.now()` además del HMAC

## P0-2: Math.random() → crypto
Archivo: src/lib/auth.ts:56
- Cambiar `Math.random().toString(36).slice(2, 10)` por `require('crypto').randomBytes(16).toString('hex')`
- Import: ya tiene `import { createHmac, timingSafeEqual } from 'crypto'`, agregar `randomBytes`

Archivo: src/lib/supabaseStorage.ts:39
- Cambiar `Math.random().toString(36).slice(2, 8)` por `crypto.randomUUID()`
- Import: agregar `import { randomUUID } from 'crypto'`

## P0-3: Rate-limit en endpoints admin
Crear: src/lib/adminRateLimit.ts
- Map<ip, {count, resetAt}> en memoria
- Función checkAdminRateLimit(req, maxRequests=60, windowMs=60000): boolean
- Aplicar en todas las rutas POST/PUT/PATCH/DELETE de admin:
  - productos/route.ts (POST)
  - productos/[id]/route.ts (PUT, DELETE)
  - productos/[id]/stock/route.ts (PATCH)
  - productos/[id]/visibility/route.ts (PATCH)
  - productos/[id]/images/route.ts (PATCH)
  - productos/[id]/images/[index]/route.ts (DELETE)
  - upload/route.ts (POST)
  - config/route.ts (PUT)

## P1-5: CSRF timing-safe comparison
Archivo: src/lib/csrf.ts:9
Cambiar: `return verifyCsrfToken(header) && header === cookie`
Por:
```
import { timingSafeEqual } from 'crypto';
const headerBuf = Buffer.from(header);
const cookieBuf = Buffer.from(cookie);
return verifyCsrfToken(header) && headerBuf.length === cookieBuf.length && timingSafeEqual(headerBuf, cookieBuf);
```

## P1-6: Límite de imágenes
Archivo: src/app/api/productos/[id]/images/route.ts:18
Agregar después de `if (!Array.isArray(images) || !images.length)`:
```
if (images.length > 20) {
  return NextResponse.json({ error: 'Máximo 20 imágenes por producto' }, { status: 400 });
}
```

## P1-8: NaN ID validation
Crear helper en src/lib/db.ts:
```typescript
export function parseIdOrBadRequest(id: string): number | null {
  const parsed = parseInt(id, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}
```
Usar en todas las rutas [id]:
- productos/[id]/route.ts (GET, PUT, DELETE)
- productos/[id]/stock/route.ts (PATCH)
- productos/[id]/visibility/route.ts (PATCH)
- productos/[id]/images/route.ts (PATCH)
- productos/[id]/images/[index]/route.ts (DELETE)

Pattern:
```typescript
const id = parseIdOrBadRequest(params.id);
if (id === null) return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
```

## P1-9: Sanitizar error messages
En todos los catch de 500, cambiar:
```typescript
const message = e instanceof Error ? e.message : 'Error desconocido';
return NextResponse.json({ error: message }, { status: 500 });
```
Por:
```typescript
console.error('[API Error]', e);
return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
```
Archivos: TODOS los archivos API route que tengan catch de 500

## P1-10: Config save atómico
Archivo: src/lib/db.ts, función saveConfig
Cambiar las 2 queries secuenciales por transacción:
```typescript
const client = await pool.connect();
try {
  await client.query('BEGIN');
  await client.query(`INSERT INTO config ... category_order ...`);
  await client.query(`INSERT INTO config ... featured ...`);
  await client.query('COMMIT');
} catch (e) {
  await client.query('ROLLBACK');
  throw e;
} finally {
  client.release();
}
```

## Verificación
1. npx next lint
2. npx next build
3. git add -A && git commit -m "seguridad: CSRF expira, crypto random, rate-limit admin, timing-safe CSRF, límite imágenes, NaN validation, sanitizar errores, config atómico, fix teléfono" && git push
