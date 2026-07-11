/**
 * Script de migración: convierte imágenes base64 guardadas en la DB a URLs de Supabase Storage.
 *
 * Lee todos los productos. Para cada producto revisa:
 *   - image_url: si es data URL base64, la sube a Supabase y actualiza con la URL pública.
 *   - images[]: si algún elemento es data URL base64, lo sube y reemplaza en el array.
 *
 * Uso:
 *   npx tsx scripts/migrate-base64-images.ts
 *
 * Requiere las mismas env vars que la app:
 *   DATABASE_URL, SUPABASE_URL, SUPABASE_SERVICE_KEY
 *
 * Cargar .env.local manualmente o usar:
 *   npx tsx --env-file=.env.local scripts/migrate-base64-images.ts
 */

import { Pool } from 'pg';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

const BUCKET_NAME = 'product-images';
const MAX_IMAGES = 20;

function loadEnv() {
  const envPath = join(process.cwd(), '.env.local');
  let content = '';
  try {
    content = readFileSync(envPath, 'utf-8');
  } catch {
    return;
  }
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

loadEnv();

const DATABASE_URL = process.env.DATABASE_URL;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!DATABASE_URL) {
  console.error('✗ DATABASE_URL no está configurada. Crea .env.local o usa --env-file.');
  process.exit(1);
}
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('✗ SUPABASE_URL / SUPABASE_SERVICE_KEY no están configuradas.');
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL, max: 3 });
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

let bucketReady = false;
let stats = { productos: 0, imagenesSubidas: 0, errores: 0, saltadas: 0 };

async function ensureBucket() {
  if (bucketReady) return;
  const { data: buckets, error } = await supabase.storage.listBuckets();
  if (error) throw error;
  if (!buckets?.find((b) => b.name === BUCKET_NAME)) {
    await supabase.storage.createBucket(BUCKET_NAME, { public: true });
  }
  bucketReady = true;
}

async function subirBase64(dataUrl: string): Promise<string> {
  await ensureBucket();
  const match = dataUrl.match(/^data:(image\/(\w+));base64,(.+)$/i);
  if (!match) throw new Error(`Formato base64 inválido: ${dataUrl.slice(0, 40)}...`);

  const mime = match[1];
  const ext = match[2] || 'jpg';
  const buffer = Buffer.from(match[3], 'base64');
  const filename = `migrated-${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filename, buffer, { contentType: mime, upsert: false });
  if (uploadError) throw uploadError;

  const { data: urlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filename);
  return urlData.publicUrl;
}

function esBase64(s: string): boolean {
  return typeof s === 'string' && s.startsWith('data:') && s.includes('base64');
}

function esDataUrlLarga(s: string): boolean {
  return typeof s === 'string' && (s.startsWith('data:') || s.length >= 500);
}

async function migrarProducto(row: any, dryRun: boolean) {
  let updatesNeeded = false;
  let nuevaImageUrl = row.image_url || '';
  let nuevasImages: string[] = Array.isArray(row.images) ? [...row.images] : [];

  if (esBase64(nuevaImageUrl)) {
    try {
      if (dryRun) {
        console.log(`  [DRY-RUN] image_url base64 (${nuevaImageUrl.length} chars) → se subiría`);
        stats.imagenesSubidas++;
        nuevaImageUrl = '__DRY_RUN__';
      } else {
        const url = await subirBase64(nuevaImageUrl);
        nuevaImageUrl = url;
        stats.imagenesSubidas++;
      }
      updatesNeeded = true;
    } catch (e: any) {
      console.error(`  ✗ Error en image_url: ${e.message}`);
      stats.errores++;
      nuevaImageUrl = row.image_url;
    }
  } else if (esDataUrlLarga(nuevaImageUrl)) {
    console.log(`  ⚠ image_url data URL larga (${nuevaImageUrl.length} chars), eliminando`);
    nuevaImageUrl = '';
    updatesNeeded = true;
  }

  for (let i = 0; i < nuevasImages.length; i++) {
    const img = nuevasImages[i];
    if (esBase64(img)) {
      if (dryRun) {
        console.log(`  [DRY-RUN] imagen #${i} base64 (${img.length} chars) → se subiría`);
        stats.imagenesSubidas++;
        updatesNeeded = true;
        nuevasImages[i] = '__DRY_RUN__';
      } else {
        try {
          const url = await subirBase64(img);
          nuevasImages[i] = url;
          stats.imagenesSubidas++;
          updatesNeeded = true;
        } catch (e: any) {
          console.error(`  ✗ Error en imagen #${i}: ${e.message}`);
          stats.errores++;
        }
      }
    } else if (esDataUrlLarga(img)) {
      console.log(`  ⚠ imagen #${i} data URL larga (${img.length} chars), eliminando`);
      stats.saltadas++;
      nuevasImages[i] = '';
      updatesNeeded = true;
    }
  }

  nuevasImages = nuevasImages.filter((img) => img && img !== '__DRY_RUN__').slice(0, MAX_IMAGES);

  if (!updatesNeeded) return false;

  if (dryRun) {
    console.log(`  [DRY-RUN] Producto ${row.id} "${row.name}" — se actualizaría`);
    return true;
  }

  if (!nuevaImageUrl && nuevasImages.length > 0) {
    nuevaImageUrl = nuevasImages[0];
  }

  try {
    await pool.query(
      `UPDATE productos SET image_url = $1, images = $2 WHERE id = $3`,
      [nuevaImageUrl, nuevasImages, row.id]
    );
    return true;
  } catch (e: any) {
    console.error(`  ✗ Error al actualizar DB: ${e.message}`);
    stats.errores++;
    return false;
  }
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  console.log('');
  console.log(dryRun ? '🔍 MODO DRY-RUN (no se hacen cambios)' : '🚀 Migración de imágenes base64');
  console.log('');
  console.log(`  DB: ${DATABASE_URL.replace(/:[^:@]+@/, ':***@')}`);
  console.log(`  Supabase: ${SUPABASE_URL}`);
  console.log('');
  await ensureBucket();

  const result = await pool.query(`SELECT id, name, image_url, images FROM productos ORDER BY id`);
  console.log(`Encontrados ${result.rows.length} productos.`);

  let procesados = 0;

  for (const row of result.rows) {
    procesados++;
    stats.productos = procesados;
    const tieneBase64 =
      esBase64(row.image_url) ||
      (Array.isArray(row.images) && row.images.some(esBase64)) ||
      esDataUrlLarga(row.image_url) ||
      (Array.isArray(row.images) && row.images.some(esDataUrlLarga));

    if (!tieneBase64) continue;

    const prefix = `[${procesados}/${result.rows.length}] PRODUCTO ${row.id} — "${row.name}":`;
    console.log(`\n${prefix}`);
    try {
      const actualizado = await migrarProducto(row, dryRun);
      if (actualizado) {
        console.log(`  ✓ Migrado/actualizado`);
      }
    } catch (e: any) {
      console.error(`  ✗ ${e.message}`);
      stats.errores++;
    }
  }

  console.log('\n');
  console.log('═══════════════════════════════════════════');
  console.log('  RESUMEN');
  console.log('═══════════════════════════════════════════');
  console.log(`  Productos revisados:   ${stats.productos}`);
  console.log(`  Imágenes migradas:     ${stats.imagenesSubidas}`);
  console.log(`  Data URLs eliminadas:  ${stats.saltadas}`);
  console.log(`  Errores:               ${stats.errores}`);
  console.log('');

  if (stats.errores === 0 && !dryRun) {
    console.log('✓ Migración completada sin errores.');
  } else if (stats.errores > 0) {
    console.log(`⚠ Hubo ${stats.errores} error(es). Revisa el log arriba.`);
    process.exitCode = 1;
  }

  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});