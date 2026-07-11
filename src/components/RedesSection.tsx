import { tienda } from '@/lib/config';

export default function RedesSection() {
  const redes = [
    { nombre: 'Instagram', url: tienda.instagramUrl, color: '#E1306C' },
    { nombre: 'WhatsApp', url: tienda.whatsappUrl, color: '#25D366' },
    { nombre: 'Facebook', url: tienda.facebookUrl, color: '#1877F2' },
    { nombre: 'TikTok', url: tienda.tiktokUrl, color: '#111111' }
  ];

  return (
    <section id="contacto" className="px-6 md:px-14 pb-20 text-center">
      <h3 className="font-display text-2xl text-verde-oscuro mb-6">Nuestras Redes</h3>
      <div className="flex flex-wrap justify-center gap-3">
        {redes.map((r) => (
          <a
            key={r.nombre}
            href={r.url}
            target="_blank"
            rel="noopener noreferrer"
            className="px-5 py-2.5 rounded text-sm font-semibold text-white hover:opacity-90 transition-opacity"
            style={{ backgroundColor: r.color }}
          >
            {r.nombre}
          </a>
        ))}
      </div>
      <div className="mt-8">
        <a
          href={tienda.whatsappCatalogUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block px-6 py-3 rounded-md bg-verde-noche text-white text-sm font-semibold hover:bg-verde-oscuro transition-colors"
        >
          Ver catálogo completo en WhatsApp
        </a>
      </div>
    </section>
  );
}