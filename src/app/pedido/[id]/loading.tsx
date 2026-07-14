export default function Loading() {
  return (
    <div className="min-h-screen bg-crema flex items-center justify-center">
      <div className="text-center">
        <div className="w-10 h-10 border-3 border-verde-noche/20 border-t-verde rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-verde-noche/60">Cargando pedido…</p>
      </div>
    </div>
  );
}