'use client';

import { useEffect, useMemo, useState } from 'react';
import ProductForm from './ProductForm';
import CategoryOrderEditor from './CategoryOrderEditor';
import FeaturedEditor from './FeaturedEditor';
import type { Producto, FeaturedConfig } from '@/lib/types';
import { adminFetch } from '@/lib/adminFetch';

const formatoCLP = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });

const FEATURED_DEFAULT: FeaturedConfig = { productIds: [], title: 'Productos más vendidos' };

export default function AdminDashboard({ onLogout }: { onLogout: () => void }) {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [categoryOrder, setCategoryOrder] = useState<string[]>([]);
  const [featured, setFeatured] = useState<FeaturedConfig>(FEATURED_DEFAULT);
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(true);
  const [editando, setEditando] = useState<Producto | null>(null);
  const [creandoNuevo, setCreandoNuevo] = useState(false);

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
      // sin datos disponibles, seguimos con listas vacías
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargarTodo();
  }, []);

  const categorias = useMemo(() => [...new Set(productos.map((p) => p.category))].sort(), [productos]);

  const filtrados = useMemo(() => {
    const term = busqueda.trim().toLowerCase();
    if (!term) return productos;
    return productos.filter((p) => p.name.toLowerCase().includes(term) || p.category.toLowerCase().includes(term));
  }, [productos, busqueda]);

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

  async function handleLogout() {
    await adminFetch('/api/auth/logout', { method: 'POST' });
    onLogout();
  }

  return (
    <div className="min-h-screen bg-crema">
      <header className="bg-verde-noche px-6 md:px-10 py-5 flex items-center justify-between">
        <div>
          <h1 className="font-display text-white text-lg">Panel de administración</h1>
          <p className="text-xs text-white/60">Casa y Cosas — Panguipulli</p>
        </div>
        <button onClick={handleLogout} className="text-white text-sm border border-white/30 rounded px-3 py-1.5 hover:bg-white/10">
          Cerrar sesión
        </button>
      </header>

      <main className="px-6 md:px-10 py-8 grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-8">
        <div>
          <div className="flex flex-col md:flex-row gap-3 md:items-center justify-between mb-5">
            <input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por nombre o categoría..."
              className="w-full md:w-72 px-3 py-2 rounded border border-verde-noche/20 text-sm bg-white"
            />
            <button
              onClick={() => setCreandoNuevo(true)}
              className="bg-verde text-white text-sm font-semibold px-4 py-2 rounded-md hover:bg-verde-oscuro whitespace-nowrap"
            >
              + Nuevo producto
            </button>
          </div>

          {cargando ? (
            <p className="text-sm text-verde-noche/60">Cargando productos…</p>
          ) : (
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-crema/70 text-verde-noche/70 text-xs uppercase">
                  <tr>
                    <th className="text-left px-4 py-3">Imagen</th>
                    <th className="text-left px-4 py-3">Producto</th>
                    <th className="text-left px-4 py-3">Categoría</th>
                    <th className="text-left px-4 py-3">Precio</th>
                    <th className="text-left px-4 py-3">Stock</th>
                    <th className="text-left px-4 py-3">Visible</th>
                    <th className="text-left px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtrados.map((p) => (
                    <tr key={p.id} className="border-t border-verde-noche/10">
                      <td className="px-4 py-3">
                        <div className="w-10 h-10 rounded bg-crema overflow-hidden flex-shrink-0">
                          {(p.image_url || (p.images && p.images[0])) ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={p.image_url || p.images[0]}
                              alt={p.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[10px] text-verde-noche/30">
                              s/i
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-medium text-verde-noche max-w-[200px] truncate">{p.name}</td>
                      <td className="px-4 py-3 capitalize text-verde-noche/80">{p.category}</td>
                      <td className="px-4 py-3 text-verde-noche/80">{formatoCLP.format(p.price)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => ajustarStock(p.id, -1)}
                            className="w-6 h-6 rounded border border-verde-noche/20 text-xs"
                          >
                            −
                          </button>
                          <span className="w-6 text-center">{p.stock}</span>
                          <button
                            onClick={() => ajustarStock(p.id, 1)}
                            className="w-6 h-6 rounded border border-verde-noche/20 text-xs"
                          >
                            +
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => toggleVisibilidad(p.id, p.visible)}
                          className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                            p.visible ? 'bg-verde/15 text-verde-oscuro' : 'bg-gray-200 text-gray-500'
                          }`}
                        >
                          {p.visible ? 'Visible' : 'Oculto'}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => setEditando(p)}
                            className="text-xs font-semibold text-verde-oscuro hover:underline"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => eliminarProducto(p.id)}
                            className="text-xs font-semibold text-red-500 hover:underline"
                          >
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          {categorias.length > 0 && (
            <CategoryOrderEditor categorias={categorias} ordenInicial={categoryOrder} onGuardado={setCategoryOrder} />
          )}
          {!cargando && productos.length > 0 && (
            <FeaturedEditor productos={productos} featureConfigInicial={featured} onGuardado={setFeatured} />
          )}
        </div>
      </main>

      {(creandoNuevo || editando) && (
        <ProductForm
          producto={editando}
          categorias={categorias.length ? categorias : ['general']}
          onCancelar={() => {
            setCreandoNuevo(false);
            setEditando(null);
          }}
          onGuardado={() => {
            setCreandoNuevo(false);
            setEditando(null);
            cargarTodo();
          }}
        />
      )}
    </div>
  );
}
