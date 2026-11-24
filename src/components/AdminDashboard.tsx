'use client';

import AdminIcon from './AdminIcon';
import { LINEAS, grupoProducto, lineaProducto, type Linea } from '@/lib/lineas';
import { destacadosDeLinea, TITULO_DESTACADOS } from '@/lib/destacados';
import { precioActual } from '@/lib/precios';
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import ProductForm from './ProductForm';
import DisenoEditor from './DisenoEditor';
import PrecioProducto from './PrecioProducto';
import CategoryOrderEditor from './CategoryOrderEditor';
import FeaturedEditor from './FeaturedEditor';
import TransferenciaEditor from './TransferenciaEditor';
import type { Producto, FeaturedConfig, Config } from '@/lib/types';
import { adminFetch } from '@/lib/adminFetch';
import { parsearEncuadre, estilosEncuadre } from '@/lib/encuadre';
import type { NotificacionPedidoAdmin, Pedido } from '@/lib/db';
import { ENVIO_CHILE } from '@/lib/checkout';
import IntegracionesPanel from './IntegracionesPanel';
import HoldToConfirm from './HoldToConfirm';

const formatoCLP = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
const GRUPOS_PUBLICOS = Object.values(LINEAS).flatMap(({ grupos }) => [...grupos]);
const FEATURED_DEFAULT: Pick<Config, 'featured' | 'featuredByLine'> = {
  featured: { productIds: [], title: TITULO_DESTACADOS }, featuredByLine: {}
};
const PAGE_SIZE = 24;

type Vista = 'productos' | 'categorias' | 'destacados' | 'pedidos' | 'diseno';
type FiltroEstado = 'todos' | 'en-stock' | 'agotado' | 'ocultos' | 'remate';
const ESTADOS_PEDIDO = {
  sin_revisar: 'Nuevos · sin revisar',
  pendiente: 'Pendientes',
  confirmado: 'Confirmados',
  revision: 'Pagos por revisar',
  cancelado: 'Cancelados',
  expirado: 'Vencidos',
  papelera: 'Papelera (30 días)',
  todos: 'Todos'
} as const;
type FiltroPedido = keyof typeof ESTADOS_PEDIDO;
const VISTAS: Vista[] = ['productos', 'pedidos', 'categorias', 'destacados', 'diseno'];

type ResumenNotificaciones = {
  pendientes: number;
  revision: number;
  sinRevisar: number;
  ultimos: NotificacionPedidoAdmin[];
  nuevos: NotificacionPedidoAdmin[];
  cursor: string;
};

function etiquetaPago(pedido: Pedido) {
  if (pedido.pago_estado === 'revision') return 'Requiere revisión';
  if (!pedido.metodo_pago) return 'Pedido coordinado por redes';
  const metodo = pedido.metodo_pago === 'transferencia' ? 'Transferencia' : 'Mercado Pago';
  if (pedido.pago_estado === 'aprobado') return pedido.metodo_pago === 'transferencia'
    ? 'Transferencia recibida' : `Mercado Pago aprobado${pedido.pago_id ? ` · ${pedido.pago_id}` : ''}`;
  return pedido.estado === 'pendiente' ? `${metodo} · Pendiente de pago` : metodo;
}

type Orden = 'recientes' | 'nombre' | 'precio-asc' | 'precio-desc' | 'stock-desc';

export default function AdminDashboard({ onLogout }: { onLogout: () => void }) {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [categoryOrder, setCategoryOrder] = useState<string[]>([]);
  const [diseno, setDiseno] = useState<Config['diseno']>({});
  const [featured, setFeatured] = useState(FEATURED_DEFAULT);
  const [lineaDestacados, setLineaDestacados] = useState<Linea>('matera');
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
  const [mostrarCuenta, setMostrarCuenta] = useState(false);
  const [paginaPedidos, setPaginaPedidos] = useState(1);
  const [recargarPedidos, setRecargarPedidos] = useState(0);
  const [resultadoPedidos, setResultadoPedidos] = useState<{ clave: string; pedidos: Pedido[]; total: number; error?: string }>();
  const clavePedidos = `${filtroPedido}:${paginaPedidos}:${recargarPedidos}`;
  const cargandoPedidos = resultadoPedidos?.clave !== clavePedidos;
  const pedidos = cargandoPedidos ? [] : resultadoPedidos.pedidos;
  const totalPedidos = cargandoPedidos ? 0 : resultadoPedidos.total;
  const errorPedidos = cargandoPedidos ? '' : resultadoPedidos.error;
  const [errorCatalogo, setErrorCatalogo] = useState('');
  const [aviso, setAviso] = useState<{ texto: string; error?: boolean }>();
  const [ocupado, setOcupado] = useState<string>();
  const [resumenNotificaciones, setResumenNotificaciones] = useState<ResumenNotificaciones>();
  const [nuevosPedidos, setNuevosPedidos] = useState<NotificacionPedidoAdmin[]>([]);
  const [notificacionesAbiertas, setNotificacionesAbiertas] = useState(false);
  const [desdeNotificaciones, setDesdeNotificaciones] = useState<string>();
  const [permisoNotificaciones, setPermisoNotificaciones] = useState<NotificationPermission | 'unsupported'>('unsupported');
  const primeraConsultaNotificaciones = useRef(true);
  const codigosNotificados = useRef(new Set<string>());
  const panelNotificaciones = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function sincronizarVista() {
      const valor = window.location.hash.slice(1);
      setVista(VISTAS.find((seccion) => seccion === valor) ?? 'productos');
    }
    sincronizarVista();
    window.addEventListener('hashchange', sincronizarVista);
    return () => window.removeEventListener('hashchange', sincronizarVista);
  }, []);

  function cargarTodo() {
    Promise.all([fetch('/api/productos'), fetch('/api/config')])
      .then(async ([resProductos, resConfig]) => {
        if (!resProductos.ok || !resConfig.ok) throw new Error('Error al cargar datos');
        const [lista, config] = await Promise.all([resProductos.json(), resConfig.json()]);
        setProductos(lista);
        setCategoryOrder(config.categoryOrder || []);
        setFeatured({ featured: config.featured ?? FEATURED_DEFAULT.featured, featuredByLine: config.featuredByLine ?? {} });
        setDiseno(config.diseno ?? {});
      })
      .catch(() => setErrorCatalogo('No pudimos cargar los productos y la configuración.'))
      .finally(() => setCargando(false));
  }

  function recargarCatalogo() {
    setCargando(true);
    setErrorCatalogo('');
    cargarTodo();
  }

  useEffect(() => {
    cargarTodo();
  }, []);

  useEffect(() => {
    if (!aviso) return;
    const temporizador = window.setTimeout(() => setAviso(undefined), aviso.error ? 8000 : 4000);
    return () => window.clearTimeout(temporizador);
  }, [aviso]);

  useEffect(() => {
    const temporizador = window.setTimeout(() => {
      const haceUnDia = new Date(Date.now() - 86400000).toISOString();
      const guardado = localStorage.getItem('cyc-pedidos-vistos-hasta');
      const fechaGuardada = guardado ? new Date(guardado) : null;
      const valido = fechaGuardada && Number.isFinite(fechaGuardada.getTime()) && fechaGuardada.getTime() >= Date.now() - 30 * 86400000;
      setDesdeNotificaciones(valido ? fechaGuardada.toISOString() : haceUnDia);
      setPermisoNotificaciones('Notification' in window ? Notification.permission : 'unsupported');
    }, 0);
    return () => window.clearTimeout(temporizador);
  }, []);

  useEffect(() => {
    if (!desdeNotificaciones) return;
    const controller = new AbortController();
    let consultando = false;
    async function consultar() {
      if (consultando || document.visibilityState !== 'visible') return;
      consultando = true;
      try {
        const respuesta = await adminFetch(`/api/pedidos/notificaciones?desde=${encodeURIComponent(desdeNotificaciones!)}`, {
          method: 'GET', signal: controller.signal
        });
        if (!respuesta.ok) return;
        const data = await respuesta.json() as ResumenNotificaciones;
        if (controller.signal.aborted) return;
        setResumenNotificaciones(data);
        setNuevosPedidos(data.nuevos);
        for (const pedido of data.nuevos) {
          if (!primeraConsultaNotificaciones.current && !codigosNotificados.current.has(pedido.codigo_publico) &&
              'Notification' in window && Notification.permission === 'granted') {
            const notificacion = new Notification('Nuevo pedido en Casa y Cosas', {
              body: `${pedido.codigo_publico} · ${formatoCLP.format(pedido.total)}`,
              icon: '/oveja-logo.png',
              tag: pedido.codigo_publico
            });
            notificacion.onclick = () => {
              window.focus();
              window.location.hash = 'pedidos';
              notificacion.close();
            };
          }
          codigosNotificados.current.add(pedido.codigo_publico);
        }
        primeraConsultaNotificaciones.current = false;
      } catch {
        return;
      } finally {
        consultando = false;
      }
    }
    void consultar();
    const intervalo = window.setInterval(consultar, 30000);
    function alVolver() {
      if (document.visibilityState === 'visible') void consultar();
    }
    document.addEventListener('visibilitychange', alVolver);
    return () => {
      controller.abort();
      window.clearInterval(intervalo);
      document.removeEventListener('visibilitychange', alVolver);
    };
  }, [desdeNotificaciones]);

  useEffect(() => {
    if (!notificacionesAbiertas) return;
    function cerrarFuera(event: PointerEvent) {
      if (!panelNotificaciones.current?.contains(event.target as Node)) setNotificacionesAbiertas(false);
    }
    function cerrarConEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setNotificacionesAbiertas(false);
    }
    document.addEventListener('pointerdown', cerrarFuera);
    document.addEventListener('keydown', cerrarConEscape);
    return () => {
      document.removeEventListener('pointerdown', cerrarFuera);
      document.removeEventListener('keydown', cerrarConEscape);
    };
  }, [notificacionesAbiertas]);

  useEffect(() => {
    if (vista !== 'pedidos') return;
    const controller = new AbortController();
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
        setResultadoPedidos({ clave: clavePedidos, pedidos: data.pedidos, total: data.total });
      } catch {
        if (!controller.signal.aborted) setResultadoPedidos({ clave: clavePedidos, pedidos: [], total: 0, error: 'No pudimos cargar los pedidos.' });
      }
    }
    cargarPedidos();
    return () => controller.abort();
  }, [vista, filtroPedido, paginaPedidos, clavePedidos]);

  const publicables = useMemo(() => productos.filter((producto) => producto.visible && lineaProducto(producto) === lineaDestacados), [productos, lineaDestacados]);
  const destacados = destacadosDeLinea(featured, lineaDestacados, publicables);
  const categorias = GRUPOS_PUBLICOS;

  const kpis = useMemo(() => {
    const enStock = productos.filter((p) => p.stock > 0).length;
    const agotados = productos.filter((p) => p.stock <= 0).length;
    return { total: productos.length, enStock, agotados, categorias: categorias.length };
  }, [productos, categorias]);

  const filtrados = useMemo(() => {
    const term = busqueda.trim().toLowerCase();
    let result = productos.filter((p) => {
      const linea = lineaProducto(p);
      const grupo = grupoProducto(p, linea);
      const porCategoria = categoriaFiltro === 'todas' || grupo === categoriaFiltro;
      const porTexto = !term || `${p.name} ${p.category} ${p.subcategoria}`.toLowerCase().includes(term);
      const porEstado =
        estadoFiltro === 'todos' ||
        (estadoFiltro === 'en-stock' && p.stock > 0) ||
        (estadoFiltro === 'agotado' && p.stock <= 0) ||
        (estadoFiltro === 'ocultos' && !p.visible) ||
        (estadoFiltro === 'remate' && linea === 'remate');
      return porCategoria && porTexto && porEstado;
    });

    result = [...result].sort((a, b) => {
      switch (orden) {
        case 'nombre': return a.name.localeCompare(b.name);
        case 'precio-asc': return precioActual(a) - precioActual(b);
        case 'precio-desc': return precioActual(b) - precioActual(a);
        case 'stock-desc': return b.stock - a.stock;
        default: return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });
    return result;
  }, [productos, busqueda, categoriaFiltro, estadoFiltro, orden]);

  const totalPaginas = Math.ceil(filtrados.length / PAGE_SIZE);
  const paginaActual = Math.min(pagina, totalPaginas || 1);
  const productosPagina = filtrados.slice((paginaActual - 1) * PAGE_SIZE, paginaActual * PAGE_SIZE);

  async function ejecutarAccion<T>(clave: string, url: string, opciones: RequestInit, mensaje: string, actualizar: (dato: T) => void) {
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
    }, producto.remate ? `Producto retirado de ${LINEAS.remate.nombre}.` : `Producto asignado a ${LINEAS.remate.nombre}.`, actualizarProducto);
  }

  function guardarDestacados(linea: Linea, config: FeaturedConfig) {
    setFeatured((prev) => ({ ...prev, featuredByLine: { ...prev.featuredByLine, [linea]: config } }));
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
        if (accion === 'cancelar') recargarCatalogo();
      });
  }

  function borrarPedido(pedido: Pedido) {
    return ejecutarAccion(`pedido-${pedido.id}`, `/api/pedidos/${pedido.id}`, { method: 'DELETE' },
      'Pedido eliminado.', () => {
        setRecargarPedidos((valor) => valor + 1);
        if (pedido.estado === 'pendiente') recargarCatalogo();
      });
  }

  function marcarRevisado(id: number) {
    return ejecutarAccion<Pedido>(`pedido-${id}`, `/api/pedidos/${id}/revisar`, { method: 'PATCH' },
      'Pedido marcado como revisado.', () => {
        setRecargarPedidos((valor) => valor + 1);
        setResumenNotificaciones((actual) => actual ? { ...actual, sinRevisar: Math.max(0, actual.sinRevisar - 1) } : actual);
      });
  }

  function restaurarPedidoEliminado(id: number) {
    return ejecutarAccion<Pedido>(`pedido-${id}`, `/api/pedidos/${id}/restaurar`, { method: 'PATCH' },
      'Pedido restaurado como historial.', () => setRecargarPedidos((valor) => valor + 1));
  }

  function registrarDespacho(id: number, codigo: string) {
    return ejecutarAccion(`pedido-${id}`, `/api/pedidos/${id}/despachar`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ codigo })
    }, 'Despacho registrado.', () => setRecargarPedidos((valor) => valor + 1));
  }

  async function handleLogout() {
    await ejecutarAccion('salir', '/api/auth/logout', { method: 'POST' }, 'Sesión cerrada.', onLogout);
  }

  function alternarNotificaciones() {
    const abrir = !notificacionesAbiertas;
    setNotificacionesAbiertas(abrir);
    if (!abrir || !resumenNotificaciones) return;
    localStorage.setItem('cyc-pedidos-vistos-hasta', resumenNotificaciones.cursor);
    setDesdeNotificaciones(resumenNotificaciones.cursor);
    setNuevosPedidos([]);
  }

  async function activarNotificacionesNavegador() {
    if (!('Notification' in window)) return;
    const permiso = await Notification.requestPermission();
    setPermisoNotificaciones(permiso);
  }

  const navItems: { id: Vista; label: string; mobileLabel?: string }[] = [
    { id: 'productos', label: 'Productos' },
    { id: 'pedidos', label: 'Pedidos' },
    { id: 'categorias', label: 'Orden del catálogo', mobileLabel: 'Catálogo' },
    { id: 'destacados', label: 'Más vendidos', mobileLabel: 'Destacados' },
    { id: 'diseno', label: 'Diseño' },
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
            <div ref={panelNotificaciones} className="relative">
              <button type="button" onClick={alternarNotificaciones} aria-expanded={notificacionesAbiertas}
                aria-label={nuevosPedidos.length ? `${nuevosPedidos.length} pedidos nuevos` : 'Notificaciones de pedidos'}
                className="relative grid size-10 place-items-center rounded-full border border-verde-noche/15 bg-white hover:bg-crema/60">
                <AdminIcon name="campana" />
                {nuevosPedidos.length > 0 && <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-red-600 px-1 text-center text-[11px] font-bold leading-5 text-white">
                  {Math.min(nuevosPedidos.length, 99)}
                </span>}
              </button>
              {notificacionesAbiertas && (
                <section aria-label="Últimos pedidos" className="absolute right-0 top-12 z-30 w-[min(22rem,calc(100vw-2rem))] rounded-xl border border-verde-noche/15 bg-white p-3 shadow-xl">
                  <div className="mb-3 flex items-start justify-between gap-3 border-b border-verde-noche/10 pb-3">
                    <div>
                      <h2 className="font-semibold">Pedidos recientes</h2>
                      <p className="text-xs text-verde-noche/65">{resumenNotificaciones?.sinRevisar ?? 0} nuevos · {resumenNotificaciones?.pendientes ?? 0} pendientes · {resumenNotificaciones?.revision ?? 0} con alerta</p>
                    </div>
                    <a href="#pedidos" onClick={() => setNotificacionesAbiertas(false)} className="text-xs font-semibold underline">Ver pedidos</a>
                  </div>
                  {resumenNotificaciones?.ultimos.length ? (
                    <ul className="max-h-64 space-y-1 overflow-y-auto">
                      {resumenNotificaciones.ultimos.map((pedido) => (
                        <li key={pedido.codigo_publico} className="rounded-lg px-2 py-2 hover:bg-crema/50">
                          <div className="flex items-baseline justify-between gap-3 text-sm">
                            <span className="font-semibold">{pedido.codigo_publico}</span>
                            <span className="shrink-0 tabular-nums">{formatoCLP.format(pedido.total)}</span>
                          </div>
                          <p className="truncate text-xs text-verde-noche/65">{pedido.cliente_nombre || 'Cliente'} · {new Date(pedido.created_at).toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Santiago' })}</p>
                        </li>
                      ))}
                    </ul>
                  ) : <p className="py-4 text-center text-sm text-verde-noche/60">Todavía no hay pedidos.</p>}
                  {permisoNotificaciones === 'default' && (
                    <button type="button" onClick={activarNotificacionesNavegador}
                      className="mt-3 min-h-10 w-full rounded-lg border border-verde-noche/15 px-3 text-sm font-semibold hover:bg-crema/50">
                      Activar avisos del navegador
                    </button>
                  )}
                  {permisoNotificaciones === 'granted' && <p className="mt-3 text-center text-xs text-verde-oscuro">Avisos del navegador activos</p>}
                  {permisoNotificaciones === 'denied' && <p className="mt-3 text-center text-xs text-verde-noche/60">Los avisos están bloqueados en el navegador.</p>}
                </section>
              )}
            </div>
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
          <nav aria-label="Administración móvil" className="mt-3 grid grid-cols-5 gap-1 lg:hidden">
            {navItems.map((item) => (
              <a href={`#${item.id}`} key={item.id} aria-current={vista === item.id ? 'page' : undefined}
                className={`grid min-h-10 min-w-0 place-items-center gap-1 rounded-lg px-0.5 py-2 text-center text-[10px] font-semibold sm:text-sm ${vista === item.id ? 'bg-verde-noche text-white' : 'hover:bg-crema/50'}`}>
                <AdminIcon name={item.id} />
                {item.mobileLabel ?? item.label}
              </a>
            ))}
          </nav>
        </header>

        <main className="w-full max-w-screen-2xl flex-1 p-4 md:p-8">
          {aviso && (
            <div role={aviso.error ? 'alert' : 'status'} className={`fixed right-4 top-24 z-50 flex max-w-[calc(100vw-2rem)] items-center gap-3 rounded-xl border px-4 py-3 text-sm shadow-lg ${aviso.error ? 'border-red-200 bg-red-50 text-red-800' : 'border-verde/25 bg-white text-verde-noche'}`}>
              <AdminIcon name={aviso.error ? 'cerrar' : 'check'} className="size-4" />
              <p>{aviso.texto}</p>
              <button type="button" onClick={() => setAviso(undefined)} aria-label="Cerrar mensaje" className="grid size-8 place-items-center rounded-lg hover:bg-black/5">
                <AdminIcon name="cerrar" className="size-4" />
              </button>
            </div>
          )}
          {errorCatalogo && vista !== 'pedidos' && (
            <div role="alert" className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              <p>{errorCatalogo}</p><button onClick={recargarCatalogo} className="font-semibold underline">Reintentar</button>
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
                  onChange={(e) => { setBusqueda(e.target.value); setPagina(1); }}
                  placeholder="Buscar producto…"
                  aria-label="Buscar producto"
                  type="search"
                  className="flex-1 min-w-[150px] px-3 py-2 rounded-lg border border-verde-noche/15 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-verde/30"
                />
                <select
                  value={categoriaFiltro}
                  onChange={(e) => { setCategoriaFiltro(e.target.value); setPagina(1); }}
                  className="px-3 py-2 rounded-lg border border-verde-noche/15 text-sm bg-white"
                >
                  <option value="todas">Todas las categorías</option>
                  {categorias.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <select
                  aria-label="Estado del producto"
                  value={estadoFiltro}
                  onChange={(e) => { setEstadoFiltro(e.target.value as FiltroEstado); setPagina(1); }}
                  className="px-3 py-2 rounded-lg border border-verde-noche/15 text-sm bg-white"
                >
                  <option value="todos">Todos los estados</option>
                  <option value="en-stock">En stock</option>
                  <option value="agotado">Agotados</option>
                  <option value="ocultos">Ocultos</option>
                  <option value="remate">En {LINEAS.remate.nombre}</option>
                </select>
                <select
                  value={orden}
                  onChange={(e) => { setOrden(e.target.value as Orden); setPagina(1); }}
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
                      const linea = lineaProducto(p);
                      const remateAutomatico = linea === 'remate' && lineaProducto({ ...p, remate: false }) === 'remate';
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
                            <p className="mb-2 text-xs font-medium text-verde-oscuro">{LINEAS[linea].nombre} · {grupoProducto(p, linea)}{p.subcategoria ? ` · ${p.subcategoria}` : ''}</p>
                            <div className="flex items-center justify-between mb-3">
                              <PrecioProducto producto={p} className="text-sm font-semibold text-verde-oscuro" />
                              <span className={`rounded-full px-2 py-1 text-xs font-semibold ${stockColor}`}>
                                Stock: {p.stock}{p.variantes.length > 0 && ` · ${p.variantes.length} ${p.variantes.length === 1 ? 'variante' : 'variantes'}`}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => ajustarStock(p.id, -1)}
                                disabled={p.stock <= 0 || !!ocupado || p.variantes.length > 0}
                                aria-label={`Reducir stock de ${p.name}`}
                                className="grid min-h-10 flex-1 place-items-center rounded-lg border border-verde-noche/15 hover:bg-crema disabled:opacity-30"
                              ><AdminIcon name="menos" className="size-4" /></button>
                              <button
                                onClick={() => ajustarStock(p.id, 1)}
                                disabled={!!ocupado || p.variantes.length > 0}
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
                            {!remateAutomatico && <button type="button" onClick={() => alternarRemate(p)} disabled={!!ocupado}
                              aria-label={`${p.remate ? 'Quitar de' : 'Mover a'} ${LINEAS.remate.nombre}: ${p.name}`}
                              className="mt-2 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-2 text-xs font-semibold text-amber-950 hover:bg-amber-100 disabled:opacity-50">
                              <AdminIcon name="categorias" className="size-4" />
                              {p.remate ? 'Quitar de' : 'Mover a'} {LINEAS.remate.nombre}
                            </button>}
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
              <IntegracionesPanel />
              <details className="mb-4 rounded-xl border border-verde-noche/15 bg-white p-4" onToggle={(event) => setMostrarCuenta(event.currentTarget.open)}>
                <summary className="cursor-pointer text-sm font-semibold">Cuenta para transferencias</summary>
                {mostrarCuenta && <TransferenciaEditor />}
              </details>
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
                      {pedidos.map((ped) => {
                        const sinRevisar = !ped.revisado_at && !ped.eliminado_at;
                        const requiereRevision = ped.pago_estado === 'revision';
                        const enPapelera = Boolean(ped.eliminado_at);
                        return (
                        <article key={ped.id} className={`relative min-w-0 rounded-xl border bg-white p-4 transition-shadow ${requiereRevision
                          ? 'border-amber-400 ring-2 ring-amber-300/35 shadow-[0_0_26px_rgba(245,158,11,0.18)]'
                          : sinRevisar
                            ? 'border-verde ring-2 ring-verde/20 shadow-[0_0_24px_rgba(88,129,87,0.22)]'
                            : enPapelera ? 'border-dashed border-verde-noche/20 opacity-90' : 'border-verde-noche/10'}`}>
                          <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <h2 className="break-all font-semibold">Pedido {ped.codigo_publico}</h2>
                                {sinRevisar && <span className="rounded-full bg-verde-oscuro px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">Nuevo · sin revisar</span>}
                                {requiereRevision && <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-950">Revisión urgente</span>}
                              </div>
                              <p className="text-xs text-verde-noche/75">{new Date(ped.created_at).toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Santiago' })}</p>
                              {ped.eliminado_at && <p className="mt-1 text-xs font-medium text-red-700">En papelera desde {new Date(ped.eliminado_at).toLocaleDateString('es-CL', { timeZone: 'America/Santiago' })}. Se eliminará automáticamente a los 30 días.</p>}
                            </div>
                            <span className="rounded-full bg-crema/60 px-2.5 py-1 text-xs font-semibold capitalize">{enPapelera ? 'En papelera' : ped.despachado_at ? 'Despachado' : ped.estado}</span>
                          </div>
                          <dl className="space-y-1 break-words text-sm">
                            <div><dt className="inline font-semibold">Cliente: </dt><dd className="inline">{ped.cliente_nombre || 'Sin nombre'}</dd></div>
                            {ped.cliente_rut && <div><dt className="inline font-semibold">RUT: </dt><dd className="inline">{ped.cliente_rut}</dd></div>}
                            {ped.cliente_email && <div><dt className="inline font-semibold">Correo: </dt><dd className="inline">{ped.cliente_email}</dd></div>}
                            {ped.cliente_whatsapp && <div><dt className="inline font-semibold">Teléfono: </dt><dd className="inline">{ped.cliente_whatsapp}</dd></div>}
                            {ped.despacho && <div><dt className="inline font-semibold">{ped.costo_envio ? `Despacho ${ENVIO_CHILE.servicio}: ` : 'Despacho por pagar: '}</dt><dd className="inline">{ped.despacho.direccion}, {ped.despacho.comuna}, {ped.despacho.region}</dd></div>}
                            {ped.despacho?.nota && <div><dt className="inline font-semibold">Nota: </dt><dd className="inline whitespace-pre-wrap">{ped.despacho.nota}</dd></div>}
                            {ped.codigo_despacho && <div><dt className="inline font-semibold">Seguimiento: </dt><dd className="inline">{ped.codigo_despacho}</dd></div>}
                            <div><dt className="inline font-semibold">Pago: </dt>
                              <dd className="inline">{etiquetaPago(ped)}</dd>
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
                          {ped.costo_envio > 0 && <p className="mb-1 text-right text-sm">Envío {formatoCLP.format(ped.costo_envio)}</p>}
                          <p className="mb-3 text-right font-semibold">Total {formatoCLP.format(ped.total)}</p>
                          {!enPapelera && sinRevisar && (
                            <button disabled={!!ocupado} onClick={() => marcarRevisado(ped.id)}
                              className="mb-3 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border border-verde/40 bg-sage/15 px-3 text-sm font-semibold text-verde-noche hover:bg-sage/30 disabled:opacity-50">
                              <AdminIcon name="visible" /> Marcar como revisado
                            </button>
                          )}
                          {!enPapelera && ped.estado === 'pendiente' && (!ped.metodo_pago || ped.metodo_pago === 'transferencia') && (
                            <div className="flex gap-2">
                              <button disabled={!!ocupado} onClick={() => procesarPedido(ped.id, 'confirmar')}
                                className="min-h-10 flex-1 rounded-lg bg-verde-oscuro px-2 text-sm font-semibold text-white disabled:opacity-50"><span className="inline-flex items-center gap-1"><AdminIcon name="check" /> {ped.metodo_pago === 'transferencia' ? 'Confirmar transferencia recibida' : 'Confirmar'}</span></button>
                              <button disabled={!!ocupado} onClick={() => procesarPedido(ped.id, 'cancelar')}
                                className="min-h-10 flex-1 rounded-lg border border-red-200 px-2 text-sm font-semibold text-red-700 disabled:opacity-50"><span className="inline-flex items-center gap-1"><AdminIcon name="cerrar" /> Cancelar</span></button>
                            </div>
                          )}
                          {!enPapelera && ped.estado === 'confirmado' && ped.pago_estado !== 'revision' && !ped.despachado_at && (
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
                          {enPapelera ? (
                            <button type="button" disabled={!!ocupado} onClick={() => restaurarPedidoEliminado(ped.id)}
                              className="mt-3 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg bg-verde-oscuro px-3 text-sm font-semibold text-white hover:bg-verde-noche disabled:opacity-50 sm:w-auto">
                              <AdminIcon name="restaurar" /> Restaurar pedido
                            </button>
                          ) : (
                            <HoldToConfirm disabled={!!ocupado} onConfirm={() => { void borrarPedido(ped); }}
                              label="Mover a papelera" confirmedLabel="Moviendo…" duration={1500}
                              aria-label={`Mantén presionado para mover el pedido ${ped.codigo_publico} a la papelera`}
                              className="mt-3 w-full sm:w-auto" />
                          )}
                        </article>
                        );
                      })}
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
          {vista === 'diseno' && !cargando && (
            <DisenoEditor inicial={diseno} onGuardado={(linea, actualizado) =>
              setDiseno((prev) => ({ ...prev, [linea]: actualizado }))} />
          )}

          {vista === 'categorias' && !cargando && (
            <div className="max-w-md">
              <CategoryOrderEditor categorias={GRUPOS_PUBLICOS} ordenInicial={categoryOrder} onGuardado={setCategoryOrder} />
            </div>
          )}

          {/* Destacados */}
          {vista === 'destacados' && !cargando && !errorCatalogo && (
            <div className="max-w-xl space-y-3">
              <label className="grid max-w-xs gap-1 text-sm font-semibold">Sección de la tienda
                <select value={lineaDestacados} onChange={(event) => setLineaDestacados(event.target.value as Linea)}
                  className="min-h-11 rounded-lg border border-verde-noche/15 bg-white px-3">
                  {Object.entries(LINEAS).map(([linea, seccion]) => <option key={linea} value={linea}>{seccion.nombre}</option>)}
                </select>
              </label>
              <FeaturedEditor key={lineaDestacados} linea={lineaDestacados} productos={publicables}
                featureConfigInicial={{ productIds: destacados.productos.map((producto) => producto.id), title: destacados.title }}
                onGuardado={(config) => guardarDestacados(lineaDestacados, config)} />
            </div>
          )}
        </main>
      </div>

      {(creandoNuevo || editando) && (
        <ProductForm
          producto={editando}
          onCancelar={() => { setCreandoNuevo(false); setEditando(null); }}
          onGuardado={() => { setCreandoNuevo(false); setEditando(null); recargarCatalogo(); }}
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
