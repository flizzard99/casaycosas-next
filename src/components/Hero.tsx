import Link from 'next/link';

export default function Hero() {
  return (
    <section className="store-hero relative isolate overflow-hidden bg-verde-noche px-5 text-white">
      <div className="store-shell relative py-16 sm:py-24 lg:py-28">
        <div className="max-w-xl">
          <p className="mb-4 text-sm font-semibold text-crema">Panguipulli, Región de Los Ríos</p>
          <h1 className="balance-text font-display text-4xl leading-tight sm:text-5xl lg:text-6xl">
            Detalles especiales para tu hogar
          </h1>
          <p className="mt-5 max-w-md text-base leading-relaxed text-white/90">
            Hogar, mate, artesanías y perfumes. Elige tus favoritos y retira tu pedido en tienda.
          </p>
          <Link
            href="/catalogo"
            className="mt-7 inline-flex min-h-12 items-center rounded-lg bg-crema px-6 font-semibold text-verde-noche hover:bg-white"
          >
            Explorar catálogo <span aria-hidden="true" className="ml-3">→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
