import { tienda } from '@/lib/config';

export default function MapSection() {
  // Embebimos Google Maps para permitir "cómo llegar" en lugar de una imagen estática.
  const mapsEmbed = `https://maps.google.com/maps?q=${encodeURIComponent(tienda.storeAddress)}&z=16&output=embed`;

  return (
    <section id="ubicacion" className="px-6 md:px-14 pb-20 text-center">
      <h3 className="font-display text-2xl text-verde-oscuro mb-6">Visítanos</h3>
      <div className="max-w-2xl mx-auto rounded-lg overflow-hidden shadow-[0_4px_20px_rgba(52,78,65,0.15)]">
        <iframe
          title="Ubicación de la tienda en Google Maps"
          src={mapsEmbed}
          width="100%"
          height="360"
          loading="lazy"
          style={{ border: 0 }}
          referrerPolicy="no-referrer-when-downgrade"
          allowFullScreen
        />
      </div>
      <a
        href={tienda.mapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block mt-4 text-sm text-verde hover:text-verde-oscuro hover:underline"
      >
        📍 {tienda.storeAddress} — Abrir en Google Maps
      </a>
    </section>
  );
}