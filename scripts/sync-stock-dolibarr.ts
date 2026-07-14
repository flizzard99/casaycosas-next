/**
 * Script: Sync stock desde Dolibarr → web
 *
 * Lee todos los productos de Dolibarr (paginados), busca por ref_ext/ref
 * en la tabla productos de la web, y actualiza el stock.
 *
 * Uso:
 *   npx tsx --env-file=.env.local scripts/sync-stock-dolibarr.ts        # dry-run (preview)
 *   npx tsx --env-file=.env.local scripts/sync-stock-dolibarr.ts --run   # ejecutar
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

type DolibarrProduct = {
  id: number;
  ref: string;
  ref_ext: string | null;
  stock_reel: number;
};

async function fetchPage(page: number, limit: number): Promise<{ data: DolibarrProduct[]; pagination: { page_count: number } }> {
  const url = `${process.env.DOLIBARR_API_URL}/api/index.php/products?includestockdata=1&pagination_data=true&mode=1&limit=${limit}&page=${page}&sortfield=t.rowid&sortorder=ASC`;
  const res = await fetch(url, {
    headers: { DOLAPIKEY: process.env.DOLIBARR_API_KEY || '', 'Content-Type': 'application/json' }
  });
  if (!res.ok) throw new Error(`Dolibarr API error: ${res.status} ${res.statusText}`);
  return res.json();
}

async function fetchAll(): Promise<DolibarrProduct[]> {
  const all: DolibarrProduct[] = [];
  let page = 0;
  while (true) {
    const { data, pagination } = await fetchPage(page, 100);
    all.push(...data);
    page++;
    if (page >= pagination.page_count) break;
  }
  return all;
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('ERROR: DATABASE_URL no configurada');
    process.exit(1);
  }
  if (!process.env.DOLIBARR_API_URL || !process.env.DOLIBARR_API_KEY) {
    console.error('ERROR: DOLIBARR_API_URL y DOLIBARR_API_KEY deben estar configuradas');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });

  try {
    console.log('📡 Consultando Dolibarr...');
    const doliProducts = await fetchAll();
    console.log(`   ${doliProducts.length} productos descargados de Dolibarr`);

    const webResult = await pool.query(`SELECT id, name, stock, dolibarr_ref FROM productos WHERE dolibarr_ref IS NOT NULL AND dolibarr_ref != ''`);
    const webByRef = new Map<string, { id: number; name: string; stock: number }>();
    for (const row of webResult.rows) {
      webByRef.set(row.dolibarr_ref, { id: row.id, name: row.name, stock: row.stock });
    }

    console.log(`\n📋 Productos web con dolibarr_ref: ${webResult.rows.length}`);
    console.log(`   Productos Dolibarr: ${doliProducts.length}`);

    let matchCount = 0;
    let updateCount = 0;
    let noMatchCount = 0;

    const updates: { webId: number; name: string; oldStock: number; newStock: number }[] = [];

    for (const doli of doliProducts) {
      const ref = doli.ref_ext || doli.ref;
      if (!ref) continue;

      const web = webByRef.get(ref);
      if (!web) {
        noMatchCount++;
        continue;
      }

      matchCount++;
      if (web.stock !== doli.stock_reel) {
        updates.push({ webId: web.id, name: web.name, oldStock: web.stock, newStock: doli.stock_reel });
        updateCount++;
      }
    }

    console.log('\n' + '─'.repeat(70));
    console.log(`  Matches (ref → web):  ${matchCount}`);
    console.log(`  Sin match en web:     ${noMatchCount}`);
    console.log(`  Stock diferente:      ${updateCount}`);
    console.log('─'.repeat(70));

    if (updates.length > 0) {
      console.log('\nCambios a aplicar:');
      for (const u of updates) {
        console.log(`  #${u.webId}  ${u.oldStock} → ${u.newStock}   ${u.name}`);
      }
      console.log('─'.repeat(70));
    }

    if (dryRun) {
      console.log('\n🔍 DRY-RUN: no se hicieron cambios. Ejecuta con --run para aplicar.');
      return;
    }

    let applied = 0;
    for (const u of updates) {
      await pool.query(`UPDATE productos SET stock = GREATEST(0, $1) WHERE id = $2`, [u.newStock, u.webId]);
      applied++;
    }
    console.log(`\n✅ ${applied} productos actualizados.`);
  } catch (e) {
    console.error('Error:', e);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
