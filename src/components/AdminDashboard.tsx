'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import ProductForm from './ProductForm';
import CategoryOrderEditor from './CategoryOrderEditor';
import FeaturedEditor from './FeaturedEditor';
import type { Producto, FeaturedConfig } from '@/lib/types';
import { adminFetch } from '@/lib/adminFetch';
import { parsearEncuadre, estilosEncuadre } from '@/lib/encuadre';
import type { Pedido } from '@/lib/db';

const formatoCLP = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
const FEATURED_DEFAULT: FeaturedConfig = { productIds: [], title: 'Productos más vendidos' };
const PAGE_SIZE = 24;

type Vista = 'productos' | 'categorias' | 'destacados' | 'pedidos';
type FiltroEstado = 'todos' | 'en-stock' | 'agotado' | 'ocultos';
type Orden = 'recientes' | 'nombre' | 'precio-asc' | 'precio-desc' | 'stock-desc';

export default function AdminDashboard({ onLogout }: { onLogout: () => void }) {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [categoryOrder, setCategoryOrder] = useState<string[]>([]);
  const [featured, setFeatured] = useState<FeaturedConfig>(FEATURED_DEFAULT);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState('todas');
  const [estadoFiltro, setEstadoFiltro] = useState<FiltroEstado>('todos');
  const [orden, setOrden] = useState<Orden>('recientes');
  const [cargando, setCargando] = useState(true);
  const [editando, setEditando] = useState<Producto | null>(null);
  const [creandoNuevo, setCreandoNuevo] = useState(false);
  const [vista, setVista] = useState<Vista>('productos');
  const [pagina, setPagina] = useState(1);
  const [menuMobile, setMenuMobile] = useState(false);

  async function cargarTodo() {
    setCargando(true);
    try {
      const [resProductos, resConfig] = await Promise.all([fetch('/api/productos'), fetch('/api/config')]);
      if (!resProductos.ok || !resConfig.ok) throw new Error('Error al cargar datos');
      setProductos(await resProductos.json());
      const config = await resConfig.json();
      setCategoryOrder(config.categoryOrder || []);
      setFeatured(config.featured || FEATURED_DEFAULT);
    } catch {
      // sin datos disponibles
    } finally {
      setCargando(false);
    }
  }

  async function cargarPedidos() {
    try {
      const res = await adminFetch('/api/pedidos', { method: 'GET' });
      if (res.ok) setPedidos(await res.json());
    } catch {
      // sin pedidos disponibles
    }
  }

  useEffect(() => {
    cargarTodo();
  }, []);

  useEffect(() => {
    if (vista === 'pedidos') cargarPedidos();
  }, [vista]);

  const categorias = useMemo(() => [...new Set(productos.map((p) => p.category))].sort(), [productos]);

  const kpis = useMemo(() => {
    const enStock = productos.filter((p) => p.stock > 0).length;
    const agotados = productos.filter((p) => p.stock <= 0).length;
    const valorInventario = productos.reduce((sum, p) => sum + p.price * p.stock, 0);
    return { total: productos.length, enStock, agotados, categorias: categorias.length, valorInventario };
  }, [productos, categorias]);

  const filtrados = useMemo(() => {
    const term = busqueda.trim().toLowerCase();
    let result = productos.filter((p) => {
      const porCategoria = categoriaFiltro === 'todas' || p.category === categoriaFiltro;
      const porTexto = !term || p.name.toLowerCase().includes(term);
      const porEstado =
        estadoFiltro === 'todos' ||
        (estadoFiltro === 'en-stock' && p.stock > 0) ||
        (estadoFiltro === 'agotado' && p.stock <= 0) ||
        (estadoFiltro === 'ocultos' && !p.visible);
      return porCategoria && porTexto && porEstado;
    });

    result = [...result].sort((a, b) => {
      switch (orden) {
        case 'nombre': return a.name.localeCompare(b.name);
        case 'precio-asc': return a.price - b.price;
        case 'precio-desc': return b.price - a.price;
        case 'stock-desc': return b.stock - a.stock;
        default: return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });
    return result;
  }, [productos, busqueda, categoriaFiltro, estadoFiltro, orden]);

  const totalPaginas = Math.ceil(filtrados.length / PAGE_SIZE);
  const paginaActual = Math.min(pagina, totalPaginas || 1);
  const productosPagina = filtrados.slice((paginaActual - 1) * PAGE_SIZE, paginaActual * PAGE_SIZE);

  useEffect(() => { setPagina(1); }, [busqueda, categoriaFiltro, estadoFiltro, orden]);

  async function ajustarStock(id: number, delta: number) {
    const res = await adminFetch(`/api/productos/${id}/stock`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ delta })
    });
    if (res.ok) {
      const actualizado = await res.json();
      setProductos((prev) => prev.map((p) => (p.id === id ? actualizado : p)));
    }
  }

  async function toggleVisibilidad(id: number, visible: boolean) {
    const res = await adminFetch(`/api/productos/${id}/visibility`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visible: !visible })
    });
    if (res.ok) {
      const actualizado = await res.json();
      setProductos((prev) => prev.map((p) => (p.id === id ? actualizado : p)));
    }
  }

  async function eliminarProducto(id: number) {
    if (!confirm('¿Eliminar este producto? Esta acción no se puede deshacer.')) return;
    const res = await adminFetch(`/api/productos/${id}`, { method: 'DELETE' });
    if (res.ok) setProductos((prev) => prev.filter((p) => p.id !== id));
  }

  async function confirmarPedido(id: number) {
    const res = await adminFetch(`/api/pedidos/${id}/confirmar`, { method: 'PATCH' });
    if (res.ok) setPedidos((prev) => prev.filter((p) => p.id !== id));
  }

  async function cancelarPedido(id: number) {
    if (!confirm('¿Cancelar este pedido? El stock será restaurado.')) return;
    const res = await adminFetch(`/api/pedidos/${id}/cancelar`, { method: 'PATCH' });
    if (res.ok) {
      setPedidos((prev) => prev.filter((p) => p.id !== id));
      cargarTodo();
    }
  }

  async function handleLogout() {
    await adminFetch('/api/auth/logout', { method: 'POST' });
    onLogout();
  }

  const navItems: { id: Vista; label: string; icon: string }[] = [
    { id: 'productos', label: 'Productos', icon: 'M4 6h16M4 12h16M4 18h16' },
    { id: 'pedidos', label: 'Pedidos', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
    { id: 'categorias', label: 'Categorías', icon: 'M4 6h16M4 12h16M4 18h7' },
    { id: 'destacados', label: 'Destacados', icon: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z' },
  ];

  return (
    <div className="min-h-screen bg-crema flex">
      {/* Sidebar */}
      <aside className={`fixed lg:sticky top-0 left-0 h-screen w-60 bg-verde-noche flex flex-col z-40 transition-transform duration-300 ${menuMobile ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="px-5 py-5 border-b border-white/10">
          <Link href="/" className="flex items-center gap-2 group">
            <span className="text-lg">🌿</span>
            <div>
              <p className="font-display text-white text-sm leading-tight">Casa y Cosas</p>
              <p className="text-white/40 text-[10px]">Panguipulli · Admin</p>
            </div>
          </Link>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => { setVista(item.id); setMenuMobile(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                vista === item.id ? 'bg-white/15 text-white' : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
              </svg>
              {item.label}
              {item.id === 'pedidos' && pedidos.length > 0 && (
                <span className="ml-auto bg-verde text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{pedidos.length}</span>
              )}
            </button>
          ))}
        </nav>

        <div className="px-3 py-4 border-t border-white/10 space-y-1">
          <Link
            href="/catalogo"
            target="_blank"
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-white/60 hover:text-white hover:bg-white/5 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            Ver catálogo
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-white/60 hover:text-white hover:bg-white/5 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Cerrar sesión
          </button>
        </div>
      </aside>

      {menuMobile && (
        <div className="fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={() => setMenuMobile(false)} />
      )}

      {/* Contenido */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Topbar */}
        <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-sm border-b border-verde-noche/10 px-4 md:px-8 py-3 flex items-center gap-3">
          <button
            onClick={() => setMenuMobile(true)}
            className="lg:hidden p-1.5 rounded text-verde-noche hover:bg-crema"
            aria-label="Abrir menú"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <h1 className="font-display text-verde-noche text-base md:text-lg flex-1 capitalize">
            {vista === 'productos' && 'Productos'}
            {vista === 'pedidos' && 'Pedidos pendientes'}
            {vista === 'categorias' && 'Categorías'}
            {vista === 'destacados' && 'Destacados'}
          </h1>
          {vista === 'productos' && (
            <button
              onClick={() => setCreandoNuevo(true)}
              className="bg-verde text-white text-sm font-semibold px-3 md:px-4 py-2 rounded-lg hover:bg-verde-oscuro whitespace-nowrap flex items-center gap-1.5"
            >
              <span className="text-base leading-none">+</span>
              <span className="hidden sm:inline">Nuevo producto</span>
              <span className="sm:hidden">Nuevo</span>
            </button>
          )}
        </header>

        <main className="flex-1 p-4 md:p-8">
          {/* Productos */}
          {vista === 'productos' && (
            <>
              {/* KPIs */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
                <KpiCard label="Total productos" value={kpis.total} color="verde-noche" />
                <KpiCard label="En stock" value={kpis.enStock} color="verde" />
                <KpiCard label="Agotados" value={kpis.agotados} color="red" />
                <KpiCard label="Categorías" value={kpis.categorias} color="sage" />
              </div>

              {/* Filtros */}
              <div className="flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-3 mb-5">
                <input
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar producto…"
                  className="flex-1 min-w-[150px] px-3 py-2 rounded-lg border border-verde-noche/15 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-verde/30"
                />
                <select
                  value={categoriaFiltro}
                  onChange={(e) => setCategoriaFiltro(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-verde-noche/15 text-sm bg-white capitalize"
                >
                  <option value="todas">Todas las categorías</option>
                  {categorias.map((c) => (
                    <option key={c} value={c} className="capitalize">{c}</option>
                  ))}
                </select>
                <select
                  value={estadoFiltro}
                  onChange={(e) => setEstadoFiltro(e.target.value as FiltroEstado)}
                  className="px-3 py-2 rounded-lg border border-verde-noche/15 text-sm bg-white"
                >
                  <option value="todos">Todos los estados</option>
                  <option value="en-stock">En stock</option>
                  <option value="agotado">Agotados</option>
                  <option value="ocultos">Ocultos</option>
                </select>
                <select
                  value={orden}
                  onChange={(e) => setOrden(e.target.value as Orden)}
                  className="px-3 py-2 rounded-lg border border-verde-noche/15 text-sm bg-white"
                >
                  <option value="recientes">Más recientes</option>
                  <option value="nombre">Nombre A-Z</option>
                  <option value="precio-asc">Precio ↑</option>
                  <option value="precio-desc">Precio ↓</option>
                  <option value="stock-desc">Stock ↓</option>
                </select>
              </div>

              {/* Grid de cards */}
              {cargando ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="bg-white rounded-xl shadow-sm p-4 animate-pulse">
                      <div className="w-full aspect-square bg-crema rounded-lg mb-3" />
                      <div className="h-3 bg-crema rounded w-2/3 mb-2" />
                      <div className="h-3 bg-crema rounded w-1/3" />
                    </div>
                  ))}
                </div>
              ) : filtrados.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm p-10 text-center">
                  <p className="text-sm text-verde-noche/60">No se encontraron productos con los filtros actuales.</p>
                </div>
              ) : (
                <>
                  <p className="text-xs text-verde-noche/50 mb-3">
                    {filtrados.length} de {productos.length} productos · página {paginaActual} de {totalPaginas}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
                    {productosPagina.map((p) => {
                      const srcRaw = (p.images && p.images[0]) || p.image_url;
                      const { url: srcLimpia, encuadre } = srcRaw ? parsearEncuadre(srcRaw) : { url: '', encuadre: null };
                      const stockColor = p.stock > 5 ? 'bg-verde/15 text-verde-oscuro' : p.stock > 0 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-600';
                      return (
                        <div key={p.id} className="bg-white rounded-xl shadow-sm border border-verde-noche/5 hover:shadow-md transition-shadow overflow-hidden">
                          <div className="relative w-full aspect-square bg-crema overflow-hidden">
                            {srcLimpia ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={srcLimpia} alt={p.name} className="w-full h-full" style={estilosEncuadre(encuadre)} />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-verde-oscuro/30 text-xs">s/i</div>
                            )}
                            <div className="absolute top-2 right-2 flex gap-1.5">
                              <button
                                onClick={() => toggleVisibilidad(p.id, p.visible)}
                                className={`text-[10px] font-semibold px-2 py-1 rounded-full ${p.visible ? 'bg-verde/85 text-white' : 'bg-gray-600/85 text-white'}`}
                                title={p.visible ? 'Ocultar' : 'Mostrar'}
                              >
                                {p.visible ? '●' : '○'}
                              </button>
                            </div>
                          </div>
                          <div className="p-3">
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <h3 className="text-sm font-medium text-verde-noche line-clamp-2 leading-tight">{p.name}</h3>
                            </div>
                            <p className="text-[11px] text-sage font-medium uppercase tracking-wide mb-2 capitalize">{p.category}</p>
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-sm font-semibold text-verde">{formatoCLP.format(p.price)}</span>
                              <button
                                onClick={() => ajustarStock(p.id, p.stock > 0 ? -1 : 0)}
                                className={`text-[10px] font-semibold px-2 py-1 rounded-full ${stockColor}`}
                                title="Stock actual"
                              >
                                Stock: {p.stock}
                              </button>
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => ajustarStock(p.id, -1)}
                                disabled={p.stock <= 0}
                                className="flex-1 py-1.5 rounded-lg border border-verde-noche/15 text-xs hover:bg-crema disabled:opacity-30"
                              >−</button>
                              <button
                                onClick={() => ajustarStock(p.id, 1)}
                                className="flex-1 py-1.5 rounded-lg border border-verde-noche/15 text-xs hover:bg-crema"
                              >+</button>
                              <button
                                onClick={() => setEditando(p)}
                                className="flex-1 py-1.5 rounded-lg bg-verde text-white text-xs font-semibold hover:bg-verde-oscuro"
                              >Editar</button>
                              <button
                                onClick={() => eliminarProducto(p.id)}
                                className="px-2 py-1.5 rounded-lg text-red-500 hover:bg-red-50 text-xs"
                                aria-label="Eliminar"
                              >🗑</button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Paginación */}
                  {totalPaginas > 1 && (
                    <div className="flex items-center justify-center gap-1 mt-6">
                      <button
                        onClick={() => setPagina((p) => Math.max(1, p - 1))}
                        disabled={paginaActual <= 1}
                        className="px-3 py-1.5 rounded-lg border border-verde-noche/15 text-sm disabled:opacity-30 hover:bg-crema"
                      >‹</button>
                      {Array.from({ length: totalPaginas }).map((_, i) => {
                        const num = i + 1;
                        if (totalPaginas > 7 && Math.abs(num - paginaActual) > 2 && num !== 1 && num !== totalPaginas) {
                          if (Math.abs(num - paginaActual) === 3) return <span key={num} className="px-1 text-verde-noche/30">…</span>;
                          return null;
                        }
                        return (
                          <button
                            key={num}
                            onClick={() => setPagina(num)}
                            className={`w-8 h-8 rounded-lg text-sm font-medium ${
                              num === paginaActual ? 'bg-verde text-white' : 'border border-verde-noche/15 hover:bg-crema'
                            }`}
                          >{num}</button>
                        );
                      })}
                      <button
                        onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
                        disabled={paginaActual >= totalPaginas}
                        className="px-3 py-1.5 rounded-lg border border-verde-noche/15 text-sm disabled:opacity-30 hover:bg-crema"
                      >›</button>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {/* Pedidos */}
          {vista === 'pedidos' && (
            <div>
              {pedidos.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm p-10 text-center">
                  <p className="text-sm text-verde-noche/60">No hay pedidos pendientes.</p>
                  <p className="text-xs text-verde-noche/40 mt-1">Los pedidos se expiran automáticamente a las 48h y restauran el stock.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {pedidos.map((ped) => (
                    <div key={ped.id} className="bg-white rounded-xl shadow-sm border border-verde-noche/5 p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="font-semibold text-verde-noche text-sm">Pedido #{ped.id}</p>
                          <p className="text-xs text-verde-noche/50">
                            {ped.cliente_nombre || 'Sin nombre'} · {new Date(ped.created_at).toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' })}
                          </p>
                          {ped.cliente_email && (
                            <p className="text-xs text-verde-noche/50 flex items-center gap-1">
                              <span>📧</span> {ped.cliente_email}
                            </p>
                          )}
                        </div>
                        <span className="text-sm font-semibold text-verde">{formatoCLP.format(ped.total)}</span>
                      </div>
                      <div className="space-y-1 mb-3">
                        {ped.items.map((item, idx) => (
                          <div key={idx} className="flex justify-between text-xs text-verde-noche/70">
                            <span>{item.qty}× {item.nombre}</span>
                            <span>{formatoCLP.format(item.precio * item.qty)}</span>
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => confirmarPedido(ped.id)}
                          className="flex-1 py-2 rounded-lg bg-verde text-white text-xs font-semibold hover:bg-verde-oscuro"
                        >✓ Confirmar</button>
                        <button
                          onClick={() => cancelarPedido(ped.id)}
                          className="flex-1 py-2 rounded-lg border border-red-300 text-red-600 text-xs font-semibold hover:bg-red-50"
                        >Cancelar</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Categorías */}
          {vista === 'categorias' && categorias.length > 0 && (
            <div className="max-w-md">
              <CategoryOrderEditor categorias={categorias} ordenInicial={categoryOrder} onGuardado={setCategoryOrder} />
            </div>
          )}

          {/* Destacados */}
          {vista === 'destacados' && !cargando && productos.length > 0 && (
            <div className="max-w-md">
              <FeaturedEditor productos={productos} featureConfigInicial={featured} onGuardado={setFeatured} />
            </div>
          )}
        </main>
      </div>

      {(creandoNuevo || editando) && (
        <ProductForm
          producto={editando}
          categorias={categorias.length ? categorias : ['general']}
          onCancelar={() => { setCreandoNuevo(false); setEditando(null); }}
          onGuardado={() => { setCreandoNuevo(false); setEditando(null); cargarTodo(); }}
        />
      )}
    </div>
  );
}

function KpiCard({ label, value, color }: { label: string; value: number; color: string }) {
  const colors: Record<string, string> = {
    'verde-noche': 'text-verde-noche',
    'verde': 'text-verde',
    'red': 'text-red-500',
    'sage': 'text-sage',
  };
  return (
    <div className="bg-white rounded-xl shadow-sm border border-verde-noche/5 p-4">
      <p className="text-xs text-verde-noche/50 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${colors[color] || 'text-verde-noche'}`}>{value}</p>
    </div>
  );
}