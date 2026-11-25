import { Pool } from 'pg';
import { randomBytes, randomUUID } from 'node:crypto';
import { categoriaDefinida, type Linea } from './lineas';
import { MAX_DESTACADOS, TITULO_DESTACADOS } from './destacados';
import { nombreConVariante } from './variantes';
import { precioActual } from './precios';
import { ENVIO_CHILE, TRANSFERENCIA_RESERVA_HORAS, type DatosTransferencia, type MetodoPago } from './checkout';
import type { Config, DisenoSeccion, FeaturedConfig, Producto, ProductoInput, Variante } from './types';

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
        ADD COLUMN IF NOT EXISTS remate BOOLEAN NOT NULL DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS precio_oferta INTEGER,
        ADD COLUMN IF NOT EXISTS subcategoria TEXT NOT NULL DEFAULT '',
        ADD COLUMN IF NOT EXISTS variantes JSONB NOT NULL DEFAULT '[]'::jsonb,
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()
    `);
    await client.query(
      `CREATE TABLE IF NOT EXISTS config (key TEXT PRIMARY KEY, value JSONB DEFAULT '{}'::jsonb)`
    );
    await client.query(`
      CREATE TABLE IF NOT EXISTS app_migrations (
        key TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      ALTER TABLE app_migrations ENABLE ROW LEVEL SECURITY;
      ALTER TABLE productos ADD COLUMN IF NOT EXISTS fusionado_en INTEGER;
    `);
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
    await migrarProductosPorColor(client);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

const GRUPOS_COLOR_LEGACY = [
  {
    key: 'fusion-colores-bombilla-inox-keep-v1', principal: 823, nombre: 'Bombilla INOX KEEP',
    productos: [
      { id: 823, nombre: 'Bombilla INOX KEEP Rosada', color: 'Rosada' },
      { id: 822, nombre: 'Bombilla INOX KEEP Plateada', color: 'Plateada' },
      { id: 821, nombre: 'Bombilla INOX KEEP Verde', color: 'Verde' },
      { id: 820, nombre: 'Bombilla INOX KEEP Negra', color: 'Negra' }
    ]
  },
  {
    key: 'fusion-colores-kit-yerbera-ecocuero-v1', principal: 810, nombre: 'Kit Yerbera + Azucarera Ecocuero',
    productos: [
      { id: 813, nombre: 'Kit Yerbera + Azucarera Ecocuero Café', color: 'Café' },
      { id: 812, nombre: 'Kit Yerbera + Azucarera Ecocuero Gris', color: 'Gris' },
      { id: 811, nombre: 'Kit Yerbera + Azucarera Ecocuero Negra', color: 'Negra' },
      { id: 810, nombre: 'Kit Yerbera + Azucarera Ecocuero Borgoña', color: 'Borgoña' }
    ]
  },
  {
    key: 'fusion-colores-mate-autocebante-keep-v1', principal: 807, nombre: 'Mate AUTOCEBANTE KEEP',
    productos: [
      { id: 809, nombre: 'Mate AUTOCEBANTE KEEP Morado', color: 'Morado' },
      { id: 808, nombre: 'Mate AUTOCEBANTE KEEP Verde', color: 'Verde' },
      { id: 807, nombre: 'Mate AUTOCEBANTE KEEP Negro', color: 'Negro' }
    ]
  },
  {
    key: 'fusion-colores-yerbera-anymate-v1', principal: 803, nombre: 'Yerbera Metálica ANYMATE',
    productos: [
      { id: 806, nombre: 'Yerbera Metálica NARANJA ANYMATE', color: 'Naranja' },
      { id: 805, nombre: 'Yerbera Metálica AZUL ANYMATE', color: 'Azul' },
      { id: 804, nombre: 'Yerbera Metálica VERDE ANYMATE', color: 'Verde' },
      { id: 803, nombre: 'Yerbera Metálica NEGRA ANYMATE', color: 'Negra' }
    ]
  },
  {
    key: 'fusion-colores-termo-bala-anymate-v1', principal: 798, nombre: 'Termo Bala ANYMATE 500ml',
    productos: [
      { id: 801, nombre: 'Termo Bala NEGRO ANYMATE 500ml', color: 'Negro' },
      { id: 800, nombre: 'Termo Bala PLATA ANYMATE 500ml', color: 'Plata' },
      { id: 799, nombre: 'Termo Bala COBRE ANYMATE 500ml', color: 'Cobre' },
      { id: 798, nombre: 'Termo Bala AZUL ANYMATE 500ml', color: 'Azul' }
    ]
  },
  {
    key: 'fusion-colores-termo-cebador-anymate-v1', principal: 794, nombre: 'Termo Cebador ANYMATE 800ml',
    productos: [
      { id: 797, nombre: 'Termo Cebador VERDE ANYMATE 800ml', color: 'Verde' },
      { id: 796, nombre: 'Termo Cebador ROSA ANYMATE 800ml', color: 'Rosa' },
      { id: 795, nombre: 'Termo Cebador Negro ANYMATE 800ml', color: 'Negro' },
      { id: 794, nombre: 'Termo Cebador ANYMATE AZUL 800ml', color: 'Azul' }
    ]
  },
  {
    key: 'fusion-colores-canasto-ecocuero-v1', principal: 792, nombre: 'Canasto Matero EcoCuero Reforzado',
    productos: [
      { id: 793, nombre: 'Canasto Matero NEGRO EcoCuero Reforzado', color: 'Negro' },
      { id: 792, nombre: 'Canasto Matero FUCSIA EcoCuero Reforzado', color: 'Fucsia' }
    ]
  },
  {
    key: 'fusion-colores-canasto-cuero-v1', principal: 790, nombre: 'Canasto Matero 100% Cuero',
    productos: [
      { id: 791, nombre: 'Canasto Matero CAFÉ 100% Cuero', color: 'Café' },
      { id: 790, nombre: 'Canasto Matero NEGRO 100% Cuero', color: 'Negro' }
    ]
  },
  {
    key: 'fusion-colores-biblia-gran-viaje-v1', principal: 310, nombre: 'Biblia Mi Gran Viaje',
    productos: [
      { id: 310, nombre: 'Biblia Mi Gran Viaje Rosado', color: 'Rosado' },
      { id: 143, nombre: 'Biblia Mi Gran Viaje Amarilla', color: 'Amarilla' },
      { id: 119, nombre: 'Biblia Mi Gran Viaje Azul', color: 'Azul' }
    ]
  }
] as const;

function reemplazarDestacados(valor: unknown, ids: Map<number, number>): unknown {
  if (Array.isArray(valor)) return valor.map((item) => reemplazarDestacados(item, ids));
  if (!valor || typeof valor !== 'object') return valor;
  const actualizado: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(valor)) {
    if (key === 'productIds' && Array.isArray(item)) {
      actualizado[key] = [...new Set(item.map((id) => typeof id === 'number' ? ids.get(id) ?? id : id))];
    } else {
      actualizado[key] = reemplazarDestacados(item, ids);
    }
  }
  return actualizado;
}

async function migrarProductosPorColor(client: import('pg').PoolClient) {
  const tablaPedidos = await client.query("SELECT to_regclass('public.pedidos') IS NOT NULL AND to_regclass('public.pedido_items') IS NOT NULL AS existe");
  const reemplazos = new Map<number, number>();
  for (const grupo of GRUPOS_COLOR_LEGACY) {
    const aplicada = await client.query('SELECT 1 FROM app_migrations WHERE key = $1', [grupo.key]);
    if (aplicada.rowCount) continue;
    const ids = grupo.productos.map(({ id }) => id);
    const resultado = await client.query('SELECT * FROM productos WHERE id = ANY($1::integer[]) FOR UPDATE', [ids]);
    if (resultado.rows.length !== ids.length) continue;
    const filas = new Map<number, Record<string, unknown>>(resultado.rows.map((row) => [row.id, row]));
    if (grupo.productos.some(({ id, nombre }) => filas.get(id)?.name !== nombre)) continue;
    if (tablaPedidos.rows[0]?.existe) {
      const pendientes = await client.query(
        `SELECT 1 FROM pedido_items i JOIN pedidos p ON p.id = i.pedido_id
         WHERE i.producto_id = ANY($1::integer[]) AND p.estado = 'pendiente' AND p.eliminado_at IS NULL LIMIT 1`, [ids]
      );
      if (pendientes.rowCount) continue;
    }
    const principal = filas.get(grupo.principal)!;
    const variantes: Variante[] = [];
    const imagenes: string[] = [];
    for (const item of grupo.productos) {
      const fila = filas.get(item.id)!;
      const existentes = Array.isArray(fila.variantes) ? fila.variantes as Variante[] : [];
      if (existentes.length) {
        variantes.push(...existentes.map((variante) => ({ ...variante, color: variante.color || item.color })));
      } else {
        variantes.push({ id: randomUUID(), color: item.color, stock: Number(fila.stock) || 0 });
      }
      for (const imagen of [fila.image_url, ...(Array.isArray(fila.images) ? fila.images : [])]) {
        if (typeof imagen === 'string' && imagen && !imagenes.includes(imagen)) imagenes.push(imagen);
      }
      if (item.id !== grupo.principal) reemplazos.set(item.id, grupo.principal);
    }
    await client.query(
      `UPDATE productos SET name = $2, stock = $3, variantes = $4::jsonb, images = $5,
       image_url = $6, visible = TRUE, fusionado_en = NULL WHERE id = $1`,
      [grupo.principal, grupo.nombre, variantes.reduce((total, variante) => total + variante.stock, 0),
        JSON.stringify(variantes), imagenes.slice(0, 20), imagenes[0] || principal.image_url || '']
    );
    await client.query(
      'UPDATE productos SET visible = FALSE, fusionado_en = $1 WHERE id = ANY($2::integer[])',
      [grupo.principal, ids.filter((id) => id !== grupo.principal)]
    );
    await client.query('INSERT INTO app_migrations (key) VALUES ($1)', [grupo.key]);
  }
  if (reemplazos.size) {
    const configs = await client.query("SELECT key, value FROM config WHERE key IN ('featured', 'featured_by_line')");
    for (const config of configs.rows) {
      await client.query('UPDATE config SET value = $2::jsonb WHERE key = $1',
        [config.key, JSON.stringify(reemplazarDestacados(config.value, reemplazos))]);
    }
  }
}

export type Pedido = {
  id: number;
  codigo_publico: string;
  cliente_nombre: string;
  cliente_whatsapp: string;
  cliente_email: string;
  cliente_rut: string | null;
  costo_envio: number;
  sin_envio: boolean;
  total: number;
  estado: 'pendiente' | 'confirmado' | 'cancelado' | 'expirado';
  created_at: string;
  confirmado_at: string | null;
  revisado_at: string | null;
  eliminado_at: string | null;
  items: PedidoItem[];
  pago_estado: 'pendiente' | 'aprobado' | 'revision' | null;
  pago_id: string | null;
  pago_url: string | null;
  pago_referencia: string | null;
  metodo_pago: MetodoPago | null;
  datos_transferencia: DatosTransferencia | null;
  pago_revision: string | null;
  despacho: DespachoPedido | null;
  despachado_at: string | null;
  codigo_despacho: string | null;
};

export type DespachoPedido = { region: string; comuna: string; direccion: string; nota?: string };
type Compra = { referencia: string; despacho: DespachoPedido | null; totalEsperado: number; rut: string;
  aceptacionLegal: { version: string; fecha: string } } & (
  { metodo: 'tarjeta'; transferencia: null } | { metodo: 'transferencia'; transferencia: DatosTransferencia }
);

export type ItemCompra = { id: number; qty: number; varianteId?: string };

export type PedidoItem = {
  variante_id?: string | null;
  producto_id: number;
  nombre: string;
  qty: number;
  precio: number;
};

export type EstadoPedido = 'pendiente' | 'confirmado' | 'cancelado' | 'expirado';

export const COMPRA_EXPIRACION_MINUTOS = 45;

let pedidosInitialization: Promise<void> | undefined;

function ensurePedidosSchema() {
  pedidosInitialization ??= initializePedidosSchema().catch((error) => {
    pedidosInitialization = undefined;
    throw error;
  });
  return pedidosInitialization;
}

async function initializePedidosSchema() {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(440811, 2)');
    await client.query(`
      CREATE TABLE IF NOT EXISTS pedidos (
        id SERIAL PRIMARY KEY,
        cliente_nombre TEXT DEFAULT '',
        cliente_whatsapp TEXT DEFAULT '',
        total INTEGER DEFAULT 0,
        estado TEXT DEFAULT 'pendiente',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        confirmado_at TIMESTAMPTZ
      );
      ALTER TABLE pedidos
        ADD COLUMN IF NOT EXISTS codigo_publico TEXT,
        ADD COLUMN IF NOT EXISTS cliente_email TEXT DEFAULT '',
        ADD COLUMN IF NOT EXISTS cliente_rut TEXT,
        ADD COLUMN IF NOT EXISTS metodo_pago TEXT,
        ADD COLUMN IF NOT EXISTS costo_envio INTEGER NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS sin_envio BOOLEAN NOT NULL DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS datos_transferencia JSONB,
        ADD COLUMN IF NOT EXISTS eliminado_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS pago_referencia UUID,
        ADD COLUMN IF NOT EXISTS pago_estado TEXT,
        ADD COLUMN IF NOT EXISTS pago_id TEXT,
        ADD COLUMN IF NOT EXISTS pago_url TEXT,
        ADD COLUMN IF NOT EXISTS pago_revision TEXT,
        ADD COLUMN IF NOT EXISTS despacho JSONB,
        ADD COLUMN IF NOT EXISTS despachado_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS codigo_despacho TEXT;
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'pedidos' AND column_name = 'revisado_at'
        ) THEN
          ALTER TABLE pedidos ADD COLUMN revisado_at TIMESTAMPTZ;
          UPDATE pedidos SET revisado_at = created_at;
        END IF;
      END $$;
      ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS estado_antes_eliminar TEXT;
      ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS aceptacion_legal JSONB;
      UPDATE pedidos SET codigo_publico = 'CYC-' ||
        UPPER(SUBSTRING(md5(id::text || random()::text || clock_timestamp()::text), 1, 4)) || '-' ||
        UPPER(SUBSTRING(md5(id::text || random()::text || clock_timestamp()::text), 5, 4)) || '-' ||
        UPPER(SUBSTRING(md5(id::text || random()::text || clock_timestamp()::text), 9, 4)) || '-' ||
        UPPER(SUBSTRING(md5(id::text || random()::text || clock_timestamp()::text), 13, 4))
        WHERE codigo_publico IS NULL;
      ALTER TABLE pedidos ALTER COLUMN codigo_publico SET NOT NULL;
      CREATE TABLE IF NOT EXISTS pedido_items (
        id SERIAL PRIMARY KEY,
        pedido_id INTEGER REFERENCES pedidos(id) ON DELETE CASCADE,
        producto_id INTEGER,
        nombre TEXT,
        qty INTEGER DEFAULT 1,
        precio INTEGER DEFAULT 0
      );
      ALTER TABLE pedido_items ADD COLUMN IF NOT EXISTS variante_id UUID;
      ALTER TABLE pedidos ENABLE ROW LEVEL SECURITY;
      ALTER TABLE pedido_items ENABLE ROW LEVEL SECURITY;
      CREATE TABLE IF NOT EXISTS config_transferencia (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        datos JSONB NOT NULL
      );
      ALTER TABLE config_transferencia ENABLE ROW LEVEL SECURITY;
      CREATE UNIQUE INDEX IF NOT EXISTS pedidos_pago_referencia_uidx ON pedidos(pago_referencia) WHERE pago_referencia IS NOT NULL;
      CREATE UNIQUE INDEX IF NOT EXISTS pedidos_pago_id_uidx ON pedidos(pago_id) WHERE pago_id IS NOT NULL;
      CREATE UNIQUE INDEX IF NOT EXISTS pedidos_codigo_publico_uidx ON pedidos(codigo_publico);
      CREATE INDEX IF NOT EXISTS pedidos_pendientes_fecha_idx ON pedidos(created_at) WHERE estado = 'pendiente';
      CREATE INDEX IF NOT EXISTS pedidos_eliminados_fecha_idx ON pedidos(eliminado_at) WHERE eliminado_at IS NOT NULL;
      CREATE INDEX IF NOT EXISTS pedidos_sin_revisar_idx ON pedidos(created_at DESC) WHERE revisado_at IS NULL AND eliminado_at IS NULL;
      CREATE INDEX IF NOT EXISTS pedido_items_pedido_id_idx ON pedido_items(pedido_id);
    `);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

function formatPedido(row: Record<string, unknown>, items: PedidoItem[] = []): Pedido {
  return {
    id: row.id as number,
    codigo_publico: row.codigo_publico as string,
    cliente_nombre: (row.cliente_nombre as string) || '',
    cliente_whatsapp: (row.cliente_whatsapp as string) || '',
    cliente_email: (row.cliente_email as string) || '',
    cliente_rut: (row.cliente_rut as string) ?? null,
    costo_envio: (row.costo_envio as number) ?? 0,
    sin_envio: row.sin_envio === true,
    total: (row.total as number) || 0,
    estado: (row.estado as EstadoPedido) || 'pendiente',
    created_at: row.created_at as string,
    confirmado_at: row.confirmado_at ? (row.confirmado_at as string) : null,
    revisado_at: row.revisado_at ? (row.revisado_at as string) : null,
    eliminado_at: row.eliminado_at ? (row.eliminado_at as string) : null,
    items,
    pago_estado: (row.pago_estado as Pedido['pago_estado']) ?? null,
    pago_id: (row.pago_id as string) ?? null,
    pago_url: (row.pago_url as string) ?? null,
    pago_referencia: (row.pago_referencia as string) ?? null,
    metodo_pago: (row.metodo_pago as MetodoPago) ?? (row.pago_referencia ? 'tarjeta' : null),
    datos_transferencia: (row.datos_transferencia as DatosTransferencia) ?? null,
    pago_revision: (row.pago_revision as string) ?? null,
    despacho: (row.despacho as DespachoPedido) ?? null,
    despachado_at: (row.despachado_at as string) ?? null,
    codigo_despacho: (row.codigo_despacho as string) ?? null
  };
}

const ALFABETO_CODIGO_PEDIDO = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

function crearCodigoPublicoPedido() {
  let codigo = '';
  while (codigo.length < 6) {
    for (const byte of randomBytes(8)) {
      if (byte >= 252) continue;
      codigo += ALFABETO_CODIGO_PEDIDO[byte % ALFABETO_CODIGO_PEDIDO.length];
      if (codigo.length === 6) break;
    }
  }
  return codigo;
}

function codigoPedidoValido(codigo: string) {
  return /^[A-Z0-9]{6}$/.test(codigo) || /^CYC-(?:[A-Z0-9]{4}-){3}[A-Z0-9]{4}$/.test(codigo);
}

const RESTAURAR_STOCK_RESERVADO = `
    unidades AS (
      SELECT producto_id, variante_id, SUM(qty)::integer AS qty
      FROM pedido_items JOIN pedidos_liberados ON pedido_items.pedido_id = pedidos_liberados.id
      GROUP BY producto_id, variante_id
    ), productos_vencidos AS (
      SELECT producto_id, SUM(qty)::integer AS qty FROM unidades GROUP BY producto_id
    ), stock_liberado AS (
      UPDATE productos p SET
        stock = COALESCE(p.stock, 0) + productos_vencidos.qty,
        variantes = COALESCE((
          SELECT jsonb_agg(v.datos || jsonb_build_object('stock', (v.datos->>'stock')::integer + COALESCE(u.qty, 0))
            ORDER BY v.orden)
          FROM jsonb_array_elements(p.variantes) WITH ORDINALITY AS v(datos, orden)
          LEFT JOIN unidades u ON u.producto_id = p.id AND u.variante_id::text = v.datos->>'id'
        ), '[]'::jsonb)
      FROM productos_vencidos WHERE p.id = productos_vencidos.producto_id RETURNING p.id
    )
`;

async function expirarPedidosViejos(db: Pick<Pool, 'query'>): Promise<void> {
  await db.query(`WITH pedidos_liberados AS (
      UPDATE pedidos SET estado = 'expirado'
      WHERE estado = 'pendiente' AND eliminado_at IS NULL AND created_at <= NOW() -
        (CASE WHEN pago_referencia IS NULL OR metodo_pago = 'transferencia' THEN $1::integer ELSE $2::integer END * INTERVAL '1 minute')
      RETURNING id
    ), ${RESTAURAR_STOCK_RESERVADO} SELECT id FROM stock_liberado`, [TRANSFERENCIA_RESERVA_HORAS * 60, COMPRA_EXPIRACION_MINUTOS]);
}

export async function getDatosTransferencia(): Promise<DatosTransferencia | null> {
  await ensurePedidosSchema();
  const { rows } = await getPool().query('SELECT datos FROM config_transferencia WHERE id = 1');
  return rows[0]?.datos ?? null;
}

export async function saveDatosTransferencia(datos: DatosTransferencia) {
  await ensurePedidosSchema();
  await getPool().query('INSERT INTO config_transferencia (id, datos) VALUES (1, $1) ON CONFLICT (id) DO UPDATE SET datos = EXCLUDED.datos', [datos]);
}

async function leerItems(db: Pick<Pool, 'query'>, id: number): Promise<PedidoItem[]> {
  const result = await db.query(
    'SELECT producto_id, nombre, qty, precio, variante_id FROM pedido_items WHERE pedido_id = $1 ORDER BY id',
    [id]
  );
  return result.rows;
}

export async function crearPedido(items: ItemCompra[], clienteNombre: string, clienteWhatsapp: string, clienteEmail: string, compra: Compra): Promise<Pedido> {
  await ensureSchema();
  await ensurePedidosSchema();
  const pool = getPool();
  await expirarPedidosViejos(pool);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(440812, hashtext($1))', [compra.referencia]);
    const existente = await client.query('SELECT * FROM pedidos WHERE pago_referencia = $1', [compra.referencia]);
    const sinEnvio = compra.despacho === null;
    const costoEnvio = sinEnvio ? 0 : ENVIO_CHILE.precio;
    if (existente.rows.length) {
      const row = existente.rows[0];
      if (row.eliminado_at) throw new Error('El pedido fue eliminado. Recarga la página para iniciar una compra nueva.');
      const detalle = await leerItems(client, row.id);
      if (row.total !== compra.totalEsperado || row.metodo_pago !== compra.metodo || detalle.length !== items.length ||
          !items.every((item) => detalle.some((linea) => linea.producto_id === item.id && linea.qty === item.qty && (linea.variante_id ?? undefined) === item.varianteId)) ||
          row.cliente_nombre !== clienteNombre || row.cliente_whatsapp !== clienteWhatsapp || row.cliente_email !== clienteEmail || row.cliente_rut !== compra.rut ||
          row.sin_envio !== sinEnvio || row.despacho?.region !== compra.despacho?.region || row.despacho?.comuna !== compra.despacho?.comuna ||
          row.despacho?.direccion !== compra.despacho?.direccion || (row.despacho?.nota ?? '') !== (compra.despacho?.nota ?? '')) {
        throw new Error('La sesión de pago corresponde a otro carrito o despacho.');
      }
      await client.query('COMMIT');
      return formatPedido(row, detalle);
    }

    let total = 0;
    const itemsDetalle: PedidoItem[] = [];

    for (const item of [...items].sort((a, b) => a.id - b.id)) {
      const res = await client.query('SELECT id, name, price, precio_oferta, stock, variantes FROM productos WHERE id = $1 AND visible IS TRUE FOR UPDATE', [item.id]);
      const p = res.rows[0];
      if (!p) throw new Error(`Producto ${item.id} no encontrado`);
      const precio = precioActual({ price: p.price, precioOferta: p.precio_oferta });
      if (!Number.isInteger(precio) || precio <= 0) throw new Error('Total de compra inválido');
      const variantes: Variante[] = p.variantes;
      const variante = variantes.find((v) => v.id === item.varianteId);
      if ((variantes.length > 0 || item.varianteId) && !variante) {
        throw new Error(`Selecciona una variante disponible para "${p.name}".`);
      }
      const stock = variante?.stock ?? p.stock;
      const nombre = nombreConVariante(p.name, variante);
      if (stock < item.qty) throw new Error(`Stock insuficiente para "${nombre}" (disponible: ${stock})`);
      total += precio * item.qty;
      itemsDetalle.push({ producto_id: p.id, nombre, qty: item.qty, precio, variante_id: variante?.id ?? null });
      const actualizadas = variantes.map((v) => v.id === variante?.id ? { ...v, stock: v.stock - item.qty } : v);
      await client.query('UPDATE productos SET stock = stock - $1, variantes = $3::jsonb WHERE id = $2',
        [item.qty, p.id, JSON.stringify(actualizadas)]);
    }

    if (total <= 0 || total > 2147483647 - costoEnvio) throw new Error('Total de compra inválido');
    total += costoEnvio;
    if (total !== compra.totalEsperado) throw new Error('El precio de los productos cambió. Actualiza el carrito.');

    let pedidoRow: Record<string, unknown> | undefined;
    for (let intento = 0; intento < 5 && !pedidoRow; intento++) {
      const pedidoRes = await client.query(
        `INSERT INTO pedidos (codigo_publico, cliente_nombre, cliente_whatsapp, cliente_email, total, estado, pago_referencia, pago_estado, despacho,
          cliente_rut, metodo_pago, costo_envio, datos_transferencia, aceptacion_legal, sin_envio)
         VALUES ($1, $2, $3, $4, $5, 'pendiente', $6, 'pendiente', $7, $8, $9, $10, $11, $12, $13)
         ON CONFLICT (codigo_publico) DO NOTHING RETURNING *`,
        [crearCodigoPublicoPedido(), clienteNombre, clienteWhatsapp, clienteEmail, total, compra.referencia, compra.despacho,
          compra.rut, compra.metodo, costoEnvio, compra.transferencia, compra.aceptacionLegal, sinEnvio]
      );
      pedidoRow = pedidoRes.rows[0];
    }
    if (!pedidoRow) throw new Error('No se pudo generar un código único para el pedido.');
    const pedidoId = pedidoRow.id as number;

    for (const item of itemsDetalle) {
      await client.query(
        `INSERT INTO pedido_items (pedido_id, producto_id, nombre, qty, precio, variante_id) VALUES ($1, $2, $3, $4, $5, $6)`,
        [pedidoId, item.producto_id, item.nombre, item.qty, item.precio, item.variante_id]
      );
    }

    await client.query('COMMIT');
    return formatPedido(pedidoRow, itemsDetalle);
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

export async function getPedidosAdmin(estado: EstadoPedido | 'revision' | 'sin_revisar' | 'papelera' | 'todos', pagina: number): Promise<{ pedidos: Pedido[]; total: number }> {
  await ensureSchema();
  await ensurePedidosSchema();
  const pool = getPool();
  await expirarPedidosViejos(pool);
  await pool.query("DELETE FROM pedidos WHERE eliminado_at < NOW() - INTERVAL '30 days'");
  const filtro = `(CASE WHEN $1 = 'papelera' THEN p.eliminado_at IS NOT NULL ELSE
    p.eliminado_at IS NULL AND (($1 = 'todos') OR ($1 = 'revision' AND p.pago_estado = 'revision') OR
      ($1 = 'sin_revisar' AND p.revisado_at IS NULL) OR p.estado = $1) END)`;
  const [rows, cantidad] = await Promise.all([
    pool.query(`
      SELECT p.*, COALESCE(detalle.items, '[]'::json) AS items
      FROM (SELECT p.* FROM pedidos p WHERE ${filtro} ORDER BY p.created_at DESC, p.id DESC LIMIT 24 OFFSET $2) p
      LEFT JOIN LATERAL (
        SELECT json_agg(json_build_object('producto_id', producto_id, 'nombre', nombre, 'qty', qty, 'precio', precio, 'variante_id', variante_id) ORDER BY id) AS items
        FROM pedido_items WHERE pedido_id = p.id
      ) detalle ON true
      ORDER BY p.created_at DESC, p.id DESC
    `, [estado, (pagina - 1) * 24]),
    pool.query(`SELECT count(*)::integer AS total FROM pedidos p WHERE ${filtro}`, [estado])
  ]);
  return { pedidos: rows.rows.map((row) => formatPedido(row, row.items)), total: cantidad.rows[0].total };
}

export type NotificacionPedidoAdmin = {
  codigo_publico: string;
  cliente_nombre: string;
  total: number;
  created_at: string;
  metodo_pago: MetodoPago | null;
};

export async function getNotificacionesPedidosAdmin(desde: Date) {
  await ensureSchema();
  await ensurePedidosSchema();
  const pool = getPool();
  await expirarPedidosViejos(pool);
  const corte = new Date((await pool.query<{ corte: string }>('SELECT clock_timestamp() AS corte')).rows[0].corte);
  const [cantidades, ultimos, nuevos] = await Promise.all([
    pool.query(`SELECT
      count(*) FILTER (WHERE estado = 'pendiente')::integer AS pendientes,
      count(*) FILTER (WHERE pago_estado = 'revision')::integer AS revision,
      count(*) FILTER (WHERE revisado_at IS NULL)::integer AS sin_revisar
      FROM pedidos WHERE eliminado_at IS NULL`),
    pool.query<NotificacionPedidoAdmin>(`SELECT codigo_publico, cliente_nombre, total, created_at, metodo_pago
      FROM pedidos WHERE eliminado_at IS NULL AND created_at <= $1 ORDER BY created_at DESC, id DESC LIMIT 6`, [corte]),
    pool.query<NotificacionPedidoAdmin>(`SELECT codigo_publico, cliente_nombre, total, created_at, metodo_pago
      FROM pedidos WHERE eliminado_at IS NULL AND created_at > $1 AND created_at <= $2 ORDER BY created_at ASC, id ASC LIMIT 100`, [desde, corte])
  ]);
  return {
    pendientes: cantidades.rows[0].pendientes as number,
    revision: cantidades.rows[0].revision as number,
    sinRevisar: cantidades.rows[0].sin_revisar as number,
    ultimos: ultimos.rows,
    nuevos: nuevos.rows,
    cursor: corte.toISOString()
  };
}

export async function confirmarPedido(id: number): Promise<Pedido | null> {
  await ensureSchema();
  await ensurePedidosSchema();
  const pool = getPool();
  await expirarPedidosViejos(pool);
  const res = await pool.query(
    `UPDATE pedidos SET estado = 'confirmado', confirmado_at = NOW(), revisado_at = COALESCE(revisado_at, NOW()),
        pago_estado = CASE WHEN metodo_pago = 'transferencia' THEN 'aprobado' ELSE pago_estado END
      WHERE id = $1 AND estado = 'pendiente' AND eliminado_at IS NULL
        AND (pago_referencia IS NULL OR metodo_pago = 'transferencia') RETURNING *`,
    [id]
  );
  if (!res.rows.length) return null;
  return formatPedido(res.rows[0], await leerItems(pool, id));
}

export async function cancelarPedido(id: number): Promise<Pedido | null> {
  await ensureSchema();
  await ensurePedidosSchema();
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: [pedido] } = await client.query(
      `SELECT * FROM pedidos WHERE id = $1 AND estado = 'pendiente' AND eliminado_at IS NULL
        AND (pago_referencia IS NULL OR metodo_pago = 'transferencia') FOR UPDATE`,
      [id]
    );
    if (!pedido) {
      await client.query('ROLLBACK');
      return null;
    }
    await client.query(
      `WITH pedidos_liberados AS (UPDATE pedidos SET estado = 'cancelado', revisado_at = COALESCE(revisado_at, NOW()) WHERE id = $1 RETURNING id),
        ${RESTAURAR_STOCK_RESERVADO} SELECT id FROM stock_liberado`,
      [id]
    );
    const items = await leerItems(client, id);
    await client.query('COMMIT');
    return formatPedido({ ...pedido, estado: 'cancelado' }, items);
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
    subcategoria: (row.subcategoria as string) || '',
    image_url: limpiarImageUrl(row.image_url as string) || images[0] || '',
    instagram_url: (row.instagram_url as string) || '',
    remate: row.remate === true,
    visible: row.visible !== false,
    price: (row.price as number) || 0,
    precioOferta: (row.precio_oferta as number | null) ?? null,
    variantes: (row.variantes as Variante[]) ?? [],
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
    `SELECT id, name, description, category, subcategoria, image_url, instagram_url, price, stock, visible, remate, precio_oferta, variantes, created_at, images[1:1] AS images
     FROM productos WHERE visible = TRUE AND fusionado_en IS NULL ORDER BY created_at DESC`
  );
  return result.rows.map(formatProducto);
}

/** Lista completa para el panel admin (incluye ocultos y todas las imágenes) */
export async function getProductosAdmin(): Promise<Producto[]> {
  await ensureSchema();
  const pool = getPool();
  const result = await pool.query(`SELECT * FROM productos WHERE fusionado_en IS NULL ORDER BY created_at DESC`);
  return result.rows.map(formatProducto);
}

export async function getProductoById(id: number): Promise<Producto | null> {
  await ensureSchema();
  const pool = getPool();
  const result = await pool.query(
    `SELECT id, name, description, category, subcategoria, image_url, instagram_url, price, stock, visible, remate, precio_oferta, variantes, created_at, images[1:10] AS images
     FROM productos WHERE id = COALESCE((SELECT fusionado_en FROM productos WHERE id = $1), $1)`,
    [id]
  );
  return result.rows.length ? formatProducto(result.rows[0]) : null;
}

export class ConflictoInventario extends Error {}

export async function createProducto(data: ProductoInput): Promise<Producto> {
  await ensureSchema();
  const images = data.images?.length ? data.images : data.image_url ? [data.image_url] : [];
  const variantes = data.variantes ?? [];
  const stock = variantes.length ? variantes.reduce((total, v) => total + v.stock, 0) : data.stock ?? 0;
  const result = await getPool().query(
    `INSERT INTO productos (name, description, category, subcategoria, image_url, instagram_url, visible, price, stock, images, precio_oferta, variantes, remate)
     VALUES ($1, $2, $3, $4, $5, $6, TRUE, $7, $8, $9, $10, $11::jsonb, $12) RETURNING *`,
    [data.name, data.description || '', data.category, data.subcategoria || '', data.image_url || images[0] || '', data.instagram_url || '',
      data.price ?? 0, stock, images, data.precioOferta ?? null, JSON.stringify(variantes),
      categoriaDefinida(data.category)?.linea === 'remate']
  );
  return formatProducto(result.rows[0]);
}

export async function updateProducto(id: number, data: ProductoInput): Promise<Producto | null> {
  await ensureSchema();
  await ensurePedidosSchema();
  const pool = getPool();
  if (data.variantes) await expirarPedidosViejos(pool);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: [anterior] } = await client.query('SELECT * FROM productos WHERE id = $1 FOR UPDATE', [id]);
    if (!anterior) {
      await client.query('ROLLBACK');
      return null;
    }
    if (data.version && anterior.updated_at?.toISOString() !== data.version) {
      throw new ConflictoInventario('El producto cambió desde que lo abriste. Recarga el panel antes de editar.');
    }
    const variantes: Variante[] = data.variantes ?? anterior.variantes;
    const cambiaTipoStock = Boolean(variantes.length) !== Boolean(anterior.variantes.length);
    if (cambiaTipoStock || anterior.variantes.some((v: Variante) => !variantes.some((n) => n.id === v.id))) {
      const pendientes = await client.query(
        `SELECT DISTINCT i.variante_id FROM pedido_items i JOIN pedidos p ON p.id = i.pedido_id
         WHERE i.producto_id = $1 AND p.estado = 'pendiente'`, [id]
      );
      if (pendientes.rows.some((item) => cambiaTipoStock || !variantes.some((v) => v.id === item.variante_id))) {
        throw new ConflictoInventario('Hay variantes o unidades en pedidos pendientes. Espera a que se procesen antes de quitarlas.');
      }
    }

    const images = data.images?.length ? data.images : data.image_url ? [data.image_url] : [];
    const categoria = categoriaDefinida(data.category);
    const stock = variantes.length ? variantes.reduce((total, v) => total + v.stock, 0) : data.stock ?? anterior.stock;
    const result = await client.query(
      `UPDATE productos SET name = $1, description = $2, category = $3, subcategoria = $4, image_url = $5, instagram_url = $6,
       price = $8, stock = $9, images = $10, precio_oferta = $11, variantes = $12::jsonb, remate = $13 WHERE id = $7 RETURNING *`,
      [data.name, data.description || '', data.category, data.subcategoria ?? anterior.subcategoria ?? '',
        data.image_url || images[0] || '', data.instagram_url || '', id, data.price ?? anterior.price, stock, images,
        data.precioOferta === undefined ? anterior.precio_oferta : data.precioOferta, JSON.stringify(variantes),
        data.category !== anterior.category && categoria ? categoria.linea === 'remate' : anterior.remate]
    );
    await client.query('COMMIT');
    return formatProducto(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function deleteProducto(id: number): Promise<boolean> {
  await ensureSchema();
  const pool = getPool();
  const result = await pool.query(`DELETE FROM productos WHERE id = $1`, [id]);
  return (result.rowCount ?? 0) > 0;
}

export async function setRemate(id: number, remate: boolean): Promise<Producto | null> {
  await ensureSchema();
  const result = await getPool().query(
    'UPDATE productos SET remate = $2 WHERE id = $1 RETURNING *',
    [id, remate]
  );
  return result.rows.length ? formatProducto(result.rows[0]) : null;
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
    `UPDATE productos SET stock = GREATEST(0, stock + $1) WHERE id = $2 AND jsonb_array_length(variantes) = 0 RETURNING *`,
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
  const { rows } = await getPool().query("SELECT key, value FROM config WHERE key IN ('category_order', 'featured', 'featured_by_line', 'diseno')");
  const config = Object.fromEntries(rows.map(({ key, value }) => [key, value]));
  const featured = config.featured;
  return {
    categoryOrder: config.category_order ?? [],
    diseno: config.diseno ?? {},
    featured: {
      productIds: Array.isArray(featured?.productIds) ? [...new Set<number>(featured.productIds)].slice(0, MAX_DESTACADOS) : [],
      title: typeof featured?.title === 'string' && featured.title.trim() ? featured.title : TITULO_DESTACADOS
    },
    featuredByLine: config.featured_by_line ?? {}
  };
}

export async function saveDisenoSeccion(linea: Linea, diseno: DisenoSeccion) {
  await ensureSchema();
  await getPool().query(
    `INSERT INTO config (key, value) VALUES ('diseno', jsonb_build_object($1::text, $2::jsonb))
     ON CONFLICT (key) DO UPDATE SET value = config.value || EXCLUDED.value`,
    [linea, JSON.stringify(diseno)]
  );
}

export async function saveConfig(cambios: { categoryOrder?: string[]; destacados?: { linea: Linea; config: FeaturedConfig } }): Promise<void> {
  await ensureSchema();
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    if (cambios.categoryOrder) {
      await client.query(
        `INSERT INTO config (key, value) VALUES ('category_order', $1::jsonb)
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
        [JSON.stringify(cambios.categoryOrder)]
      );
    }
    if (cambios.destacados) {
      await client.query(
        `INSERT INTO config (key, value) VALUES ('featured_by_line', jsonb_build_object($1::text, $2::jsonb))
         ON CONFLICT (key) DO UPDATE SET value = config.value || EXCLUDED.value`,
        [cambios.destacados.linea, JSON.stringify(cambios.destacados.config)]
      );
    }
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

/** Devuelve hasta 4 productos visibles correspondientes a los IDs destacados, en orden */
export async function getFeaturedProducts(productIds: number[]): Promise<Producto[]> {
  const ids = productIds.filter((id) => Number.isFinite(id));
  if (!ids.length) return [];
  await ensureSchema();
  const pool = getPool();
  const result = await pool.query(
    `SELECT id, name, description, category, subcategoria, image_url, instagram_url, price, stock, visible, remate, precio_oferta, variantes, created_at, images[1:1] AS images
     FROM productos WHERE id = ANY($1) AND visible = TRUE AND fusionado_en IS NULL`,
    [ids]
  );
  const byId = new Map(result.rows.map((r) => [r.id, formatProducto(r)]));
  return ids.map((id) => byId.get(id)).filter((p): p is Producto => !!p);
}

export async function despacharPedido(id: number, codigo: string): Promise<Pedido | null> {
  await ensureSchema();
  await ensurePedidosSchema();
  const result = await getPool().query(
    `UPDATE pedidos SET despachado_at = NOW(), codigo_despacho = NULLIF($2, ''), revisado_at = COALESCE(revisado_at, NOW())
     WHERE id = $1 AND estado = 'confirmado' AND despachado_at IS NULL AND eliminado_at IS NULL AND NOT sin_envio
       AND (pago_estado = 'aprobado' OR pago_referencia IS NULL) RETURNING *`,
    [id, codigo]
  );
  if (!result.rows[0]) return null;
  return formatPedido(result.rows[0], await leerItems(getPool(), id));
}

export async function eliminarPedido(id: number): Promise<{ productosLiberados: number[] } | null> {
  await ensureSchema();
  await ensurePedidosSchema();
  const { rows } = await getPool().query(`WITH candidato AS (
      SELECT id, estado FROM pedidos WHERE id = $1 AND eliminado_at IS NULL FOR UPDATE
    ), eliminado AS (
      UPDATE pedidos p SET eliminado_at = NOW(), estado_antes_eliminar = candidato.estado,
        estado = CASE WHEN candidato.estado = 'pendiente' THEN 'cancelado' ELSE candidato.estado END
      FROM candidato WHERE p.id = candidato.id RETURNING p.id, candidato.estado AS estado_anterior
    ), pedidos_liberados AS (
      SELECT id FROM eliminado WHERE estado_anterior = 'pendiente'
    ), ${RESTAURAR_STOCK_RESERVADO}
    SELECT ARRAY(SELECT id FROM stock_liberado) AS "productosLiberados" FROM eliminado`, [id]);
  return rows[0] ?? null;
}

export async function marcarPedidoRevisado(id: number): Promise<Pedido | null> {
  await ensureSchema();
  await ensurePedidosSchema();
  const result = await getPool().query(
    `UPDATE pedidos SET revisado_at = COALESCE(revisado_at, NOW())
     WHERE id = $1 AND eliminado_at IS NULL RETURNING *`,
    [id]
  );
  if (!result.rows[0]) return null;
  return formatPedido(result.rows[0], await leerItems(getPool(), id));
}

export async function restaurarPedido(id: number): Promise<Pedido | null> {
  await ensureSchema();
  await ensurePedidosSchema();
  const result = await getPool().query(
    `UPDATE pedidos SET eliminado_at = NULL,
       estado = CASE
         WHEN estado_antes_eliminar IN ('confirmado', 'cancelado', 'expirado') THEN estado_antes_eliminar
         ELSE 'cancelado'
       END,
       estado_antes_eliminar = NULL,
       revisado_at = COALESCE(revisado_at, NOW())
     WHERE id = $1 AND eliminado_at IS NOT NULL
       AND eliminado_at >= NOW() - INTERVAL '30 days'
     RETURNING *`,
    [id]
  );
  if (!result.rows[0]) return null;
  return formatPedido(result.rows[0], await leerItems(getPool(), id));
}

export function resumenPublicoPedido(pedido: Pedido) {
  return {
    codigo: pedido.codigo_publico,
    total: pedido.total,
    costo_envio: pedido.costo_envio,
    sin_envio: pedido.sin_envio,
    estado: pedido.estado,
    pago_estado: pedido.pago_estado,
    pago_url: pedido.metodo_pago === 'tarjeta' && pedido.estado === 'pendiente' && pedido.pago_url &&
      /^https:\/\/([a-z0-9-]+\.)*mercadopago\.(cl|com)(\/|$)/i.test(pedido.pago_url) ? pedido.pago_url : null,
    metodo_pago: pedido.metodo_pago,
    datos_transferencia: pedido.metodo_pago === 'transferencia' && pedido.estado === 'pendiente' ? pedido.datos_transferencia : null,
    created_at: pedido.created_at,
    items: pedido.items,
    destino_envio: pedido.pago_referencia && pedido.despacho ? { comuna: pedido.despacho.comuna, region: pedido.despacho.region } : null,
    despachado_at: pedido.pago_estado !== 'revision' ? pedido.despachado_at : null,
    codigo_despacho: pedido.pago_estado === 'aprobado' ? pedido.codigo_despacho : null,
    expiracionAt: new Date(pedido.created_at).getTime() +
      (pedido.metodo_pago === 'tarjeta' ? COMPRA_EXPIRACION_MINUTOS : TRANSFERENCIA_RESERVA_HORAS * 60) * 60000
  };
}

export type PedidoPublico = ReturnType<typeof resumenPublicoPedido>;

export async function getPedidoPublico(codigo: string, referencia?: string, accesoAutorizado = false): Promise<PedidoPublico | null> {
  await ensureSchema();
  await ensurePedidosSchema();
  const pool = getPool();
  await expirarPedidosViejos(pool);
  const codigoValido = codigoPedidoValido(codigo);
  const idAnterior = /^\d{1,10}$/.test(codigo) && referencia ? Number(codigo) : null;
  if (!codigoValido && (idAnterior === null || !Number.isSafeInteger(idAnterior) || idAnterior < 1 || idAnterior > 2147483647)) return null;
  const res = codigoValido
    ? await pool.query(
      'SELECT * FROM pedidos WHERE codigo_publico = $1 AND eliminado_at IS NULL AND ($2::boolean OR pago_referencia IS NULL OR pago_referencia::text = $3)',
      [codigo, accesoAutorizado, referencia ?? '']
    )
    : await pool.query(
      'SELECT * FROM pedidos WHERE id = $1 AND eliminado_at IS NULL AND pago_referencia::text = $2',
      [idAnterior, referencia]
    );
  if (!res.rows.length) return null;
  return resumenPublicoPedido(formatPedido(res.rows[0], await leerItems(pool, res.rows[0].id)));
}

export async function autorizarSeguimientoPedido(codigo: string, email: string): Promise<boolean> {
  if (!codigoPedidoValido(codigo) || !/^\S+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 200) return false;
  await ensurePedidosSchema();
  const { rowCount } = await getPool().query(
    `SELECT 1 FROM pedidos WHERE codigo_publico = $1 AND eliminado_at IS NULL
      AND lower(cliente_email) = lower($2) LIMIT 1`,
    [codigo, email]
  );
  return rowCount === 1;
}

export async function obtenerEnlaceDePago(pedido: Pedido, referencia: string, crearEnlace: () => Promise<string>): Promise<string | null> {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `SELECT pago_url FROM pedidos WHERE id = $1 AND pago_referencia = $2 AND estado = 'pendiente' AND eliminado_at IS NULL
       AND pago_estado = 'pendiente' AND metodo_pago IS DISTINCT FROM 'transferencia' FOR UPDATE`,
      [pedido.id, referencia]
    );
    let url: string | null = rows[0]?.pago_url ?? null;
    if (rows.length && !url) {
      url = await crearEnlace();
      await client.query('UPDATE pedidos SET pago_url = $2 WHERE id = $1', [pedido.id, url]);
    }
    await client.query('COMMIT');
    return url;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function registrarPagoMercadoPago(pago: { referencia: string; id: string; total: number; moneda: string; estado: string }, codigoEsperado?: string) {
  await ensureSchema();
  await ensurePedidosSchema();
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `SELECT *, created_at + ($2::integer * INTERVAL '1 minute') <= NOW() AS vencido FROM pedidos
       WHERE pago_referencia = $1 AND metodo_pago IS DISTINCT FROM 'transferencia'
         AND ($3::text IS NULL OR codigo_publico = $3) FOR UPDATE`,
      [pago.referencia, COMPRA_EXPIRACION_MINUTOS, codigoEsperado ?? null]
    );
    const pedido = rows[0];
    let confirmado: Pedido | null = null;
    if (pedido && pago.estado === 'approved') {
      if (pedido.pago_id === pago.id && pedido.pago_estado === 'aprobado') {
        // Mercado Pago puede reenviar la misma notificación.
      } else if (pedido.pago_id || pedido.estado !== 'pendiente' || pedido.vencido ||
                 pedido.pago_estado === 'revision' || pago.moneda !== 'CLP' || pedido.total !== pago.total) {
        await client.query(
          `UPDATE pedidos SET pago_estado = 'revision', pago_revision = $2, eliminado_at = NULL
           WHERE id = $1 AND (pago_estado IS DISTINCT FROM 'revision' OR pago_revision IS DISTINCT FROM $2)`,
          [pedido.id, `Pago ${pago.id}: duplicado, recibido fuera del plazo o con monto/moneda diferente. Verificar antes de despachar.`]
        );
      } else {
        const result = await client.query(
          "UPDATE pedidos SET estado = 'confirmado', confirmado_at = NOW(), pago_estado = 'aprobado', pago_id = $2 WHERE id = $1 RETURNING *",
          [pedido.id, pago.id]
        );
        confirmado = formatPedido(result.rows[0], await leerItems(client, pedido.id));
      }
    } else if (pedido?.pago_id === pago.id && ['refunded', 'charged_back', 'cancelled'].includes(pago.estado)) {
      await client.query(`UPDATE pedidos SET pago_estado = 'revision', pago_revision = $2, eliminado_at = NULL
        WHERE id = $1 AND (pago_estado IS DISTINCT FROM 'revision' OR pago_revision IS DISTINCT FROM $2)`,
        [pedido.id, `Pago ${pago.id}: Mercado Pago informó ${pago.estado}. Verificar antes de despachar.`]);
    }
    await client.query('COMMIT');
    return confirmado;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
