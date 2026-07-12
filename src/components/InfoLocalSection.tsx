import Image from 'next/image';
import { tienda } from '@/lib/config';

const ICONS: Record<string, string> = {
  Instagram:
    '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2c2.717 0 3.056.01 4.122.06 1.065.05 1.79.217 2.428.465.66.254 1.216.598 1.772 1.153.509.5.902 1.105 1.153 1.772.247.637.415 1.363.465 2.428.047 1.066.06 1.405.06 4.122 0 2.717-.01 3.056-.06 4.122-.05 1.065-.218 1.79-.465 2.428a4.883 4.883 0 0 1-1.153 1.772c-.5.508-1.105.902-1.772 1.153-.637.247-1.363.415-2.428.465-1.066.047-1.405.06-4.122.06-2.717 0-3.056-.01-4.122-.06-1.065-.05-1.79-.218-2.428-.465a4.89 4.89 0 0 1-1.772-1.153 4.904 4.904 0 0 1-1.153-1.772c-.248-.637-.415-1.363-.465-2.428C2.013 15.056 2 14.717 2 12c0-2.717.01-3.056.06-4.122.05-1.066.217-1.79.465-2.428a4.88 4.88 0 0 1 1.153-1.772A4.897 4.897 0 0 1 5.45 2.525c.638-.248 1.362-.415 2.428-.465C8.944 2.013 9.283 2 12 2zm0 1.802c-2.67 0-2.987.01-4.04.058-.976.045-1.505.207-1.858.344-.466.181-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.048 1.054-.058 1.37-.058 4.041 0 2.67.01 2.987.058 4.04.045.976.207 1.505.344 1.858.181.466.398.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058 2.67 0 2.987-.01 4.04-.058.976-.045 1.505-.207 1.858-.344.466-.181.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.054.058-1.37.058-4.041 0-2.67-.01-2.987-.058-4.04-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 0 0-.748-1.15 3.098 3.098 0 0 0-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.054-.048-1.37-.058-4.041-.058zm0 3.064a5.135 5.135 0 1 1 0 10.27 5.135 5.135 0 0 1 0-10.27zm0 1.802a3.333 3.333 0 1 0 0 6.666 3.333 3.333 0 0 0 0-6.666zm6.538-1.985a1.2 1.2 0 1 1-2.4 0 1.2 1.2 0 0 1 2.4 0z"/></svg>',
  WhatsApp:
    '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>',
  Facebook:
    '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>',
  TikTok:
    '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>'
};

export default function InfoLocalSection() {
  const redes = [
    { nombre: 'Instagram', url: tienda.instagramUrl, color: '#E1306C' },
    { nombre: 'WhatsApp', url: tienda.whatsappUrl, color: '#25D366' },
    { nombre: 'Facebook', url: tienda.facebookUrl, color: '#1877F2' },
    { nombre: 'TikTok', url: tienda.tiktokUrl, color: '#111111' }
  ];

  return (
    <section id="contacto" className="pb-20 pt-6">
      <div className="px-6 md:px-14">
        <div className="flex flex-wrap gap-10 justify-center items-center max-w-4xl mx-auto">
          {/* Mapa a la izquierda */}
          <a
            href={tienda.mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="relative block flex-1 min-w-[240px] max-w-[360px] rounded-2xl overflow-hidden shadow-[0_4px_20px_rgba(52,78,65,0.15)] transition-transform duration-300 hover:scale-[1.05] cursor-zoom-in"
          >
            <Image
              src="/direccion.png"
              alt="Ubicación de la tienda"
              width={360}
              height={360}
              className="w-full h-auto block"
            />
            <span className="absolute bottom-3.5 left-3.5 bg-white px-3.5 py-2 rounded text-xs font-semibold text-verde-noche shadow">
              📍 {tienda.storeAddress}
            </span>
          </a>

          {/* Datos + Redes a la derecha */}
          <div className="flex-1 min-w-[280px] text-center">
            <h3 className="font-display text-2xl text-verde-oscuro mb-2">Visítanos</h3>
            <p className="text-verde-noche/70 mb-6 text-sm">{tienda.storeAddress}</p>
            <div className="flex gap-2.5 flex-wrap justify-center mb-6">
              {redes.map((r) => (
                <a
                  key={r.nombre}
                  href={r.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-white px-5 py-3 rounded-full text-sm font-semibold transition-transform hover:-translate-y-0.5 hover:opacity-90"
                  style={{ backgroundColor: r.color }}
                >
                  <span
                    className="w-[18px] h-[18px] inline-block"
                    dangerouslySetInnerHTML={{ __html: ICONS[r.nombre] }}
                  />
                  {r.nombre}
                </a>
              ))}
            </div>
            <a
              href={tienda.whatsappCatalogUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-6 py-3 rounded-md bg-verde-noche text-white text-sm font-semibold hover:bg-verde-oscuro transition-colors"
            >
              Ver catálogo completo en WhatsApp
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
