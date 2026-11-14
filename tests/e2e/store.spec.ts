import { test, expect } from '@playwright/test';

test('inicio, navegación, catálogo sin conexión y login se mantienen utilizables', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Detalles especiales');
  await expect(page.getByRole('main')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: `/tmp/cyc-home-${testInfo.project.name}.png`, fullPage: true });
  await page.getByRole('link', { name: 'Ver catálogo', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Todos los productos' })).toBeVisible();
  await expect(page.getByRole('status')).toContainText('Estamos actualizando el catálogo');
  await expect(page.getByRole('link', { name: 'Consultar catálogo por WhatsApp' })).toHaveAttribute('href', /^https:\/\/wa.me/);
  await page.goto('/admin');
  await expect(page.getByLabel('Contraseña', { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test('el carrito restaura datos válidos, limita el stock y devuelve el foco al cerrar', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('casaycosas_cart', JSON.stringify([
    { id: 1, name: 'Mate de prueba', price: 5000, image_url: '', qty: 20, stock: 2 },
    null
  ])));
  await page.goto('/catalogo');
  const abrir = page.getByRole('button', { name: 'Abrir carrito', exact: true }).filter({ visible: true });
  await abrir.click();
  const dialog = page.getByRole('dialog', { name: 'Carrito de compras' });
  await expect(dialog).toContainText('Mate de prueba');
  await expect(dialog.getByRole('button', { name: 'Aumentar Mate de prueba' })).toBeDisabled();
  await expect(dialog).toContainText('$10.000');
  await dialog.getByRole('button', { name: 'Reservar pedido' }).click();
  await expect(dialog.getByRole('alert')).toContainText('no están disponibles temporalmente');
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(abrir).toBeFocused();
});

test('localStorage corrupto y enlaces de pedido sin clave no filtran datos ni rompen la web', async ({ page, request }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript(() => localStorage.setItem('casaycosas_cart', '{invalid'));
  await page.goto('/');
  await page.getByRole('button', { name: 'Abrir carrito', exact: true }).filter({ visible: true }).click();
  await expect(page.getByRole('dialog')).toContainText('Tu carrito está vacío');
  const pedido = await request.get('/api/pedido/1');
  expect(pedido.status()).toBe(404);
  expect(await pedido.json()).toEqual({ error: 'Pedido no encontrado' });
  await page.goto('/producto/1abc');
  await expect(page.getByRole('heading', { name: '404' })).toBeVisible();
  await expect(page.locator('meta[name="robots"][content*="noindex"]').first()).toHaveAttribute('content', /noindex/);
  expect((await request.get('/api/productos/1abc')).status()).toBe(400);
  const invalid = await request.post('/api/pedido', { data: { items: [null] } });
  expect(invalid.status()).toBe(400);
  expect(errors).toEqual([]);
});
