import Link from 'next/link';
import { tienda } from '@/lib/config';

export default function Footer({ categorias = [] }: { categorias?: string[] }) {
  return (
    <footer className="bg-verde-noche text-crema">
      <div className="px-6 md:px-14 py-10">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
          <div>
            <h3 className="font-display text-base text-white mb-3">Casa y Cosas</h3>
            <p className="text-sm text-[#B9C4B4] leading-relaxed">
              Artículos del hogar, artesanías y perfumes en Panguipulli.
            </p>
            <div className="flex gap-3 mt-4">
              {tienda.instagramUrl && (
                <a
                  href={tienda.instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram"
                  className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center text-white/70 hover:text-white hover:border-white/50 transition-colors"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4 h-4">
                    <rect x="2" y="2" width="20" height="20" rx="5" />
                    <circle cx="12" cy="12" r="5" />
                    <circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" stroke="none" />
                  </svg>
                </a>
              )}
              {tienda.whatsappNumber && (
                <a
                  href={`https://wa.me/${tienda.whatsappNumber}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="WhatsApp"
                  className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center text-white/70 hover:text-white hover:border-white/50 transition-colors"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                </a>
              )}
            </div>
          </div>

          {categorias.length > 0 && (
            <div>
              <h3 className="font-display text-base text-white mb-3">Categorías</h3>
              <ul className="space-y-1.5">
                {categorias.map((cat) => (
                  <li key={cat}>
                    <Link href={`/catalogo/${encodeURIComponent(cat)}`} className="text-sm text-[#B9C4B4] hover:text-white transition-colors capitalize">
                      {cat}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <h3 className="font-display text-base text-white mb-3">Enlaces</h3>
            <ul className="space-y-1.5">
              <li>
                <Link href="/catalogo" className="text-sm text-[#B9C4B4] hover:text-white transition-colors">
                  Catálogo completo
                </Link>
              </li>
              <li>
                <Link href="/#contacto" className="text-sm text-[#B9C4B4] hover:text-white transition-colors">
                  Visítanos
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10 px-6 md:px-14 py-4 text-center">
        <div className="flex flex-col md:flex-row items-center justify-between gap-2 max-w-5xl mx-auto">
          <div className="font-display text-sm text-white">
            TIENDA CASA Y COSAS, PANGUIPULLI
            <Link href="/admin" aria-label="Acceso administrador" className="text-[10px] align-super opacity-20 hover:opacity-100 transition-opacity no-underline">
              ®
            </Link>
          </div>
          <div className="text-xs text-[#B9C4B4]">
            © {new Date().getFullYear()} Casa y Cosas · Panguipulli, Chile
          </div>
        </div>
      </div>
    </footer>
  );
}
