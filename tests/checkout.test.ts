import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { PGlite } from '@electric-sql/pglite';
import { validarPedido } from '../src/lib/validacionPedido';
import { validarProducto } from '../src/lib/validacionProducto';
import { normalizarCarrito } from '../src/lib/cart';
import { crearPedido, getPedidoByIdPublic, getPedidosPendientes, cancelarPedido, confirmarPedido, parseIdOrBadRequest, ensureSchema } from '../src/lib/db';

const database = new PGlite();
const query = async (sql: string, params?: unknown[]) => {
  if (!params && sql.trim().split(';').filter(Boolean).length > 1) {
    const results = await database.exec(sql);
    return results[results.length - 1];
  }
  return database.query(sql, params);
};
process.env.DATABASE_URL = 'postgresql://local-test';
(globalThis as unknown as { pgPool: unknown }).pgPool = {
  query,
  connect: async () => ({ query, release() {} })
};
after(() => database.close());

test('rechaza cantidades fraccionarias, productos nulos y datos de contacto inválidos', () => {
  for (const items of [[null], [{ id: 1, qty: 0.5 }], [{ id: 1, qty: -1 }], [{ id: 0, qty: 1 }]]) {
    assert.ok('error' in validarPedido({ items }));
  }
  assert.ok('error' in validarPedido({ items: [{ id: 1, qty: 1 }], nombre: 42 }));
  assert.ok('error' in validarPedido({ items: [{ id: 1, qty: 1 }], email: 'incorrecto' }));
  assert.deepEqual(validarPedido({ items: [{ id: 1, qty: 2 }, { id: 1, qty: 1 }] }), {
    items: [{ id: 1, qty: 3 }], nombre: '', whatsapp: '', email: ''
  });
});

test('un carrito corrupto no rompe la página ni permite cantidades sin stock', () => {
  assert.deepEqual(normalizarCarrito({ items: [] }), []);
  assert.deepEqual(normalizarCarrito([null, { id: 1, name: 'Mate', price: 100, qty: 2, stock: 0 }]), []);
  assert.deepEqual(normalizarCarrito([{ id: 1, name: 'Mate', price: 100, qty: 8, stock: 3, image_url: 'javascript:alert(1)' }]), [
    { id: 1, name: 'Mate', price: 100, qty: 3, stock: 3, image_url: '' }
  ]);
});

test('IDs inválidos no se truncan ni llegan a Postgres', () => {
  for (const id of ['1abc', '1.5', '0', '-1', '2147483648', 'Infinity', '']) assert.equal(parseIdOrBadRequest(id), null);
  assert.equal(parseIdOrBadRequest('42'), 42);
});

test('reserva, privacidad, rollback, expiración y cancelación conservan el stock', async () => {
  await Promise.all([ensureSchema(), ensureSchema(), ensureSchema()]);
  await query(`INSERT INTO productos (name, category, price, stock, visible) VALUES ('Mate', 'Mates', 5000, 10, TRUE), ('Oculto', 'Mates', 5000, 10, FALSE)`);
  const stock = async () => (await database.query<{ stock: number }>('SELECT stock FROM productos WHERE id = 1')).rows[0].stock;
  const pedido = (await crearPedido([{ id: 1, qty: 2 }, { id: 1, qty: 1 }], 'Cliente', '', 'cliente@example.com'))!;
  assert.equal(pedido.total, 15000);
  assert.equal(pedido.items.length, 1);
  assert.equal(await stock(), 7);
  assert.match(pedido.tracking_token, /^[a-f0-9]{64}$/);
  assert.equal(await getPedidoByIdPublic(pedido.id), null);
  assert.equal(await getPedidoByIdPublic(pedido.id, '0'.repeat(64)), null);
  assert.equal((await getPedidoByIdPublic(pedido.id, pedido.tracking_token))?.id, pedido.id);
  await assert.rejects(crearPedido([{ id: 1, qty: 20 }], '', ''), /Stock insuficiente/);
  await assert.rejects(crearPedido([{ id: 1, qty: 1 }, { id: 2, qty: 1 }], '', ''), /no encontrado/);
  assert.equal(await stock(), 7);
  await query(`UPDATE pedidos SET created_at = NOW() - INTERVAL '49 hours' WHERE id = $1`, [pedido.id]);
  await getPedidosPendientes();
  assert.equal(await stock(), 10);
  await getPedidosPendientes();
  assert.equal(await stock(), 10);
  assert.equal(await confirmarPedido(pedido.id), null);
  const otro = (await crearPedido([{ id: 1, qty: 2 }], '', ''))!;
  assert.equal(await stock(), 8);
  assert.equal((await cancelarPedido(otro.id))?.estado, 'cancelado');
  assert.equal(await stock(), 10);
  assert.equal(await cancelarPedido(otro.id), null);
  assert.equal(await stock(), 10);
  const confirmado = (await crearPedido([{ id: 1, qty: 1 }], '', ''))!;
  await query('UPDATE pedidos SET tracking_token = NULL WHERE id = $1', [confirmado.id]);
  const resultado = (await confirmarPedido(confirmado.id))!;
  assert.equal(resultado.estado, 'confirmado');
  assert.match(resultado.tracking_token, /^[a-f0-9]{64}$/);
  assert.equal((await getPedidoByIdPublic(resultado.id, resultado.tracking_token))?.id, resultado.id);
  assert.equal(await cancelarPedido(confirmado.id), null);
  assert.equal(await stock(), 9);
});

test('la administración no acepta precios negativos, cantidades fraccionarias ni campos de tipo incorrecto', () => {
  assert.deepEqual(validarProducto({ name: 'Mate', category: 'Mates', price: 5000, stock: 2 }), []);
  for (const body of [null, { name: 42 }, { name: 'Mate', category: 'Mates', price: -1 }, { name: 'Mate', category: 'Mates', stock: 1.5 }]) assert.ok(validarProducto(body).length);
});
