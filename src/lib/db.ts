import { Pool } from 'pg';
import type { Producto, ProductoInput, Config, FeaturedConfig } from './types';

export function parseIdOrBadRequest(id: string): number | null {
  const parsed = parseInt(id, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

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
      max: 5,
      connectionTimeoutMillis: 10000,
      idleTimeoutMillis: 30000
    });
  }
  return globalForPg.pgPool;
}

let schemaInitialization: Promise<void> | undefined;

/**
 * Crea las tablas si no existen y agrega columnas nuevas de forma segura.
 * Es exactamente compatible con la tabla "productos" que ya usa tu sitio actual,
 * así que no se pierde ningún dato existente.
 */
export function ensureSchema() {
  schemaInitialization ??= initializeSchema().catch((error) => {
    schemaInitialization = undefined;
    throw error;
  });
  return schemaInitialization;
}

async function initializeSchema() {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(440811, 1)');
    await client.query(`
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
    await client.query(`
      ALTER TABLE productos
        ADD COLUMN IF NOT EXISTS price INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS stock INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT '{}',
        ADD COLUMN IF NOT EXISTS visible BOOLEAN DEFAULT TRUE,
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()
    `);
    await client.query(
      `CREATE TABLE IF NOT EXISTS config (key TEXT PRIMARY KEY, value JSONB DEFAULT '{}'::jsonb)`
    );
    await client.query(`
      CREATE OR REPLACE FUNCTION update_updated_at()
      RETURNS TRIGGER
      SET search_path = pg_catalog
      AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);
    await client.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at' AND tgrelid = 'productos'::regclass
        ) THEN
          CREATE TRIGGER set_updated_at
            BEFORE UPDATE ON productos
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at();
        END IF;
      END $$
    `);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export type Pedido = {
  id: number;
  cliente_nombre: string;
  cliente_whatsapp: string;
  cliente_email: string;
  total: number;
  estado: 'pendiente' | 'confirmado' | 'cancelado' | 'expirado';
  created_at: string;
  confirmado_at: string | null;
  items: PedidoItem[];
};

export type PedidoItem = {
  producto_id: number;
  nombre: string;
  qty: number;
  precio: number;
};

export type EstadoPedido = 'pendiente' | 'confirmado' | 'cancelado' | 'expirado';

const PEDIDO_EXPIRACION_HORAS = 48;

async function ensurePedidosSchema() {
  const pool = getPool();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS pedidos (
      id SERIAL PRIMARY KEY,
      cliente_nombre TEXT DEFAULT '',
      cliente_whatsapp TEXT DEFAULT '',
      total INTEGER DEFAULT 0,
      estado TEXT DEFAULT 'pendiente',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      confirmado_at TIMESTAMPTZ
    )
  `);
  await pool.query(`ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS cliente_email TEXT DEFAULT ''`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS pedido_items (
      id SERIAL PRIMARY KEY,
      pedido_id INTEGER REFERENCES pedidos(id) ON DELETE CASCADE,
      producto_id INTEGER,
      nombre TEXT,
      qty INTEGER DEFAULT 1,
      precio INTEGER DEFAULT 0
    )
  `);
}

function formatPedido(row: Record<string, unknown>, items: PedidoItem[] = []): Pedido {
  return {
    id: row.id as number,
    cliente_nombre: (row.cliente_nombre as string) || '',
    cliente_whatsapp: (row.cliente_whatsapp as string) || '',
    cliente_email: (row.cliente_email as string) || '',
    total: (row.total as number) || 0,
    estado: (row.estado as EstadoPedido) || 'pendiente',
    created_at: row.created_at as string,
    confirmado_at: row.confirmado_at ? (row.confirmado_at as string) : null,
    items
  };
}

async function expirarPedidosViejos(pool: Pool): Promise<void> {
  await pool.query(
    `UPDATE pedidos SET estado = 'expirado'
     WHERE estado = 'pendiente' AND created_at < NOW() - ($1 || ' hours')::INTERVAL`,
    [String(PEDIDO_EXPIRACION_HORAS)]
  );
}

export async function crearPedido(items: { id: number; qty: number }[], clienteNombre: string, clienteWhatsapp: string, clienteEmail: string = ''): Promise<Pedido | null> {
  await ensureSchema();
  await ensurePedidosSchema();
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await expirarPedidosViejos(client as unknown as Pool);

    let total = 0;
    const itemsDetalle: { producto_id: number; nombre: string; qty: number; precio: number }[] = [];

    for (const item of items) {
      const res = await client.query('SELECT id, name, price, stock FROM productos WHERE id = $1 FOR UPDATE', [item.id]);
      if (!res.rows.length) throw new Error(`Producto ${item.id} no encontrado`);
      const p = res.rows[0];
      if ((p.stock || 0) < item.qty) {
        throw new Error(`Stock insuficiente para "${p.name}" (disponible: ${p.stock || 0}, solicitado: ${item.qty})`);
      }
      total += (p.price || 0) * item.qty;
      itemsDetalle.push({ producto_id: p.id, nombre: p.name, qty: item.qty, precio: p.price || 0 });
      await client.query('UPDATE productos SET stock = stock - $1 WHERE id = $2', [item.qty, p.id]);
    }

    const pedidoRes = await client.query(
      `INSERT INTO pedidos (cliente_nombre, cliente_whatsapp, cliente_email, total, estado) VALUES ($1, $2, $3, $4, 'pendiente') RETURNING *`,
      [clienteNombre, clienteWhatsapp, clienteEmail, total]
    );
    const pedidoId = pedidoRes.rows[0].id;

    for (const item of itemsDetalle) {
      await client.query(
        `INSERT INTO pedido_items (pedido_id, producto_id, nombre, qty, precio) VALUES ($1, $2, $3, $4, $5)`,
        [pedidoId, item.producto_id, item.nombre, item.qty, item.precio]
      );
    }

    await client.query('COMMIT');
    return formatPedido(pedidoRes.rows[0], itemsDetalle);
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

export async function getPedidosPendientes(): Promise<Pedido[]> {
  await ensureSchema();
  await ensurePedidosSchema();
  const pool = getPool();
  await expirarPedidosViejos(pool);
  const res = await pool.query(
    `SELECT * FROM pedidos WHERE estado = 'pendiente' ORDER BY created_at DESC`
  );
  const pedidos: Pedido[] = [];
  for (const row of res.rows) {
    const itemsRes = await pool.query(
      `SELECT producto_id, nombre, qty, precio FROM pedido_items WHERE pedido_id = $1`,
      [row.id]
    );
    pedidos.push(formatPedido(row, itemsRes.rows as PedidoItem[]));
  }
  return pedidos;
}

export async function confirmarPedido(id: number): Promise<Pedido | null> {
  await ensureSchema();
  await ensurePedidosSchema();
  const pool = getPool();
  const res = await pool.query(
    `UPDATE pedidos SET estado = 'confirmado', confirmado_at = NOW() WHERE id = $1 AND estado = 'pendiente' RETURNING *`,
    [id]
  );
  if (!res.rows.length) return null;
  const itemsRes = await pool.query(
    `SELECT producto_id, nombre, qty, precio FROM pedido_items WHERE pedido_id = $1`,
    [id]
  );
  return formatPedido(res.rows[0], itemsRes.rows as PedidoItem[]);
}

export async function cancelarPedido(id: number): Promise<Pedido | null> {
  await ensureSchema();
  await ensurePedidosSchema();
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const pedRes = await client.query(
      `SELECT * FROM pedidos WHERE id = $1 AND estado = 'pendiente' FOR UPDATE`,
      [id]
    );
    if (!pedRes.rows.length) {
      await client.query('ROLLBACK');
      return null;
    }
    await client.query(
      `UPDATE pedidos SET estado = 'cancelado' WHERE id = $1`,
      [id]
    );
    const itemsRes = await client.query(
      `SELECT producto_id, qty FROM pedido_items WHERE pedido_id = $1`,
      [id]
    );
    for (const item of itemsRes.rows) {
      await client.query(
        `UPDATE productos SET stock = stock + $1 WHERE id = $2`,
        [item.qty, item.producto_id]
      );
    }
    await client.query('COMMIT');
    const finales = await pool.query(`SELECT * FROM pedidos WHERE id = $1`, [id]);
    const itemsFinales = await pool.query(
      `SELECT producto_id, nombre, qty, precio FROM pedido_items WHERE pedido_id = $1`,
      [id]
    );
    return formatPedido(finales.rows[0], itemsFinales.rows as PedidoItem[]);
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

/** Filtra imágenes que son data URLs base64 (inflan el HTML/ISR) o strings inválidos */
function limpiarImagenes(images: (string | null | undefined)[]): string[] {
  if (!Array.isArray(images)) return [];
  return images
    .filter((img): img is string => typeof img === 'string' && img.length > 0)
    .filter((img) => !img.startsWith('data:'))
    .slice(0, 20);
}

function limpiarImageUrl(url: string | undefined | null): string {
  if (!url || typeof url !== 'string') return '';
  if (url.startsWith('data:')) return '';
  return url;
}

function formatProducto(row: Record<string, unknown>): Producto {
  const images = limpiarImagenes(row.images as (string | null | undefined)[]);
  return {
    id: row.id as number,
    name: row.name as string,
    description: (row.description as string) || '',
    category: row.category as string,
    image_url: limpiarImageUrl(row.image_url as string) || images[0] || '',
    instagram_url: (row.instagram_url as string) || '',
    visible: row.visible !== false,
    price: (row.price as number) || 0,
    stock: (row.stock as number) || 0,
    images,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string | undefined
  };
}

/** Lista para el catálogo público: solo la primera imagen (más liviano) */
export async function getProductosPublicos(): Promise<Producto[]> {
  await ensureSchema();
  const pool = getPool();
  const result = await pool.query(
    `SELECT id, name, description, category, image_url, instagram_url, price, stock, visible, created_at, images[1:1] AS images
     FROM productos WHERE visible = TRUE ORDER BY created_at DESC`
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
  const images = data.images && data.images.length ? data.images : data.image_url ? [data.image_url] : [];
  const result = await pool.query(
    `UPDATE productos SET name = $1, description = $2, category = $3, image_url = $4, instagram_url = $5, price = $7, stock = $8, images = $9
     WHERE id = $6 RETURNING *`,
    [
      data.name,
      data.description || '',
      data.category,
      data.image_url || images[0] || '',
      data.instagram_url || '',
      id,
      data.price || 0,
      data.stock || 0,
      images
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
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `INSERT INTO config (key, value) VALUES ('category_order', $1::jsonb)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
      [JSON.stringify(config.categoryOrder)]
    );
    await client.query(
      `INSERT INTO config (key, value) VALUES ('featured', $1::jsonb)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
      [JSON.stringify(config.featured)]
    );
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
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

export const PEDIDO_EXPIRACION_MS = PEDIDO_EXPIRACION_HORAS * 60 * 60 * 1000;

export async function getPedidoByIdPublic(id: number): Promise<Pedido | null> {
  await ensureSchema();
  await ensurePedidosSchema();
  const pool = getPool();
  await expirarPedidosViejos(pool);
  const res = await pool.query(`SELECT * FROM pedidos WHERE id = $1`, [id]);
  if (!res.rows.length) return null;
  const itemsRes = await pool.query(
    `SELECT producto_id, nombre, qty, precio FROM pedido_items WHERE pedido_id = $1`,
    [id]
  );
  return formatPedido(res.rows[0], itemsRes.rows as PedidoItem[]);
}
