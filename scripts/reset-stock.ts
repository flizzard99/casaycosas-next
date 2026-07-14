/**
 * Script: Reset de stock para productos con stock >= 1 → 10
 *
 * Los productos con stock 0 se mantienen intactos.
 * Los productos con stock 1 o más se cambian a stock 10.
 *
 * Uso:
 *   npx tsx --env-file=.env.local scripts/reset-stock.ts        # dry-run (preview)
 *   npx tsx --env-file=.env.local scripts/reset-stock.ts --run   # ejecutar
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

const NEW_STOCK = 10;
const dryRun = !process.argv.includes('--run');

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('ERROR: DATABASE_URL no configurada');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });

  try {
    const preview = await pool.query(
      `SELECT id, name, stock FROM productos WHERE stock >= 1 ORDER BY id`
    );

    console.log(`\n📋 Productos a actualizar (stock >= 1 → ${NEW_STOCK}): ${preview.rows.length}`);
    console.log('─'.repeat(60));
    for (const row of preview.rows) {
      console.log(`  #${row.id}  stock ${row.stock} → ${NEW_STOCK}   ${row.name}`);
    }
    console.log('─'.repeat(60));

    const sinCambios = await pool.query(
      `SELECT count(*) as total FROM productos WHERE stock = 0`
    );
    console.log(`✅ Productos SIN cambios (stock 0): ${sinCambios.rows[0].total}`);

    if (dryRun) {
      console.log('\n🔍 DRY-RUN: no se hicieron cambios. Ejecuta con --run para aplicar.');
      return;
    }

    const result = await pool.query(
      `UPDATE productos SET stock = $1 WHERE stock >= 1 RETURNING id, name`,
      [NEW_STOCK]
    );
    console.log(`\n✅ ${result.rows.length} productos actualizados a stock ${NEW_STOCK}.`);
  } catch (e) {
    console.error('Error:', e);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();