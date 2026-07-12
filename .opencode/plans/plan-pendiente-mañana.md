# Plan de trabajo pendiente — Casa y Cosas
Fecha guardado: 2026-07-11
Último commit: 882438b

## Completado hoy (18 items)
- 4e168c6: Revalidación stock home+catálogo, error.tsx branded, favicon oveja-logo
- a1ca86e: Rate-limit login sin doble conteo (5 intentos exactos)
- 882438b: OG image 1200x630, accesibilidad (Header/CartDrawer/ProductCard/InfoLocalSection), JSON-LD completo, upload limits unificados

---

## Pendiente para mañana

### A1: tsconfig.json → strict: true + corregir 21 usos de any
- Archivo: tsconfig.json:7 — cambiar "strict": false a "strict": true
- 21 ocurrencias en 12 archivos:
  - 16 catch (e: any) → catch (e: unknown) + instanceof Error
  - 2 validarProducto(body: any) → tipar con ProductoInput (ya existe en types.ts)
  - 1 limpiarImagenes(images: any[]) → (string | null | undefined)[]
  - 1 formatProducto(row: any) → Record<string, unknown> + assertions
  - 1 (id: any) en callback → unknown
- Archivos: db.ts, productos/route.ts, productos/[id]/route.ts, config/route.ts, upload/route.ts, visibility/route.ts, stock/route.ts, images/route.ts, images/[index]/route.ts, FeaturedEditor.tsx, ProductForm.tsx, CategoryOrderEditor.tsx
- Esfuerzo: ~1.5h

### M1: :focus-visible global
- globals.css — añadir :focus-visible { outline: 2px solid #588157; outline-offset: 2px; }
- 5 min

### M2: Hero.tsx <img> → next/image con priority
- Hero.tsx:16-21 — migrar a <Image> con priority para LCP
- 10 min

### M3: React cache() en producto/[id]/page.tsx
- Reusar query entre generateMetadata y ProductoPage (hoy hace 2 queries a DB)
- 10 min

### M4: Admin table overflow-x-auto
- AdminDashboard.tsx:119 — envolver <table> en <div className="overflow-x-auto">
- 5 min

### M5: CartDrawer debounce
- Botón WhatsApp/Instagram bloquear 1s tras click
- 10 min

### M6: Validación precio en ProductForm.tsx
- parseInt(price, 10) || 0 acepta negativos → Math.max(0, ...)
- 5 min

### M7: Duplicación fuente de verdad (teléfono, dirección)
- layout.tsx JSON-LD hardcodea teléfono/dirección en vez de usar config.ts
- 10 min

### M8: Constante compartida de límite upload
- supabaseStorage.ts:22 MAX_UPLOAD_BYTES = 4MB y upload/route.ts:10 MAX_UPLOAD_BYTES = 4MB podrían ser una sola constante
- 5 min

## Baja prioridad (nice-to-have)
- B1: manifest.json para PWA
- B2: apple-icon 180x180 explícito
- B3: package.json engines + typecheck script
- B4: compiler.removeConsole en next.config.js
- B5: AdminLogin toggle password emoji → SVG
- B6: next.config.js COOP/COEP headers
- B7: lint-staged + husky
- B8: DB pool migrar a Supabase pooler :6543
- B9: Migrar ensureSchema() a migración SQL versionada
- B10: Checkout real con pago (Webpay/MercadoPago)
- B11: Stock atómico con SELECT FOR UPDATE
- B12: CartDrawer fallback document.execCommand deprecated
