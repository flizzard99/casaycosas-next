/**
 * Migra imágenes de Supabase Storage a Cloudflare R2.
 *
 * Lee productos con URLs de supabase.co, descarga cada imagen,
 * la sube a R2, y actualiza la URL en la DB.
 *
 * Uso:
 *   npx tsx scripts/migrate-to-r2.ts --run
 *   npx tsx scripts/migrate-to-r2.ts              (dry-run por defecto)
 *
 * Requiere: DATABASE_URL, SUPABASE_URL,
 *           R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY,
 *           R2_BUCKET_NAME, R2_PUBLIC_URL
 */

import { Pool } from 'pg';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { S3Client } from '@aws-sdk/client-s3';
import { readFileSync } from 'fs';
import { join } from 'path';

const DRY_RUN = !process.argv.includes('--run');
const BUCKET_NAME_R2 = process.env.R2_BUCKET_NAME || 'casaycosas-images';
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || 'https://images.casaycosas.qzz.io';

function loadEnv() {
  const envPath = join(process.cwd(), '.env.local');
  let content = '';
  try {
    content = readFileSync(envPath, 'utf-8');
  } catch { return; }
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx < 0) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

function getR2Client(): S3Client {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error('R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY no configuradas');
  }
  return new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
}

function extractStoragePath(url: string): string | null {
  const match = url.match(/supabase\.co\/storage\/v1\/object\/(?:public\/)?([^?]+)/);
  return match ? match[1] : null;
}

async function downloadFromSupabase(publicUrl: string): Promise<{ buffer: Buffer; contentType: string }> {
  const res = await fetch(publicUrl);
  if (!res.ok) throw new Error(`HTTP ${res.status} descargando ${publicUrl}`);
  const contentType = res.headers.get('content-type') || 'image/jpeg';
  const arrayBuf = await res.arrayBuffer();
  return { buffer: Buffer.from(arrayBuf), contentType };
}

async function main() {
  loadEnv();

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const r2 = getR2Client();
  const supabaseUrl = process.env.SUPABASE_URL || '';

  const res = await pool.query(
    `SELECT id, name, image_url, images FROM productos
     WHERE image_url LIKE '%supabase.co%' OR EXISTS (
       SELECT 1 FROM unnest(images) AS img WHERE img LIKE '%supabase.co%'
     )`
  );

  console.log(`Dry run: ${DRY_RUN}`);
  console.log(`Productos con URLs de Supabase: ${res.rows.length}`);

  let migrated = 0;
  let errors = 0;

  for (const row of res.rows) {
    const updates: { field: string; oldValue: string; newValue: string }[] = [];

    if (row.image_url && row.image_url.includes('supabase.co')) {
      const path = extractStoragePath(row.image_url);
      if (path) updates.push({ field: 'image_url', oldValue: row.image_url, newValue: path });
    }

    if (row.images && Array.isArray(row.images)) {
      for (let i = 0; i < row.images.length; i++) {
        const img = row.images[i];
        if (img && img.includes('supabase.co')) {
          const path = extractStoragePath(img);
          if (path) updates.push({ field: `images[${i}]`, oldValue: img, newValue: path });
        }
      }
    }

    if (!updates.length) continue;

    console.log(`\nProducto #${row.id} (${row.name}): ${updates.length} imagen(es)`);

    const newImageUrls: Record<string, string> = {};

    for (const u of updates) {
      const storagePath = u.newValue;
      console.log(`  Descargando: ${storagePath}`);

      if (DRY_RUN) {
        const fakeKey = `product-images/${storagePath.split('/').pop()}`;
        const fakeUrl = `${R2_PUBLIC_URL}/${fakeKey}`;
        newImageUrls[u.oldValue] = fakeUrl;
        console.log(`  [DRY] Sería migrado a: ${fakeUrl}`);
        continue;
      }

      try {
        const downloadUrl = `${supabaseUrl}/storage/v1/object/public/${storagePath}`;
        const { buffer, contentType } = await downloadFromSupabase(downloadUrl);

        const filename = storagePath.split('/').pop() || `${Date.now()}.jpg`;
        const key = `product-images/${filename}`;

        await r2.send(new PutObjectCommand({
          Bucket: BUCKET_NAME_R2,
          Key: key,
          Body: buffer,
          ContentType: contentType,
        }));

        const newUrl = `${R2_PUBLIC_URL}/${key}`;
        newImageUrls[u.oldValue] = newUrl;
        console.log(`  Migrado a: ${newUrl}`);
        migrated++;
      } catch (e) {
        console.log(`  ERROR: ${e instanceof Error ? e.message : e}`);
        errors++;
      }
    }

    if (!DRY_RUN && Object.keys(newImageUrls).length) {
      let newImageUrl = row.image_url;
      let newImages = row.images ? [...row.images] : [];

      for (const [old, rep] of Object.entries(newImageUrls)) {
        if (newImageUrl === old) newImageUrl = rep;
        newImages = newImages.map((img: string) => img === old ? rep : img);
      }

      await pool.query(
        'UPDATE productos SET image_url = $1, images = $2 WHERE id = $3',
        [newImageUrl, newImages, row.id]
      );
      console.log(`  DB actualizada para producto #${row.id}`);
    }
  }

  console.log(`\n--- Resumen ---`);
  console.log(`Migradas: ${migrated}, Errores: ${errors}`);
  await pool.end();
}

main().catch((e) => {
  console.error('Error fatal:', e);
  process.exit(1);
});
