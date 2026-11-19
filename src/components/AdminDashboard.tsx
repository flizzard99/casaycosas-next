'use client';

import AdminIcon from './AdminIcon';
import { LINEAS, lineaProducto } from '@/lib/lineas';
import { nombreCategoria } from '@/lib/categorias';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import ProductForm from './ProductForm';
import CategoryOrderEditor from './CategoryOrderEditor';
import FeaturedEditor from './FeaturedEditor';
import type { Producto, FeaturedConfig } from '@/lib/types';
import { adminFetch } from '@/lib/adminFetch';
import { parsearEncuadre, estilosEncuadre } from '@/lib/encuadre';
import type { Pedido } from '@/lib/db';

const formatoCLP = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
const GRUPOS_PUBLICOS = [...LINEAS.matera.grupos, ...LINEAS.cristiana.grupos];
const FEATURED_DEFAULT: FeaturedConfig = { productIds: [], title: 'Productos más vendidos' };
const PAGE_SIZE = 24;

type Vista = 'productos' | 'categorias' | 'destacados' | 'pedidos';
type FiltroEstado = 'todos' | 'en-stock' | 'agotado' | 'ocultos' | 'remate';
const ESTADOS_PEDIDO = {
  pendiente: 'Pendientes',
  confirmado: 'Confirmados',
  revision: 'Pagos por revisar',
  cancelado: 'Cancelados',
  expirado: 'Vencidos',
  todos: 'Todos'
} as const;
type FiltroPedido = keyof typeof ESTADOS_PEDIDO;
const VISTAS: Vista[] = ['productos', 'pedidos', 'categorias', 'destacados'];

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
  const [filtroPedido, setFiltroPedido] = useState<FiltroPedido>('todos');
  const [paginaPedidos, setPaginaPedidos] = useState(1);
  const [totalPedidos, setTotalPedidos] = useState(0);
  const [cargandoPedidos, setCargandoPedidos] = useState(false);
  const [recargarPedidos, setRecargarPedidos] = useState(0);
  const [errorPedidos, setErrorPedidos] = useState('');
  const [errorCatalogo, setErrorCatalogo] = useState('');
  const [aviso, setAviso] = useState<{ texto: string; error?: boolean }>();
  const [ocupado, setOcupado] = useState<string>();

  useEffect(() => {
    function sincronizarVista() {
      const valor = window.location.hash.slice(1);
      setVista(VISTAS.find((seccion) => seccion === valor) ?? 'productos');
    }
    sincronizarVista();
    window.addEventListener('hashchange', sincronizarVista);
    return () => window.removeEventListener('hashchange', sincronizarVista);
  }, []);

  async function cargarTodo() {
    setCargando(true);
    setErrorCatalogo('');
    try {
      const [resProductos, resConfig] = await Promise.all([fetch('/api/productos'), fetch('/api/config')]);
      if (!resProductos.ok || !resConfig.ok) throw new Error('Error al cargar datos');
      setProductos(await resProductos.json());
      const config = await resConfig.json();
      setCategoryOrder(config.categoryOrder || []);
      setFeatured(config.featured || FEATURED_DEFAULT);
    } catch {
      setErrorCatalogo('No pudimos cargar los productos y la configuración.');
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargarTodo();
  }, []);

  useEffect(() => {
    if (vista !== 'pedidos') return;
    const controller = new AbortController();
    setCargandoPedidos(true);
    setErrorPedidos('');
    async function cargarPedidos() {
      try {
        const res = await adminFetch(`/api/pedidos?estado=${filtroPedido}&pagina=${paginaPedidos}`, {
          method: 'GET', signal: controller.signal
        });
        if (!res.ok) throw new Error('No se pudieron cargar los pedidos.');
        const data = await res.json();
        if (controller.signal.aborted) return;
        const ultimaPagina = Math.max(1, Math.ceil(data.total / PAGE_SIZE));
        if (paginaPedidos > ultimaPagina) {
          setPaginaPedidos(ultimaPagina);
          return;
        }
        setPedidos(data.pedidos);
        setTotalPedidos(data.total);
      } catch {
        if (!controller.signal.aborted) setErrorPedidos('No pudimos cargar los pedidos.');
      } finally {
        if (!controller.signal.aborted) setCargandoPedidos(false);
      }
    }
    cargarPedidos();
    return () => controller.abort();
  }, [vista, filtroPedido, paginaPedidos, recargarPedidos]);

  const publicables = useMemo(() => productos.filter((producto) => producto.visible && lineaProducto(producto)), [productos]);
  const categorias = useMemo(() => [...new Set(productos.map((p) => p.category))].sort(), [productos]);

  const kpis = useMemo(() => {
    const enStock = productos.filter((p) => p.stock > 0).length;
    const agotados = productos.filter((p) => p.stock <= 0).length;
    return { total: productos.length, enStock, agotados, categorias: categorias.length };
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
        (estadoFiltro === 'ocultos' && !p.visible) ||
        (estadoFiltro === 'remate' && p.remate);
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

  async function ejecutarAccion(clave: string, url: string, opciones: RequestInit, mensaje: string, actualizar: (dato: Producto) => void) {
    if (ocupado) return;
    setOcupado(clave);
    setAviso(undefined);
    try {
      const res = await adminFetch(url, opciones);
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || 'No pudimos guardar el cambio.');
      }
      actualizar(await res.json().catch(() => null));
      setAviso({ texto: mensaje });
    } catch (error) {
      setAviso({ texto: error instanceof Error ? error.message : 'No pudimos guardar el cambio.', error: true });
    } finally {
      setOcupado(undefined);
    }
  }

  function actualizarProducto(actualizado: Producto) {
    setProductos((prev) => prev.map((p) => (p.id === actualizado.id ? actualizado : p)));
  }

  function ajustarStock(id: number, delta: number) {
    return ejecutarAccion(`producto-${id}`, `/api/productos/${id}/stock`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ delta })
    }, 'Stock actualizado.', actualizarProducto);
  }

  function toggleVisibilidad(id: number, visible: boolean) {
    return ejecutarAccion(`producto-${id}`, `/api/productos/${id}/visibility`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ visible: !visible })
    }, visible ? 'Producto oculto.' : 'Producto publicado.', actualizarProducto);
  }

  function alternarRemate(producto: Producto) {
    return ejecutarAccion(`producto-${producto.id}`, `/api/productos/${producto.id}/remate`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ remate: !producto.remate })
    }, producto.remate ? 'Producto retirado de Remate.' : 'Producto asignado a Remate.', actualizarProducto);
  }

  function eliminarProducto(id: number) {
    if (!confirm('¿Eliminar este producto? Esta acción no se puede deshacer.')) return;
    return ejecutarAccion(`producto-${id}`, `/api/productos/${id}`, { method: 'DELETE' },
      'Producto eliminado.', () => setProductos((prev) => prev.filter((p) => p.id !== id)));
  }

  function procesarPedido(id: number, accion: 'confirmar' | 'cancelar') {
    if (accion === 'cancelar' && !confirm('¿Cancelar este pedido? El stock será restaurado.')) return;
    return ejecutarAccion(`pedido-${id}`, `/api/pedidos/${id}/${accion}`, { method: 'PATCH' },
      accion === 'confirmar' ? 'Pedido confirmado.' : 'Pedido cancelado.', () => {
        setRecargarPedidos((valor) => valor + 1);
        if (accion === 'cancelar') cargarTodo();
      });
  }

  function registrarDespacho(id: number, codigo: string) {
    return ejecutarAccion(`pedido-${id}`, `/api/pedidos/${id}/despachar`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ codigo })
    }, 'Despacho registrado.', () => setRecargarPedidos((valor) => valor + 1));
  }

  async function handleLogout() {
    await ejecutarAccion('salir', '/api/auth/logout', { method: 'POST' }, 'Sesión cerrada.', onLogout);
  }

  const navItems: { id: Vista; label: string }[] = [
    { id: 'productos', label: 'Productos' },
    { id: 'pedidos', label: 'Pedidos' },
    { id: 'categorias', label: 'Categorías' },
    { id: 'destacados', label: 'Destacados' },
  ];

  return (
    <div className="min-h-screen bg-[#f7f7f2] flex">
      {/* Sidebar */}
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col bg-verde-noche lg:flex">
        <div className="px-5 py-5 border-b border-white/10">
          <Link href="/" className="flex items-center gap-2 group">
            <Image src="/oveja-logo.png" alt="" width={34} height={34} unoptimized />
            <div>
              <p className="font-display text-white text-sm leading-tight">Casa y Cosas</p>
              <p className="text-white/40 text-[10px]">Administración</p>
            </div>
          </Link>
        </div>

        <nav aria-label="Administración" className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              aria-current={vista === item.id ? 'page' : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                vista === item.id ? 'bg-white/15 text-white' : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <AdminIcon name={item.id} />
              {item.label}
            </a>
          ))}
        </nav>

        <div className="px-3 py-4 border-t border-white/10 space-y-1">
          <Link
            href="/"
            target="_blank"
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-white/60 hover:text-white hover:bg-white/5 transition-colors"
          >
            <AdminIcon name="externo" />
            Ver colecciones
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-white/60 hover:text-white hover:bg-white/5 transition-colors"
          >
            <AdminIcon name="salir" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        {/* Topbar */}
        <header className="sticky top-0 z-20 border-b border-verde-noche/10 bg-white px-4 py-3 md:px-8">
          <div className="flex items-center gap-3">
            <h1 className="flex-1 font-display text-xl text-verde-noche">
              {navItems.find((item) => item.id === vista)?.label}
            </h1>
            <Link href="/" className="hidden text-sm font-semibold underline sm:inline lg:hidden">Tienda</Link>
            <button type="button" className="inline-flex min-h-10 items-center gap-1 rounded-lg border border-verde-noche/15 px-2 text-sm lg:hidden" onClick={handleLogout}>
              <AdminIcon name="salir" className="size-4" /> Salir
            </button>
          {vista === 'productos' && (
            <button
              onClick={() => setCreandoNuevo(true)}
              className="bg-verde text-white text-sm font-semibold px-3 md:px-4 py-2 rounded-lg hover:bg-verde-oscuro whitespace-nowrap flex items-center gap-1.5"
            >
              <AdminIcon name="mas" />
              <span className="hidden sm:inline">Nuevo producto</span>
              <span className="sm:hidden">Nuevo</span>
            </button>
          )}
          </div>
          <nav aria-label="Administración móvil" className="mt-3 grid grid-cols-4 gap-1 lg:hidden">
            {navItems.map((item) => (
              <a href={`#${item.id}`} key={item.id} aria-current={vista === item.id ? 'page' : undefined}
                className={`grid min-h-10 place-items-center gap-1 rounded-lg px-0.5 py-2 text-center text-xs font-semibold sm:text-sm ${vista === item.id ? 'bg-verde-noche text-white' : 'hover:bg-crema/50'}`}>
                <AdminIcon name={item.id} />
                {item.label}
              </a>
            ))}
          </nav>
        </header>

        <main className="w-full max-w-screen-2xl flex-1 p-4 md:p-8">
          {aviso && <p role={aviso.error ? 'alert' : 'status'} className={`mb-4 rounded-lg border p-3 text-sm ${aviso.error ? 'border-red-200 bg-red-50 text-red-800' : 'border-verde/20 bg-sage/20'}`}>{aviso.texto}</p>}
          {errorCatalogo && vista !== 'pedidos' && (
            <div role="alert" className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              <p>{errorCatalogo}</p><button onClick={cargarTodo} className="font-semibold underline">Reintentar</button>
            </div>
          )}
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
                  aria-label="Buscar producto"
                  type="search"
                  className="flex-1 min-w-[150px] px-3 py-2 rounded-lg border border-verde-noche/15 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-verde/30"
                />
                <select
                  value={categoriaFiltro}
                  onChange={(e) => setCategoriaFiltro(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-verde-noche/15 text-sm bg-white"
                >
                  <option value="todas">Todas las categorías</option>
                  {categorias.map((c) => (
                    <option key={c} value={c}>{nombreCategoria(c)}</option>
                  ))}
                </select>
                <select
                  aria-label="Estado del producto"
                  value={estadoFiltro}
                  onChange={(e) => setEstadoFiltro(e.target.value as FiltroEstado)}
                  className="px-3 py-2 rounded-lg border border-verde-noche/15 text-sm bg-white"
                >
                  <option value="todos">Todos los estados</option>
                  <option value="en-stock">En stock</option>
                  <option value="agotado">Agotados</option>
                  <option value="ocultos">Ocultos</option>
                  <option value="remate">En remate</option>
                </select>
                <select
                  value={orden}
                  onChange={(e) => setOrden(e.target.value as Orden)}
                  className="px-3 py-2 rounded-lg border border-verde-noche/15 text-sm bg-white"
                >
                  <option value="recientes">Más recientes</option>
                  <option value="nombre">Nombre A-Z</option>
                  <option value="precio-asc">Precio: menor a mayor</option>
                  <option value="precio-desc">Precio: mayor a menor</option>
                  <option value="stock-desc">Mayor stock</option>
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
                              disabled={!!ocupado}
                                className={`inline-flex min-h-9 items-center gap-1 rounded-lg px-2 text-xs font-semibold ${p.visible ? 'bg-verde-noche text-white' : 'bg-white text-verde-noche'}`}
                                aria-label={`${p.visible ? 'Ocultar' : 'Mostrar'} ${p.name}`}
                              >
                                <AdminIcon name={p.visible ? 'visible' : 'oculto'} className="size-4" />
                                {p.visible ? 'Visible' : 'Oculto'}
                              </button>
                            </div>
                          </div>
                          <div className="p-3">
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <h3 className="text-sm font-medium text-verde-noche line-clamp-2 leading-tight">{p.name}</h3>
                            </div>
                            <p className="mb-2 text-xs font-medium text-verde-oscuro">{nombreCategoria(p.category)}{p.remate ? ' · En Remate' : !lineaProducto(p) ? ' · Fuera de las colecciones' : ''}</p>
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-sm font-semibold text-verde">{formatoCLP.format(p.price)}</span>
                              <span className={`rounded-full px-2 py-1 text-xs font-semibold ${stockColor}`}>
                                Stock: {p.stock}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => ajustarStock(p.id, -1)}
                                disabled={p.stock <= 0 || !!ocupado}
                                aria-label={`Reducir stock de ${p.name}`}
                                className="grid min-h-10 flex-1 place-items-center rounded-lg border border-verde-noche/15 hover:bg-crema disabled:opacity-30"
                              ><AdminIcon name="menos" className="size-4" /></button>
                              <button
                                onClick={() => ajustarStock(p.id, 1)}
                                disabled={!!ocupado}
                                aria-label={`Aumentar stock de ${p.name}`}
                                className="grid min-h-10 flex-1 place-items-center rounded-lg border border-verde-noche/15 hover:bg-crema disabled:opacity-30"
                              ><AdminIcon name="mas" className="size-4" /></button>
                              <button
                                onClick={() => setEditando(p)}
                                className="inline-flex min-h-10 flex-1 items-center justify-center gap-1 rounded-lg bg-verde-oscuro px-2 text-xs font-semibold text-white hover:bg-verde-noche"
                              ><AdminIcon name="editar" className="size-4" /> Editar</button>
                              <button
                                type="button"
                                onClick={() => eliminarProducto(p.id)}
                                disabled={!!ocupado}
                                className="inline-flex min-h-10 items-center justify-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2 text-xs font-semibold text-red-800 hover:border-red-300 hover:bg-red-100 disabled:opacity-50"
                                aria-label={`Eliminar ${p.name}`}
                              >
                                <AdminIcon name="papelera" />
                                Eliminar
                              </button>
                            </div>
                            <button type="button" onClick={() => alternarRemate(p)} disabled={!!ocupado}
                              aria-label={`${p.remate ? 'Quitar de Remate' : 'Mover a Remate'}: ${p.name}`}
                              className="mt-2 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-2 text-xs font-semibold text-amber-950 hover:bg-amber-100 disabled:opacity-50">
                              <AdminIcon name="categorias" className="size-4" />
                              {p.remate ? 'Quitar de Remate' : 'Mover a Remate'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Paginación */}
                  {totalPaginas > 1 && (
                    <div className="mt-6 flex flex-wrap items-center justify-center gap-1">
                      <button
                        onClick={() => setPagina((p) => Math.max(1, p - 1))}
                        disabled={paginaActual <= 1}
                        aria-label="Página anterior"
                        className="grid size-10 place-items-center rounded-lg border border-verde-noche/15 hover:bg-crema disabled:opacity-30"
                      ><AdminIcon name="izquierda" /></button>
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
                        aria-label="Página siguiente"
                        className="grid size-10 place-items-center rounded-lg border border-verde-noche/15 hover:bg-crema disabled:opacity-30"
                      ><AdminIcon name="derecha" /></button>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {vista === 'pedidos' && (
            <section aria-label="Pedidos de la tienda">
              <div className="mb-4 flex flex-wrap items-end gap-3">
                <label className="text-sm font-medium">
                  Estado del pedido
                  <select value={filtroPedido} onChange={(event) => { setFiltroPedido(event.target.value as FiltroPedido); setPaginaPedidos(1); }}
                    className="mt-1 block min-h-11 rounded-lg border border-verde-noche/20 bg-white px-3">
                    {Object.entries(ESTADOS_PEDIDO).map(([estado, nombre]) => <option key={estado} value={estado}>{nombre}</option>)}
                  </select>
                </label>
                <button type="button" className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-verde-noche/20 bg-white px-3 text-sm font-semibold"
                  onClick={() => setRecargarPedidos((valor) => valor + 1)}><AdminIcon name="recargar" /> Actualizar</button>
              </div>
              {errorPedidos ? <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">{errorPedidos}</p>
                : cargandoPedidos ? <p role="status" className="p-4 text-sm">Cargando pedidos…</p>
                : pedidos.length === 0 ? <p className="rounded-lg border border-verde-noche/10 bg-white p-6 text-sm">No hay pedidos con este filtro.</p>
                : (
                  <>
                    <div className="grid gap-4 xl:grid-cols-2">
                      {pedidos.map((ped) => (
                        <article key={ped.id} className="min-w-0 rounded-xl border border-verde-noche/10 bg-white p-4">
                          <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                            <div className="min-w-0">
                              <h2 className="font-semibold">Pedido #{ped.id}</h2>
                              <p className="text-xs text-verde-noche/75">{new Date(ped.created_at).toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Santiago' })}</p>
                            </div>
                            <span className="rounded-full bg-crema/60 px-2.5 py-1 text-xs font-semibold capitalize">{ped.despachado_at ? 'Despachado' : ped.estado}</span>
                          </div>
                          <dl className="space-y-1 break-words text-sm">
                            <div><dt className="inline font-semibold">Cliente: </dt><dd className="inline">{ped.cliente_nombre || 'Sin nombre'}</dd></div>
                            {ped.cliente_email && <div><dt className="inline font-semibold">Correo: </dt><dd className="inline">{ped.cliente_email}</dd></div>}
                            {ped.cliente_whatsapp && <div><dt className="inline font-semibold">Teléfono: </dt><dd className="inline">{ped.cliente_whatsapp}</dd></div>}
                            {ped.despacho && <div><dt className="inline font-semibold">Despacho por pagar: </dt><dd className="inline">{ped.despacho.direccion}, {ped.despacho.comuna}, {ped.despacho.region}</dd></div>}
                            {ped.codigo_despacho && <div><dt className="inline font-semibold">Seguimiento: </dt><dd className="inline">{ped.codigo_despacho}</dd></div>}
                            <div><dt className="inline font-semibold">Pago: </dt>
                              <dd className="inline">{ped.pago_estado === 'aprobado' ? `Mercado Pago aprobado · ${ped.pago_id}` : ped.pago_estado === 'revision' ? 'Requiere revisión' : ped.pago_estado ? 'Esperando Mercado Pago' : 'Pedido coordinado por redes'}</dd>
                            </div>
                          </dl>
                          {ped.pago_revision && <p className="mt-3 rounded-lg bg-amber-50 p-2 text-sm text-amber-900">{ped.pago_revision}</p>}
                          <ul className="my-3 space-y-1 border-t border-verde-noche/10 pt-3 text-sm">
                            {ped.items.map((item, idx) => (
                              <li className="flex justify-between gap-3" key={idx}>
                                <span>{item.qty} × {item.nombre}</span><span className="shrink-0">{formatoCLP.format(item.precio * item.qty)}</span>
                              </li>
                            ))}
                          </ul>
                          <p className="mb-3 text-right font-semibold">Total {formatoCLP.format(ped.total)}</p>
                          {ped.estado === 'pendiente' && !ped.pago_estado && (
                            <div className="flex gap-2">
                              <button disabled={!!ocupado} onClick={() => procesarPedido(ped.id, 'confirmar')}
                                className="min-h-10 flex-1 rounded-lg bg-verde-oscuro px-2 text-sm font-semibold text-white disabled:opacity-50"><span className="inline-flex items-center gap-1"><AdminIcon name="check" /> Confirmar</span></button>
                              <button disabled={!!ocupado} onClick={() => procesarPedido(ped.id, 'cancelar')}
                                className="min-h-10 flex-1 rounded-lg border border-red-200 px-2 text-sm font-semibold text-red-700 disabled:opacity-50"><span className="inline-flex items-center gap-1"><AdminIcon name="cerrar" /> Cancelar</span></button>
                            </div>
                          )}
                          {ped.estado === 'confirmado' && ped.pago_estado !== 'revision' && !ped.despachado_at && (
                            <form onSubmit={(event) => {
                              event.preventDefault();
                              registrarDespacho(ped.id, String(new FormData(event.currentTarget).get('codigo') || ''));
                            }} className="flex flex-wrap items-end gap-2">
                              <label className="flex-1 text-sm">
                                Código de seguimiento (opcional)
                                <input name="codigo" maxLength={80} className="mt-1 block min-h-10 w-full rounded-lg border border-verde-noche/20 px-2" />
                              </label>
                              <button disabled={!!ocupado} type="submit" className="min-h-10 rounded-lg bg-verde-oscuro px-3 text-sm font-semibold text-white disabled:opacity-50">
                                <span className="inline-flex items-center gap-1"><AdminIcon name="despacho" /> Registrar despacho</span>
                              </button>
                            </form>
                          )}
                        </article>
                      ))}
                    </div>
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
                      <p>{totalPedidos} {totalPedidos === 1 ? 'pedido' : 'pedidos'} · Página {paginaPedidos} de {Math.ceil(totalPedidos / PAGE_SIZE)}</p>
                      <div className="flex gap-2">
                        <button disabled={paginaPedidos === 1} onClick={() => setPaginaPedidos((valor) => valor - 1)}
                          className="min-h-10 rounded-lg border bg-white px-3 disabled:opacity-40">Anterior</button>
                        <button disabled={paginaPedidos * PAGE_SIZE >= totalPedidos} onClick={() => setPaginaPedidos((valor) => valor + 1)}
                          className="min-h-10 rounded-lg border bg-white px-3 disabled:opacity-40">Siguiente</button>
                      </div>
                    </div>
                  </>
                )}
            </section>
          )}

          {/* Categorías */}
          {vista === 'categorias' && (
            <div className="max-w-md">
              <CategoryOrderEditor categorias={GRUPOS_PUBLICOS} ordenInicial={categoryOrder} onGuardado={setCategoryOrder} />
            </div>
          )}

          {/* Destacados */}
          {vista === 'destacados' && !cargando && productos.length > 0 && (
            <div className="max-w-md">
              <FeaturedEditor productos={publicables} featureConfigInicial={featured} onGuardado={setFeatured} />
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