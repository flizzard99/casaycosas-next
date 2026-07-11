import { Pool } from 'pg';
import type { Producto, ProductoInput, Config, FeaturedConfig } from './types';

// Reutilizamos el pool entre recargas en desarrollo (patrón recomendado para Next.js)
const globalForPg = globalThis as unknown as { pgPool?: Pool };

function getPool(): Pool {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      'DATABASE_URL no está configurada. Define la variable de entorno con tu conexión de Supabase/Postgres.'
    );
  }
  if (!globalForPg.pgPool) {
    globalForPg.pgPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 5
    });
  }
  return globalForPg.pgPool;
}

let schemaReady = false;

/**
 * Crea las tablas si no existen y agrega columnas nuevas de forma segura.
 * Es exactamente compatible con la tabla "productos" que ya usa tu sitio actual,
 * así que no se pierde ningún dato existente.
 */
export async function ensureSchema() {
  if (schemaReady) return;
  const pool = getPool();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS productos (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      category TEXT NOT NULL,
      image_url TEXT DEFAULT '',
      instagram_url TEXT DEFAULT '',
      visible BOOLEAN DEFAULT TRUE,
      price INTEGER DEFAULT 0,
      stock INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  await Promise.all([
    pool.query(`ALTER TABLE productos ADD COLUMN IF NOT EXISTS price INTEGER DEFAULT 0`),
    pool.query(`ALTER TABLE productos ADD COLUMN IF NOT EXISTS stock INTEGER DEFAULT 0`),
    pool.query(`ALTER TABLE productos ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT '{}'`),
    pool.query(`ALTER TABLE productos ADD COLUMN IF NOT EXISTS visible BOOLEAN DEFAULT TRUE`)
  ]);
  await pool.query(
    `CREATE TABLE IF NOT EXISTS config (key TEXT PRIMARY KEY, value JSONB DEFAULT '{}'::jsonb)`
  );
  schemaReady = true;
}

/** Filtra imágenes que son data URLs base64 (inflan el HTML/ISR) o strings inválidos */
function limpiarImagenes(images: any[]): string[] {
  if (!Array.isArray(images)) return [];
  return images
    .filter((img): img is string => typeof img === 'string' && img.length > 0)
    .filter((img) => !img.startsWith('data:'))
    .filter((img) => img.length < 500)
    .slice(0, 20);
}

function limpiarImageUrl(url: string | undefined | null): string {
  if (!url || typeof url !== 'string') return '';
  if (url.startsWith('data:') || url.length >= 500) return '';
  return url;
}

function formatProducto(row: any): Producto {
  const images = limpiarImagenes(row.images);
  return {
    id: row.id,
    name: row.name,
    description: row.description || '',
    category: row.category,
    image_url: limpiarImageUrl(row.image_url) || images[0] || '',
    instagram_url: row.instagram_url || '',
    visible: row.visible !== false,
    price: row.price || 0,
    stock: row.stock || 0,
    images,
    created_at: row.created_at
  };
}

/** Lista para el catálogo público: solo la primera imagen (más liviano) */
export async function getProductosPublicos(): Promise<Producto[]> {
  await ensureSchema();
  const pool = getPool();
  const result = await pool.query(
    `SELECT id, name, description, category, image_url, instagram_url, price, stock, visible, created_at, images[1:1] AS images
     FROM productos WHERE visible = TRUE ORDER BY created_at ASC`
  );
  return result.rows.map(formatProducto);
}

/** Lista completa para el panel admin (incluye ocultos y todas las imágenes) */
export async function getProductosAdmin(): Promise<Producto[]> {
  await ensureSchema();
  const pool = getPool();
  const result = await pool.query(`SELECT * FROM productos ORDER BY created_at DESC`);
  return result.rows.map(formatProducto);
}

export async function getProductoById(id: number): Promise<Producto | null> {
  await ensureSchema();
  const pool = getPool();
  const result = await pool.query(
    `SELECT id, name, description, category, image_url, instagram_url, price, stock, visible, created_at, images[1:10] AS images
     FROM productos WHERE id = $1`,
    [id]
  );
  return result.rows.length ? formatProducto(result.rows[0]) : null;
}

export async function createProducto(data: ProductoInput): Promise<Producto> {
  await ensureSchema();
  const pool = getPool();
  const images = data.images && data.images.length ? data.images : data.image_url ? [data.image_url] : [];
  const result = await pool.query(
    `INSERT INTO productos (name, description, category, image_url, instagram_url, visible, price, stock, images)
     VALUES ($1, $2, $3, $4, $5, TRUE, $6, $7, $8) RETURNING *`,
    [
      data.name,
      data.description || '',
      data.category,
      data.image_url || (images[0] ?? ''),
      data.instagram_url || '',
      data.price || 0,
      data.stock || 0,
      images
    ]
  );
  return formatProducto(result.rows[0]);
}

export async function updateProducto(id: number, data: ProductoInput): Promise<Producto | null> {
  await ensureSchema();
  const pool = getPool();
  const result = await pool.query(
    `UPDATE productos SET name = $1, description = $2, category = $3, image_url = $4, instagram_url = $5, price = $7, stock = $8
     WHERE id = $6 RETURNING *`,
    [
      data.name,
      data.description || '',
      data.category,
      data.image_url || '',
      data.instagram_url || '',
      id,
      data.price || 0,
      data.stock || 0
    ]
  );
  return result.rows.length ? formatProducto(result.rows[0]) : null;
}

export async function deleteProducto(id: number): Promise<boolean> {
  await ensureSchema();
  const pool = getPool();
  const result = await pool.query(`DELETE FROM productos WHERE id = $1`, [id]);
  return (result.rowCount ?? 0) > 0;
}

export async function setVisibilidad(id: number, visible: boolean): Promise<Producto | null> {
  await ensureSchema();
  const pool = getPool();
  const result = await pool.query(
    `UPDATE productos SET visible = $1 WHERE id = $2 RETURNING *`,
    [visible, id]
  );
  return result.rows.length ? formatProducto(result.rows[0]) : null;
}

/** Ajusta el stock sumando/restando (delta puede ser negativo). Nunca baja de 0. */
export async function ajustarStock(id: number, delta: number): Promise<Producto | null> {
  await ensureSchema();
  const pool = getPool();
  const result = await pool.query(
    `UPDATE productos SET stock = GREATEST(0, stock + $1) WHERE id = $2 RETURNING *`,
    [Math.floor(delta), id]
  );
  return result.rows.length ? formatProducto(result.rows[0]) : null;
}

export async function agregarImagenes(id: number, nuevas: string[]): Promise<Producto | null> {
  await ensureSchema();
  const pool = getPool();
  const result = await pool.query(
    `UPDATE productos SET images = array_cat(COALESCE(images, ARRAY[]::TEXT[]), $1) WHERE id = $2 RETURNING *`,
    [nuevas, id]
  );
  return result.rows.length ? formatProducto(result.rows[0]) : null;
}

export async function eliminarImagen(id: number, index: number): Promise<Producto | null> {
  await ensureSchema();
  const pool = getPool();
  const actual = await pool.query(`SELECT images FROM productos WHERE id = $1`, [id]);
  if (!actual.rows.length) return null;
  const images: string[] = (actual.rows[0].images || []).filter((_: string, i: number) => i !== index);
  const result = await pool.query(`UPDATE productos SET images = $2 WHERE id = $1 RETURNING *`, [id, images]);
  return result.rows.length ? formatProducto(result.rows[0]) : null;
}

export async function getConfig(): Promise<Config> {
  await ensureSchema();
  const pool = getPool();
  const [resCat, resFeat] = await Promise.all([
    pool.query(`SELECT value FROM config WHERE key = 'category_order'`),
    pool.query(`SELECT value FROM config WHERE key = 'featured'`)
  ]);
  const featured: FeaturedConfig = resFeat.rows.length
    ? resFeat.rows[0].value
    : { productIds: [], title: 'Productos más vendidos' };
  return {
    categoryOrder: resCat.rows.length ? resCat.rows[0].value : [],
    featured: {
      productIds: Array.isArray(featured.productIds) ? featured.productIds.slice(0, 4) : [],
      title: featured.title || 'Productos más vendidos'
    }
  };
}

export async function saveConfig(config: Config): Promise<void> {
  await ensureSchema();
  const pool = getPool();
  await pool.query(
    `INSERT INTO config (key, value) VALUES ('category_order', $1::jsonb)
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
    [JSON.stringify(config.categoryOrder)]
  );
  await pool.query(
    `INSERT INTO config (key, value) VALUES ('featured', $1::jsonb)
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
    [JSON.stringify(config.featured)]
  );
}

/** Devuelve hasta 4 productos visibles correspondientes a los IDs destacados, en orden */
export async function getFeaturedProducts(): Promise<Producto[]> {
  await ensureSchema();
  const pool = getPool();
  const config = await getConfig();
  const ids = config.featured.productIds.filter((id) => Number.isFinite(id));
  if (!ids.length) return [];
  const result = await pool.query(
    `SELECT id, name, description, category, image_url, instagram_url, price, stock, visible, created_at, images[1:1] AS images
     FROM productos WHERE id = ANY($1) AND visible = TRUE`,
    [ids]
  );
  const byId = new Map(result.rows.map((r) => [r.id, formatProducto(r)]));
  return ids.map((id) => byId.get(id)).filter((p): p is Producto => !!p);
}
