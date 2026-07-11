export default function Hero() {
  return (
    <section className="bg-sage text-white text-center px-6 md:px-14 py-20 md:py-24 relative overflow-hidden">
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div className="absolute -top-10 -left-10 w-60 h-60 rounded-full bg-sage blur-3xl" />
        <div className="absolute -bottom-16 -right-10 w-72 h-72 rounded-full bg-verde-oscuro blur-3xl" />
      </div>
      <div className="relative">
        <div className="text-xs md:text-sm tracking-[0.2em] uppercase text-white/90 mb-4">
          Tienda en Panguipulli
        </div>
        <h1 className="font-display text-4xl md:text-6xl leading-tight max-w-4xl mx-auto text-white">
          Detalles especiales para Ti y para tu Hogar
        </h1>
        <p className="max-w-lg mx-auto mt-6 text-sm md:text-base text-white leading-relaxed">
          Un catálogo armado para recorrer con calma. Agrega tus artículos al carrito, selecciona el
          canal de comunicación y coordinamos tu pedido.
        </p>
        <a
          href="/catalogo"
          className="inline-block mt-8 px-6 py-3 rounded-md bg-white text-verde-oscuro text-sm font-semibold uppercase tracking-wide hover:bg-crema transition-colors"
        >
          Ver catálogo
        </a>
      </div>
    </section>
  );
}