/**
 * Script: Migrar URLs de imágenes de Supabase → dominio custom (Cloudflare CDN)
 *
 * Reemplaza todas las URLs de Supabase Storage en la DB por el dominio custom.
 * Úsalo después de configurar el Cloudflare Worker en images.casaycosas.cl.
 *
 * Uso:
 *   npx tsx --env-file=.env.local scripts/migrate-storage-urls.ts        # dry-run
 *   npx tsx --env-file=.env.local scripts/migrate-storage-urls.ts --run   # ejecutar
 */

import { Pool } from 'pg';
import { readFileSync } from 'fs';
import { join } from 'path';

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
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnv();

const dryRun = !process.argv.includes('--run');

async function main() {
  const cdnDomain = process.env.SUPABASE_CDN_DOMAIN;
  const projectRef = process.env.SUPABASE_PROJECT_REF;

  if (!process.env.DATABASE_URL) {
    console.error('ERROR: DATABASE_URL no configurada');
    process.exit(1);
  }
  if (!cdnDomain || !projectRef) {
    console.error('ERROR: SUPABASE_CDN_DOMAIN y SUPABASE_PROJECT_REF deben estar configuradas');
    process.exit(1);
  }

  const oldOrigin = `https://${projectRef}.supabase.co`;
  const newOrigin = `https://${cdnDomain}`;

  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });

  try {
    const imageUrls = await pool.query(
      `SELECT id, image_url FROM productos WHERE image_url LIKE $1`,
      [`%${oldOrigin}%`]
    );
    const imagesArrays = await pool.query(
      `SELECT id, images FROM productos WHERE $1 = ANY(images)`,
      [oldOrigin]
    );

    let totalAffected = 0;
    const affectedIds = new Set<number>();

    for (const row of imageUrls.rows) {
      affectedIds.add(row.id);
      totalAffected++;
      if (dryRun) {
        console.log(`  image_url: #${row.id}  ${row.image_url.slice(0, 80)}... → ${cdnDomain}`);
      }
    }

    for (const row of imagesArrays.rows) {
      if (!affectedIds.has(row.id)) {
        affectedIds.add(row.id);
        totalAffected++;
      }
      if (dryRun) {
        const count = (row.images || []).length;
        console.log(`  images[]:  #${row.id}  (${count} imgs con URL de supabase.co)`);
      }
    }

    console.log(`\n📋 Productos afectados: ${totalAffected}`);
    console.log(`   Dominio nuevo: ${newOrigin}`);

    if (dryRun) {
      console.log('\n🔍 DRY-RUN: no se hicieron cambios. Ejecuta con --run para aplicar.');
      return;
    }

    const res1 = await pool.query(
      `UPDATE productos SET image_url = REPLACE(image_url, $1, $2) WHERE image_url LIKE $3`,
      [oldOrigin, newOrigin, `%${oldOrigin}%`]
    );
    console.log(`✅ image_url actualizados: ${res1.rowCount}`);

    const allWithImages = await pool.query(
      `SELECT id, images FROM productos WHERE array_length(images, 1) > 0`
    );
    let updated = 0;
    for (const row of allWithImages.rows) {
      const images: string[] = row.images || [];
      const hasOld = images.some((img) => img.startsWith(oldOrigin));
      if (!hasOld) continue;
      const newImages = images.map((img) => img.replace(oldOrigin, newOrigin));
      await pool.query(`UPDATE productos SET images = $1 WHERE id = $2`, [newImages, row.id]);
      updated++;
    }
    console.log(`✅ images[] actualizados: ${updated}`);
  } catch (e) {
    console.error('Error:', e);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
