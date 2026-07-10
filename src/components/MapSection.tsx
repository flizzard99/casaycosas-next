import Image from 'next/image';

export default function MapSection() {
  return (
    <section id="ubicacion" className="px-6 md:px-14 pb-20 text-center">
      <h3 className="font-display text-2xl text-verde-oscuro mb-6">Visítanos</h3>
      <a
        href={process.env.NEXT_PUBLIC_MAPS_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="relative block max-w-2xl mx-auto rounded-lg overflow-hidden shadow-[0_4px_20px_rgba(52,78,65,0.15)]"
      >
        <Image
          src="/direccion.png"
          alt="Ubicación de la tienda en Google Maps"
          width={1080}
          height={1080}
          className="w-full h-auto"
        />
        <span className="absolute bottom-3.5 left-3.5 bg-white px-3.5 py-2 rounded text-xs font-semibold text-verde-noche shadow">
          📍 {process.env.NEXT_PUBLIC_STORE_ADDRESS}
        </span>
      </a>
    </section>
  );
}
