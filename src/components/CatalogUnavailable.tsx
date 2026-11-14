import { tienda } from '@/lib/config';

export default function CatalogUnavailable() {
  return (
    <div role="status" className="max-w-2xl mx-auto my-10 rounded-2xl border border-verde/20 bg-white p-6 md:p-8 text-center shadow-sm">
      <h2 className="font-display text-2xl text-verde-oscuro">Estamos actualizando el catálogo</h2>
      <p className="mt-3 text-sm leading-relaxed text-verde-noche/80">
        No pudimos cargar los productos en este momento. Puedes consultar disponibilidad y hacer tu pedido directamente con la tienda.
      </p>
      <a href={tienda.whatsappCatalogUrl} target="_blank" rel="noopener noreferrer" className="inline-flex mt-5 px-5 py-3 rounded-md bg-verde-oscuro text-white text-sm font-semibold hover:bg-verde-noche">
        Consultar catálogo por WhatsApp
      </a>
    </div>
  );
}
